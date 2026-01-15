from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from gtts import gTTS
from pydantic import BaseModel
from PIL import Image
import torchvision.transforms as transforms
import torch.nn as nn
import torch
import uuid
import os
import requests
import io
# =================== 기본 설정 ===================
app = FastAPI()

# CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# 정적 파일 저장 폴더 설정
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# =================== Colab 연동 설정 ===================
COLAB_API_URL = "https://77db-34-169-180-80.ngrok-free.app/answer"

def get_answer_from_colab(keyword: str):
    try:
        res = requests.post(COLAB_API_URL, json={"keyword": keyword})
        if res.status_code == 200:
            return res.json()
        else:
            return {"answer": f"❌ 오류 상태: {res.status_code}", "top_similar_questions": []}
    except Exception as e:
        return {"answer": f"❌ Colab 연결 실패: {e}", "top_similar_questions": []}

# =================== 음성 챗봇 API ===================
@app.post("/dialog")
async def dialog(request: Request):
    data = await request.json()
    keyword = data.get("keyword", "")

    result = get_answer_from_colab(keyword)
    response_text = result.get("answer", "❌ Colab에서 응답을 받지 못했어요.")
    top_questions = result.get("top_similar_questions", [])

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(STATIC_DIR, filename)

    tts = gTTS(text=response_text, lang="ko")
    tts.save(filepath)

    return JSONResponse({
        "text": response_text,
        "audio_url": f"/static/{filename}",
        "top_similar_questions": top_questions
    })

# =================== 이미지 분류 모델 설정 ===================
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

device = 'cuda' if torch.cuda.is_available() else 'cpu'

def get_image_model(num_classes=3):
    weights = EfficientNet_B0_Weights.DEFAULT
    model = efficientnet_b0(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

image_model = get_image_model()
model_path = os.path.join(os.path.dirname(__file__), "best_model.pt")
image_model.load_state_dict(torch.load(model_path, map_location=device))
image_model.eval().to(device)

def predict_image(file: UploadFile):
    image = Image.open(file.file).convert("RGB")
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

# =================== 이미지 예측 API ===================
@app.post("/predict-image")
async def predict_image_api(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            return JSONResponse({"error": f"이미지를 열 수 없습니다: {e}"}, status_code=400)

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

        return JSONResponse({
            "prediction": int(predicted.item()),
            "text": "응급 이미지 예측 결과입니다.",
            "audio_url": None,
            "top_similar_questions": []
        })

    except Exception as e:
        return JSONResponse({"error": f"서버 내부 오류: {e}"}, status_code=500)

# =================== 루트 페이지 ===================
@app.get("/")
def root():
    return {"message": "🔥 응급처치 TTS + 이미지 예측 서버가 실행 중입니다."}
