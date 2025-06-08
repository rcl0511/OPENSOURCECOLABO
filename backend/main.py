from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from gtts import gTTS
import os
import uuid
import requests

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 설정
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ✅ Colab 주소를 여기에 입력
COLAB_API_URL = "https://886a-34-16-166-76.ngrok-free.app/answer"

# ✅ Colab 연동 함수
def get_answer_from_colab(keyword: str):
    try:
        res = requests.post(COLAB_API_URL, json={"keyword": keyword})
        if res.status_code == 200:
            return res.json()
        else:
            return {"answer": f"❌ 오류 상태: {res.status_code}", "top_similar_questions": []}
    except Exception as e:
        return {"answer": f"❌ Colab 연결 실패: {e}", "top_similar_questions": []}

# ✅ /dialog → Colab에 질문 전달 → TTS 응답 + 유사 질문 리스트
@app.post("/dialog")
async def dialog(request: Request):
    data = await request.json()
    keyword = data.get("keyword", "")

    # Colab에서 응답 받기
    result = get_answer_from_colab(keyword)
    response_text = result.get("answer", "❌ Colab에서 응답을 받지 못했어요.")
    top_questions = result.get("top_similar_questions", [])

    # 음성 생성
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(STATIC_DIR, filename)
    tts = gTTS(text=response_text, lang="ko")
    tts.save(filepath)

    return JSONResponse({
        "text": response_text,
        "audio_url": f"/static/{filename}",  # ✅ 수정
    "top_similar_questions": top_questions
    })

# 서버 상태 확인
@app.get("/")
def root():
    return {"message": "🔥 응급처치 TTS 서버가 Colab과 연결되어 실행 중입니다."}
