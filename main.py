import os
from gtts import gTTS
import pygame
import time

def emergency_dialog(keyword):
    # 대화 flow
    if keyword == "쓰러졌어요":
        text = "지금 환자분이 의식이 있으신가요?"
        speak(text)
        answer = input("답변해 주세요 (예: 있어요 / 없어요): ")
        if answer == "없어요":
            text = (
                "지금 바로 119에 신고해 주세요. "
                "그리고 심폐소생술을 시작해 주시겠어요?"
            )
            speak(text)
        else:
            text = (
                "네, 알겠습니다. 환자분의 호흡과 상태를 계속 지켜봐 주세요. "
                "필요하다면 언제든 다시 말씀해 주세요."
            )
            speak(text)
    elif keyword == "발작":
        text = (
            "환자분을 조심스럽게 옆으로 눕혀 주시고, "
            "주변에 위험한 물건이 있다면 치워 주세요."
        )
        speak(text)
    elif keyword == "하임리히법":
        text = (
            "환자분 뒤에 서서, 두 팔로 환자분의 배를 감싸 잡고 "
            "명치 아래를 위쪽으로 힘껏 밀어 올려 주세요."
        )
        speak(text)
    elif keyword == "고마워":
        text = (
            "도움이 될 수 있어서 정말 다행이에요. 언제든 필요하실 때 불러 주세요! "
            "항상 안전하시길 바랍니다."
        )
        speak(text)
        return False  # 종료 신호
    else:
        text = (
            "죄송해요, 아직 그 상황은 인식하지 못했어요. "
            "조금 더 구체적으로 말씀해 주실 수 있나요?"
        )
        speak(text)
    return True  # 계속 대화

def speak(text):
    print("TTS 안내:", text)
    tts = gTTS(text=text, lang='ko')
    filename = "output.mp3"
    tts.save(filename)
    pygame.mixer.init()
    pygame.mixer.music.load(filename)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        time.sleep(0.5)
    pygame.mixer.music.unload()
    os.remove(filename)

if __name__ == "__main__":
    print("응급상황이 있으시면 키워드를 말씀해 주세요. (종료하려면 '고마워'라고 입력)")
    while True:
        keyword = input(">> ")
        if not emergency_dialog(keyword):
            break
