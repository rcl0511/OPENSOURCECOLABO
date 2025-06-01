from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from gtts import gTTS
import os
import uuid

app = FastAPI()

# CORS 설정 (프론트엔드 개발을 위해 전체 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중 전체 허용, 배포시 수정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# static 폴더를 /static 경로로 서빙
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def get_emergency_response(keyword):
    keyword = keyword.strip()
    if any(kw in keyword for kw in ["쓰러", "넘어", "기절"]):
        return "지금 환자분이 의식이 있으신가요?"
    elif any(kw in keyword for kw in [ "없", "아니"]):
        return (
            "지금 바로 119에 신고해 주세요. 그리고 심폐소생술을 시작해 주시겠어요?\n"
            "심폐소생술이 필요하시면 '심폐소생술' 또는 'CPR'이라고 말씀해 주세요."
        )
    elif any(kw in keyword for kw in ["네", "응", "있"]):
        return "네, 알겠습니다. 환자분의 호흡과 상태를 계속 지켜봐 주세요. 필요하다면 언제든 다시 말씀해 주세요."
    elif keyword == "발작":
        return "환자분을 조심스럽게 옆으로 눕혀 주시고, 주변에 위험한 물건이 있다면 치워 주세요."
    elif keyword == "하임리히법":
        return "환자분 뒤에 서서, 두 팔로 환자분의 배를 감싸 잡고 명치 아래를 위쪽으로 힘껏 밀어 올려 주세요."
    elif any(kw in keyword for kw in ["심폐", "씨", "c"]):
        return (
            "심폐소생술(CPR) 방법을 안내드릴게요.\n"
            "1. 환자를 평평한 바닥에 눕히고, 무릎을 꿇고 앉아 주세요.\n"
            "2. 한 손바닥을 환자의 가슴 중앙(가슴뼈)에 올리고, 다른 손을 그 위에 포개 주세요.\n"
            "3. 팔을 곧게 펴고, 체중을 실어서 가슴이 5cm 이상 들어가도록 빠르고 강하게 30회 압박하세요. (분당 약 100~120회)\n"
            "4. 가슴 압박 30회 후에는 인공호흡 2회를 시도하세요. (단, 인공호흡이 어렵거나 거부감이 있으면 가슴압박만 지속)\n"
            "5. 119가 도착하거나 환자가 움직이거나 숨을 쉴 때까지 반복해 주세요.\n"
            "추가 안내가 필요하시면 '자세히', '인공호흡', 'AED' 등으로 말씀해 주세요."
        )
    elif any(kw in keyword for kw in ["인공", "호흡"]):
        return (
            "인공호흡 방법입니다.\n"
            "1. 환자의 기도를 확보해 주세요(머리를 젖히고 턱을 들어 올리기).\n"
            "2. 코를 막고, 입을 완전히 덮은 뒤 약 1초간 숨을 불어넣으세요.\n"
            "3. 환자의 가슴이 올라가는지 확인해 주세요.\n"
            "4. 2회 실시 후, 바로 가슴 압박을 30회 반복해 주세요."
        )
    elif keyword in ["AED", "자동심장충격기"]:
        return (
            "AED(자동심장충격기) 사용법을 안내드릴게요.\n"
            "1. AED 전원을 켜고 안내 음성을 따라 주세요.\n"
            "2. 상반신을 노출시키고 패드를 가슴에 붙여 주세요.\n"
            "3. '분석 중' 음성이 나오면 환자에게 손대지 마세요.\n"
            "4. '충격 버튼을 누르세요'라고 하면 버튼을 눌러 주세요.\n"
            "5. 이후 다시 바로 심폐소생술을 시작하세요."
        )
    elif keyword == "고마워":
        return "도움이 될 수 있어서 정말 다행이에요. 언제든 필요하실 때 불러 주세요! 항상 안전하시길 바랍니다."
    else:
        return "죄송해요, 아직 그 상황은 인식하지 못했어요. 조금 더 구체적으로 말씀해 주실 수 있나요?"


@app.post("/dialog")
async def dialog(request: Request):
    data = await request.json()
    keyword = data.get("keyword", "")
    print("🔥 받은 키워드:", keyword) 
    # 대화 응답
    response_text = get_emergency_response(keyword)

    # mp3 파일명, 경로 생성
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(STATIC_DIR, filename)

    # gTTS로 음성 생성
    tts = gTTS(text=response_text, lang="ko")
    tts.save(filepath)

    # 프론트엔드에 응답 (음성파일은 /static/파일명.mp3 경로로 접근)
    return JSONResponse({
        "text": response_text,
        "audio_url": f"static/{filename}"
    })

# FastAPI 기본 루트(선택, 서버 잘 도는지 확인용)
@app.get("/")
def root():
    return {"message": "응급상황 TTS 서버가 실행중입니다."}
