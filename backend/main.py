# main.py
import os
import io
import re
import uuid
import time
import logging
from typing import Optional, List, Dict, Any

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

from fastapi import FastAPI, UploadFile, File, Request
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

# 분류 클래스 (프로젝트에 맞게 수정)
# 예: ["1도", "2도", "3도"] 등
CLASS_NAMES = os.getenv("CLASS_NAMES", "1도,2도,3도").split(",")

# 모델 디바이스
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

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


# =========================================================
# 4) Lazy Load (서버 부팅/재시작 안정화)
# =========================================================
# 분류 모델 캐시
_cls_model: Optional[nn.Module] = None

# SBERT/임베딩 캐시
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

    # 마지막 레이어를 클래스 수에 맞게 교체
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(CLASS_NAMES))

    # 체크포인트 로드
    ckpt = torch.load(CLS_MODEL_PATH, map_location=DEVICE)

    # state_dict 형태/전체모델 저장 형태 모두 대응
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        state = ckpt["state_dict"]
    else:
        state = ckpt

    # DataParallel 저장 등으로 "module." prefix 있을 수 있음
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


def get_qna_assets() -> tuple[SentenceTransformer, torch.Tensor, pd.DataFrame]:
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


# =========================================================
# 5) 라우트
# =========================================================
@app.get("/")
def root():
    return {"ok": True, "service": "SOSAI Backend", "device": DEVICE}


@app.get("/health")
def health():
    # 모델까지 강제 로드하지는 않고, 파일 존재만 최소 체크
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
    t0 = time.time()
    try:
        model = get_cls_model()

        raw = await file.read()
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        x = img_transform(img).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = model(x)
            probs = torch.softmax(logits, dim=1)[0]

        # top-k
        k = min(3, probs.numel())
        top_probs, top_idx = torch.topk(probs, k=k)

        topk = []
        for p, idx in zip(top_probs.tolist(), top_idx.tolist()):
            topk.append(
                {
                    "label": CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else str(idx),
                    "confidence": float(p),
                    "index": int(idx),
                }
            )

        best = topk[0]
        return {
            "ok": True,
            "result": best,
            "topk": topk,
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

        sbert, q_embed, answers_df = get_qna_assets()

        q_vec = sbert.encode(question, convert_to_tensor=True, device=DEVICE)
        sims = util.cos_sim(q_vec, q_embed)[0]  # (N,)

        k = max(1, min(top_k, sims.numel()))
        top_scores, top_indices = torch.topk(sims, k=k)

        results = []
        for score, idx in zip(top_scores.tolist(), top_indices.tolist()):
            row = answers_df.iloc[int(idx)] if int(idx) < len(answers_df) else None
            ans = ""
            if row is not None:
                # CSV 컬럼명이 다를 수 있어서 안전하게 처리
                if "answer" in answers_df.columns:
                    ans = str(row["answer"])
                elif "답변" in answers_df.columns:
                    ans = str(row["답변"])
                else:
                    # 첫 번째 컬럼을 답변으로 간주 (fallback)
                    ans = str(row.iloc[0])

            results.append(
                {
                    "index": int(idx),
                    "score": float(score),
                    "answer": ans,
                }
            )

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
