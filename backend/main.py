# main.py  (SOSAI - LLM 중심 / SBERT·화상 전부 제거 버전)
import os
import re
import time
import uuid
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from gtts import gTTS
from openai import OpenAI
from jose import jwt, JWTError

from routes_auth import router as auth_router
from routes_medical import router as medical_router
from database_mongo import medical_col
from routes_medical import ensure_medical_indexes

# =================== 기본 설정 / 로깅 ===================
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("sosai-backend")

app = FastAPI(title="SOSAI Backend", version="2.0.0-llm")

# =================== 환경변수 ===================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

ALLOW_ORIGINS = [
    "https://sosaii.netlify.app",
    "https://api.rcl0511.xyz",
    "https://rcl0511.xyz",
    "http://localhost:3000",
]

STATIC_DIR = os.getenv("STATIC_DIR", os.path.join(BASE_DIR, "static"))
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")  # prompt id 안 쓸 때 fallback
OPENAI_PROMPT_ID = os.getenv("OPENAI_PROMPT_ID")          # pmpt_...
OPENAI_PROMPT_VERSION = os.getenv("OPENAI_PROMPT_VERSION", "1")

# JWT (토큰이 있으면 medical profile 개인화, 없어도 /dialog는 동작)
JWT_SECRET = os.getenv("JWT_SECRET")  # security.py에서 쓰는 값과 동일해야 함
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# TTS (원하면 켜기)
ENABLE_TTS = os.getenv("ENABLE_TTS", "0").strip() == "1"
TTS_LANG = os.getenv("TTS_LANG", "ko")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=OPENAI_API_KEY)

# =================== 미들웨어/라우터 ===================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOW_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(medical_router)

# =================== 유틸 ===================
def _normalize_text(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s

def _safe_filename(ext: str) -> str:
    return f"{uuid.uuid4().hex}.{ext.lstrip('.')}"

def _tts_to_static_mp3(text: str, lang: str = "ko") -> Optional[str]:
    """
    text -> mp3 저장 -> /static/xxx.mp3 반환
    """
    try:
        text = _normalize_text(text)
        if not text:
            return None
        fname = _safe_filename("mp3")
        out_path = os.path.join(STATIC_DIR, fname)
        gTTS(text=text, lang=lang).save(out_path)
        return f"/static/{fname}"
    except Exception:
        log.exception("TTS generation failed")
        return None

def _extract_bearer_token(req: Request) -> Optional[str]:
    auth = req.headers.get("authorization") or req.headers.get("Authorization")
    if not auth:
        return None
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None

def _decode_user_id_from_token(token: str) -> Optional[str]:
    """
    토큰이 있으면 user_id(sub)만 꺼내서 개인화에 사용.
    - JWT_SECRET이 설정되어 있고, 토큰 서명검증 성공 시에만 반환
    - 없거나 실패하면 None
    """
    if not token:
        return None
    if not JWT_SECRET:
        # 서비스가 토큰 검증을 못하는 상태면 안전하게 개인화 비활성
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except JWTError:
        return None
    except Exception:
        return None

def _format_medical_profile(doc: Optional[Dict[str, Any]]) -> str:
    if not doc:
        return "의료 프로필 없음(미작성 또는 로그인 안 함)."

    # DB 문서에서 필요한 것만 요약 (민감정보 최소화)
    fields = [
        ("name", "이름"),
        ("birth_date", "생년월일"),
        ("blood_type", "혈액형"),
        ("medical_history", "병력/기저질환"),
        ("surgery_history", "수술력"),
        ("medications", "복용약"),
        ("allergies", "알레르기"),
        ("emergency_contacts", "응급 연락처"),
    ]

    lines = []
    for key, label in fields:
        v = (doc.get(key) or "").strip() if isinstance(doc.get(key), str) else doc.get(key)
        if v:
            lines.append(f"- {label}: {v}")
    return "\n".join(lines) if lines else "의료 프로필은 있으나 주요 항목이 비어있음."

# =================== 응급 가이드 규칙 (프롬프트) ===================
SYSTEM_PROMPT = """
너는 응급상황 초기대응을 돕는 한국어 안내 AI다. (의학적 진단 확정 금지)
반드시 다음 원칙을 지켜라:

1) 생명이 위험할 수 있는 징후가 있으면(의식저하, 호흡곤란, 흉통, 마비/언어장애, 심한 출혈, 경련, 아나필락시스,
   자살/타해 위험, 영유아·고령의 급격 악화 등) → 질문보다 먼저 119/응급실을 최우선으로 안내한다.
2) 절대 진단을 확정하지 말고, 불확실성을 명확히 말한다.
3) 약물 복용/처치는 일반적 안내만. 개인 처방/용량 결정 금지.
4) 사용자 의료 프로필(알레르기/기저질환/복용약)이 있으면 주의/금기를 반영한다.
5) 위험도가 높지 않다면, 상황 파악을 위한 확인 질문 2~4개를 한다.
6) 답변은 항상 아래 형식으로 출력한다:

[위험도] (낮음/중간/높음)
[즉시 해야 할 행동] (번호 목록 3~6개)
[주의사항/하지 말 것]
[추가로 확인할 질문] (필요하면)
[면책] (짧게: 응급 시 119/응급실, 의료진 상담)
""".strip()

async def generate_emergency_answer(user_question: str, medical_doc: Optional[Dict[str, Any]]) -> str:
    user_question = _normalize_text(user_question)
    profile_text = _format_medical_profile(medical_doc)

    user_input = f"""
[사용자 질문]
{user_question}

[사용자 의료 프로필]
{profile_text}

위 정보를 바탕으로, 응급 가이드라인에 맞춰 초기대응 안내를 작성해라.
(과도한 확신 금지, 위험 시 119 우선)
""".strip()

    # 1) 저장된 Prompt(pmpt_...)를 쓰는 경우
    if OPENAI_PROMPT_ID:
        resp = client.responses.create(
            prompt={"id": OPENAI_PROMPT_ID, "version": str(OPENAI_PROMPT_VERSION)},
            input=user_input,
        )
        # 최신 SDK는 output_text 제공
        out_text = getattr(resp, "output_text", None)
        return (out_text or "").strip() if out_text else "답변 생성에 실패했습니다."

    # 2) Prompt ID 없으면 model + system/user로 호출
    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input},
        ],
    )
    out_text = getattr(resp, "output_text", None)
    return (out_text or "").strip() if out_text else "답변 생성에 실패했습니다."

# =================== 라우트 ===================
@app.get("/")
def root():
    return {"ok": True, "service": "SOSAI Backend", "mode": "LLM"}

@app.get("/health")
def health():
    return {
        "ok": True,
        "mode": "LLM",
        "openai": {
            "using_prompt_id": bool(OPENAI_PROMPT_ID),
            "prompt_id": OPENAI_PROMPT_ID or "",
            "prompt_version": str(OPENAI_PROMPT_VERSION),
            "model_fallback": OPENAI_MODEL,
        },
        "tts_enabled": ENABLE_TTS,
        "static_dir": STATIC_DIR,
        "allow_origins": ALLOW_ORIGINS,
    }

@app.post("/dialog")
async def dialog(body: Dict[str, Any] = Body(...), request: Request = None):
    """
    프론트 호환:
      요청: { "keyword": "..." }
      응답: { ok, answer, audio_url(optional), elapsed_ms }
    로그인 토큰이 있으면 개인화(의료 프로필 반영)
    토큰이 없어도 일반 응급 가이드로 답변
    """
    t0 = time.time()
    try:
        keyword = _normalize_text(body.get("keyword", ""))
        if not keyword:
            return JSONResponse(status_code=400, content={"ok": False, "error": "keyword is required"})

        # 토큰 있으면 user_id 추출 -> medical profile 로드 (없으면 None)
        token = _extract_bearer_token(request) if request else None
        user_id = _decode_user_id_from_token(token) if token else None

        medical_doc = None
        if user_id:
            medical_doc = await medical_col.find_one({"user_id": user_id})
            if medical_doc:
                medical_doc.pop("_id", None)

        answer_text = await generate_emergency_answer(keyword, medical_doc)

        audio_url = None
        if ENABLE_TTS:
            audio_url = _tts_to_static_mp3(answer_text, lang=TTS_LANG)

        return {
            "ok": True,
            "answer": answer_text,
            "audio_url": audio_url,
            "elapsed_ms": int((time.time() - t0) * 1000),
            "personalized": bool(user_id and medical_doc),
        }

    except Exception as e:
        log.exception("dialog failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
    

@app.on_event("startup")
async def _startup():
    await ensure_medical_indexes()

@app.post("/tts")
async def tts(body: Dict[str, Any] = Body(...)):
    """
    요청: { "text": "...", "lang": "ko" }
    응답: { ok: true, url: "/static/xxx.mp3" }
    """
    try:
        text = _normalize_text(body.get("text", ""))
        lang = (body.get("lang") or "ko").strip()
        if not text:
            return JSONResponse(status_code=400, content={"ok": False, "error": "text is required"})

        url = _tts_to_static_mp3(text, lang=lang)
        if not url:
            return JSONResponse(status_code=500, content={"ok": False, "error": "tts failed"})

        return {"ok": True, "url": url}

    except Exception as e:
        log.exception("tts failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

# =================== 로컬 실행용 ===================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
