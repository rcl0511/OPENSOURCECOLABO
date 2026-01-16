# main.py
import os
import io
import re
import uuid
import time
import logging
from typing import Optional, List, Dict, Any, Tuple

import torch
import torch.nn as nn
import torchvision.transforms as transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

from routes_auth import router as auth_router
from routes_medical import router as medical_router

from PIL import Image
from gtts import gTTS

import pandas as pd
from sentence_transformers import SentenceTransformer, util

from fastapi import FastAPI, UploadFile, File, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# =========================================================
# 0) 기본 설정 / 로깅
# =========================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("sosai-backend")

app = FastAPI(title="SOSAI Backend", version="1.0.0")

# =========================================================
# 1) 환경변수 (배포 친화)
# =========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# CORS: 운영에서는 도메인으로 제한 권장
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "https://sosaii.netlify.app").split(",")

# 정적 파일 (mp3 저장)
STATIC_DIR = os.getenv("STATIC_DIR", os.path.join(BASE_DIR, "static"))
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 모델/데이터 경로
CLS_MODEL_PATH = os.getenv("CLS_MODEL_PATH", os.path.join(BASE_DIR, "best_model.pt"))
QA_EMBED_PKL = os.getenv("QA_EMBED_PKL", os.path.join(BASE_DIR, "화상_질문_with_embedding.pkl"))
QA_ANSWER_CSV = os.getenv("QA_ANSWER_CSV", os.path.join(BASE_DIR, "화상_답변.csv"))

# 분류 클래스
CLASS_NAMES = os.getenv("CLASS_NAMES", "1도,2도,3도").split(",")

# 모델 디바이스
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# QnA 결과 TopK 기본값
DEFAULT_QNA_TOPK = int(os.getenv("QNA_TOPK", "3"))
# 유사도 기준(너무 낮은 것 걸러내고 싶으면 사용)
MIN_SIM = float(os.getenv("QNA_MIN_SIM", "0.0"))

# =========================================================
# 2) 미들웨어
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOW_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 포함
app.include_router(auth_router)
app.include_router(medical_router)

# =========================================================
# 3) 전처리 / 유틸
# =========================================================
img_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)

def _safe_filename(ext: str) -> str:
    return f"{uuid.uuid4().hex}.{ext.lstrip('.')}"

def _normalize_text(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s

def _tts_to_static_mp3(text: str, lang: str = "ko") -> Optional[str]:
    """
    text -> mp3 저장 -> /static/xxx.mp3 반환
    실패하면 None
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

# =========================================================
# 4) Lazy Load (서버 부팅/재시작 안정화)
# =========================================================
_cls_model: Optional[nn.Module] = None

_sbert: Optional[SentenceTransformer] = None
_q_embed: Optional[torch.Tensor] = None
_answers_df: Optional[pd.DataFrame] = None

def get_cls_model() -> nn.Module:
    global _cls_model
    if _cls_model is not None:
        return _cls_model

    if not os.path.exists(CLS_MODEL_PATH):
        raise FileNotFoundError(f"Classification model not found: {CLS_MODEL_PATH}")

    log.info(f"[CLS] Loading EfficientNet-B0 on {DEVICE} ...")
    model = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)

    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(CLASS_NAMES))

    ckpt = torch.load(CLS_MODEL_PATH, map_location=DEVICE)

    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        state = ckpt["state_dict"]
    else:
        state = ckpt

    cleaned = {}
    for k, v in state.items():
        nk = k.replace("module.", "")
        cleaned[nk] = v

    model.load_state_dict(cleaned, strict=False)
    model.to(DEVICE)
    model.eval()

    _cls_model = model
    log.info("[CLS] Model loaded.")
    return _cls_model

def get_qna_assets() -> Tuple[SentenceTransformer, torch.Tensor, pd.DataFrame]:
    global _sbert, _q_embed, _answers_df

    if _sbert is None:
        log.info("[QNA] Loading SentenceTransformer ...")
        _sbert = SentenceTransformer("jhgan/ko-sroberta-multitask", device=DEVICE)

    if _answers_df is None:
        if not os.path.exists(QA_ANSWER_CSV):
            raise FileNotFoundError(f"Answer CSV not found: {QA_ANSWER_CSV}")
        _answers_df = pd.read_csv(QA_ANSWER_CSV, encoding="utf-8")

    if _q_embed is None:
        if not os.path.exists(QA_EMBED_PKL):
            raise FileNotFoundError(f"Embedding PKL not found: {QA_EMBED_PKL}")
        _q_embed = torch.load(QA_EMBED_PKL, map_location=DEVICE)
        if isinstance(_q_embed, list):
            _q_embed = torch.tensor(_q_embed, device=DEVICE)
        if isinstance(_q_embed, torch.Tensor) and _q_embed.device.type != ("cuda" if DEVICE == "cuda" else "cpu"):
            _q_embed = _q_embed.to(DEVICE)

    return _sbert, _q_embed, _answers_df

def _get_question_col(df: pd.DataFrame) -> Optional[str]:
    for c in ["question", "질문", "Q", "Question", "문항", "query"]:
        if c in df.columns:
            return c
    return None

def _get_answer_col(df: pd.DataFrame) -> Optional[str]:
    for c in ["answer", "답변", "A", "Answer", "응답", "response"]:
        if c in df.columns:
            return c
    return None

def qna_search(question: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    question -> 유사도 top_k 결과:
    [
      { "question": "...", "answer": "...", "similarity": 0.87, "index": 12 }
    ]
    """
    question = _normalize_text(question)
    if not question:
        return []

    sbert, q_embed, df = get_qna_assets()

    q_vec = sbert.encode(question, convert_to_tensor=True, device=DEVICE)
    sims = util.cos_sim(q_vec, q_embed)[0]  # (N,)

    k = max(1, min(int(top_k), sims.numel()))
    top_scores, top_indices = torch.topk(sims, k=k)

    q_col = _get_question_col(df)
    a_col = _get_answer_col(df)

    results: List[Dict[str, Any]] = []
    for score, idx in zip(top_scores.tolist(), top_indices.tolist()):
        if float(score) < MIN_SIM:
            continue

        row = df.iloc[int(idx)] if int(idx) < len(df) else None
        if row is None:
            continue

        q_text = str(row[q_col]) if q_col else ""
        a_text = str(row[a_col]) if a_col else str(row.iloc[0])

        results.append(
            {
                "index": int(idx),
                "similarity": float(score),
                "question": q_text,
                "answer": a_text,
            }
        )

    return results

# =========================================================
# 5) 라우트
# =========================================================
@app.get("/")
def root():
    return {"ok": True, "service": "SOSAI Backend", "device": DEVICE}

@app.get("/health")
def health():
    return {
        "ok": True,
        "device": DEVICE,
        "cls_model_exists": os.path.exists(CLS_MODEL_PATH),
        "qna_embed_exists": os.path.exists(QA_EMBED_PKL),
        "qna_answer_exists": os.path.exists(QA_ANSWER_CSV),
        "static_dir": STATIC_DIR,
        "allow_origins": ALLOW_ORIGINS,
    }

@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)):
    """
    프론트(VoicePage.jsx)가 기대하는 형태로 반환:
    {
      prediction: 0/1/2,
      text: "...",
      top_similar_questions: [...],
      audio_url: "/static/xxx.mp3" (optional)
    }
    """
    t0 = time.time()
    try:
        model = get_cls_model()

        raw = await file.read()
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        x = img_transform(img).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = model(x)
            probs = torch.softmax(logits, dim=1)[0]

        pred_idx = int(torch.argmax(probs).item())

        # 🔥 여기에서 “이미지 예측 후 보여줄 텍스트”를 간단히 구성
        label = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)
        text = f"예측 결과: {label} (index={pred_idx})"

        # (선택) TTS 만들고 싶으면 활성화
        audio_url = None
        # audio_url = _tts_to_static_mp3(text)

        return {
            "prediction": pred_idx,
            "text": text,
            "top_similar_questions": [],
            "audio_url": audio_url,
            "elapsed_ms": int((time.time() - t0) * 1000),
        }

    except FileNotFoundError as e:
        return JSONResponse(status_code=503, content={"ok": False, "error": str(e)})
    except Exception as e:
        log.exception("predict_image failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

@app.post("/answer")
async def answer(req: Request):
    """
    요청 예시(JSON):
    {
      "question": "물집이 생겼어요. 어떻게 해야하나요?",
      "top_k": 1
    }
    """
    t0 = time.time()
    try:
        body = await req.json()
        question = _normalize_text(body.get("question", ""))
        top_k = int(body.get("top_k", 1))

        if not question:
            return JSONResponse(status_code=400, content={"ok": False, "error": "question is required"})

        results = qna_search(question, top_k=top_k)

        return {
            "ok": True,
            "question": question,
            "results": results,
            "best_answer": results[0]["answer"] if results else "",
            "elapsed_ms": int((time.time() - t0) * 1000),
        }

    except FileNotFoundError as e:
        return JSONResponse(status_code=503, content={"ok": False, "error": str(e)})
    except Exception as e:
        log.exception("answer failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

@app.post("/dialog")
async def dialog(body: Dict[str, Any] = Body(...)):
    """
    ✅ 프론트(VoicePage.jsx) 호환 엔드포인트
    프론트 요청: { "keyword": "..." }
    프론트 기대 응답:
      - answer (또는 text)
      - top_similar_questions: [{question, similarity}, ...]
      - audio_url(optional)

    현재 프론트는 /dialog로 POST 보내고 body에 keyword를 넣고 있음.
    """
    t0 = time.time()
    try:
        keyword = _normalize_text(body.get("keyword", ""))
        top_k = int(body.get("top_k", DEFAULT_QNA_TOPK))

        if not keyword:
            return JSONResponse(status_code=400, content={"ok": False, "error": "keyword is required"})

        results = qna_search(keyword, top_k=top_k)

        best_answer = results[0]["answer"] if results else "관련 답변을 찾지 못했습니다."
        top_similar_questions = [
            {"question": r.get("question", ""), "similarity": float(r.get("similarity", 0.0))}
            for r in results
        ]

        # (선택) 답변을 음성으로 주고 싶으면 켜기
        audio_url = None
        # audio_url = _tts_to_static_mp3(best_answer)

        return {
            "answer": best_answer,
            "top_similar_questions": top_similar_questions,
            "audio_url": audio_url,
            "elapsed_ms": int((time.time() - t0) * 1000),
        }

    except FileNotFoundError as e:
        return JSONResponse(status_code=503, content={"ok": False, "error": str(e)})
    except Exception as e:
        log.exception("dialog failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

@app.post("/tts")
async def tts(req: Request):
    """
    요청 예시(JSON):
    {
      "text": "안녕하세요. 응급 처치 안내를 시작합니다.",
      "lang": "ko"
    }
    응답:
    {
      "ok": true,
      "url": "/static/xxxx.mp3"
    }
    """
    try:
        body = await req.json()
        text = _normalize_text(body.get("text", ""))
        lang = (body.get("lang") or "ko").strip()

        if not text:
            return JSONResponse(status_code=400, content={"ok": False, "error": "text is required"})

        fname = _safe_filename("mp3")
        out_path = os.path.join(STATIC_DIR, fname)

        tts_obj = gTTS(text=text, lang=lang)
        tts_obj.save(out_path)

        return {"ok": True, "url": f"/static/{fname}"}

    except Exception as e:
        log.exception("tts failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

# =========================================================
# 6) 로컬 실행용 (EC2에서는 보통 uvicorn으로 실행)
# =========================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
