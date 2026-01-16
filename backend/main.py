from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from gtts import gTTS
from PIL import Image

import torchvision.transforms as transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

import torch
import torch.nn as nn
import pandas as pd

import uuid
import os
import io
import re

from sentence_transformers import SentenceTransformer, util

# =================== 기본 설정 ===================
app = FastAPI()

# ✅ 운영에서는 allow_origins를 Netlify 도메인으로 좁히는 걸 추천
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 나중에 ["https://sosaii.netlify.app"] 로 변경 추천
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

BASE_DIR = os.path.dirname(__file__)

# 정적 파일 저장 폴더 설정 (mp3 저장)
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# =================== 디바이스 ===================
device = "cuda" if torch.cuda.is_available() else "cpu"

# =================================================
# 1) 챗봇(SBERT) 로딩 (서버 시작 시 1회만)
# =================================================
MODEL_DIR = os.path.join(BASE_DIR, "models")
Q_PKL_PATH = os.path.join(MODEL_DIR, "화상_질문_with_embedding.pkl")
A_CSV_PATH = os.path.join(MODEL_DIR, "화상_답변.csv")

text_model = None
df_q = None
df_a = None

def load_answer_csv(path: str) -> pd.DataFrame:
    try:
        return pd.read_csv(path, encoding="cp949")
    except:
        return pd.read_csv(path, encoding="utf-8")

def preprocess(text: str) -> str:
    return re.sub(r"[^\w\s]", "", text).strip().lower()

def init_chatbot():
    global text_model, df_q, df_a

    # SBERT 모델 로드
    text_model = SentenceTransformer("jhgan/ko-sroberta-multitask", device=device)

    # 데이터 로드
    df_q = pd.read_pickle(Q_PKL_PATH)
    df_q["embedding"] = df_q["embedding"].apply(lambda x: torch.tensor(x).to(device))

    df_a = load_answer_csv(A_CSV_PATH)

    # 질환_의도 키 생성
    for df in [df_q, df_a]:
        df["fileName"] = df["fileName"].astype(str).str.strip().str.upper()
        df["질환_의도"] = df["disease_name"].astype(str).str.strip() + "_" + df["intention"].astype(str).str.strip()

    df_a["answer"] = df_a["answer"].fillna("")

def find_best_conditions(user_input: str, top_k=3):
    input_embedding = text_model.encode(preprocess(user_input), convert_to_tensor=True).to(device)
    similarities = [util.cos_sim(qe, input_embedding).item() for qe in df_q["embedding"]]
    top_indices = torch.topk(torch.tensor(similarities), top_k).indices.tolist()

    result = [{
        "question": df_q.iloc[idx]["question"],
        "condition_key": df_q.iloc[idx]["질환_의도"],
        "similarity": round(similarities[idx], 4)
    } for idx in top_indices]

    return result, input_embedding

def get_best_answer(user_input: str):
    user_input = (user_input or "").strip()
    if not user_input:
        return {"answer": "❌ 입력된 내용이 없어요.", "matches": [], "top_similar_questions": []}

    similar_info, input_embedding = find_best_conditions(user_input)
    condition_key = similar_info[0]["condition_key"]

    answer_df = df_a[df_a["질환_의도"] == condition_key]
    if answer_df.empty:
        return {"answer": "❌ 해당 주제에 대한 답변이 없습니다.", "matches": similar_info, "top_similar_questions": similar_info}

    priority_keywords = ['조치', '예방', '대응', '응급', '처치', '초기', '해결', '냉찜질', '물로 식히기', '연고', '병원']
    filtered_df = answer_df[answer_df["answer"].str.contains("|".join(priority_keywords), na=False)]
    target_df = filtered_df if not filtered_df.empty else answer_df

    answer_texts = target_df["answer"].fillna("").tolist()
    answer_embeddings = text_model.encode(answer_texts, convert_to_tensor=True).to(device)
    sims = util.cos_sim(input_embedding, answer_embeddings)[0]
    best_idx = torch.argmax(sims).item()

    return {
        "answer": answer_texts[best_idx].strip() + " 더 궁금한 점이 있으신가요?",
        "matches": similar_info,
        "top_similar_questions": similar_info
    }

# FastAPI 시작 시 챗봇 초기화
@app.on_event("startup")
def on_startup():
    init_chatbot()
    init_image_model()

# =================================================
# 2) 이미지 분류 모델 로딩 (서버 시작 시 1회만)
# =================================================
image_model = None

def get_image_model(num_classes=3):
    weights = EfficientNet_B0_Weights.DEFAULT
    model = efficientnet_b0(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

def init_image_model():
    global image_model
    image_model = get_image_model()
    model_path = os.path.join(BASE_DIR, "best_model.pt")
    image_model.load_state_dict(torch.load(model_path, map_location=device))
    image_model.eval().to(device)

def run_image_predict(image: Image.Image) -> int:
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        output = image_model(tensor)
        _, predicted = torch.max(output, 1)

    return int(predicted.item())

# =================================================
# 3) API
# =================================================
@app.post("/dialog")
async def dialog(request: Request):
    data = await request.json()
    keyword = data.get("keyword", "")

    result = get_best_answer(keyword)
    response_text = result.get("answer", "❌ 응답을 만들지 못했어요.")
    top_questions = result.get("top_similar_questions", [])

    # TTS mp3 생성
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(STATIC_DIR, filename)
    gTTS(text=response_text, lang="ko").save(filepath)

    return JSONResponse({
        "text": response_text,
        "audio_url": f"/static/{filename}",
        "top_similar_questions": top_questions
    })

@app.post("/predict-image")
async def predict_image_api(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            return JSONResponse({"error": f"이미지를 열 수 없습니다: {e}"}, status_code=400)

        pred = run_image_predict(image)

        return JSONResponse({
            "prediction": pred,
            "text": "응급 이미지 예측 결과입니다.",
            "audio_url": None,
            "top_similar_questions": []
        })
    except Exception as e:
        return JSONResponse({"error": f"서버 내부 오류: {e}"}, status_code=500)

@app.get("/")
def root():
    return {"message": "🔥 SOSKIN FastAPI (챗봇+TTS+이미지예측) 서버가 실행 중입니다."}
