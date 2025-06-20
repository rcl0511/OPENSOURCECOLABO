# 🔥 SOSKIN: 화상 응급상황 자동 안내 시스템

**SOSKIN**은 화상 응급상황 발생 시, 사용자가 사진을 업로드하거나 음성·텍스트로 질문하면,  
AI가 자동으로 화상의 정도를 분석하고 적절한 응급처치 지침을 텍스트 및 음성으로 제공하는 Python 기반 시스템입니다.

**주요 기능**

화상 이미지 분석
- Kaggle 데이터셋 기반 CNN 화상 분류 모델 탑재 (1도/2도/3도 화상 자동 판별)
- 사용자가 업로드한 이미지 분석 후 분류 결과 제공
내부 데이터와 매칭하여 적합한 대화 흐름을 선택합니다

AI QnA 응급처치 안내
- AIHub 헬스케어 QnA 데이터 기반 질의응답
- 질문 데이터: 화상 관련 질의와 임베딩 벡터 포함 (.pkl 파일)
- 답변 데이터: 화상_치료/예방/대응 등 질환_의도별 실제 답변 텍스트 (.csv 파일)

CHATBOT(COLAB)
- 유사 질의 분석 및 대응: 사용자의 질의에 대해 SBERT 임베딩 기반 유사도 분석을 수행하여 가장 관련성 높은 '질환_의도'를 찾고 응답합니다.
- 질환 중심 의도 기반 응답 전환: "화상_진단" 또는 "화상_원인"과 같은 의도를 "화상_치료"로 자동 전환하여 실제 처치 중심 응답을 우선 제공합니다.
- 우선 키워드 필터링: 응답 후보 중 '조치', '예방', '응급', '연고' 등 중요 키워드 포함 응답을 우선 추출하여 응급 대응에 적합한 응답을 제공합니다.
- Flask API 서버: POST 요청으로 키워드 질의를 보내면 JSON 형태로 응답을 받는 RESTful API로 구성됩니다.
- pyngrok을 이용한 외부 접근 가능 로컬 서버 구현.

음성 입출력
- Whisper 기반 STT(음성 → 텍스트) 변환
- gTTS 기반 TTS(텍스트 → 음성) 안내 제공
- "물집이 생겼어요", "화상 부위가 부어요" 등의 자연어 질의 처리 가능


- main.py: 전체 서버 구동 및 API 라우터
- soskin_chatbot.ipynb: 사용자 질의 → 유사 질환/의도 매칭 → 적절한 답변 생성


  
**Key Features**
- Burn Image Classification
  - Kaggle 화상 이미지 데이터셋 기반 CNN 모델로 1도, 2도, 3도 화상 분류
  - 사용자 업로드 사진 분석 후 응급처치 가이드 연결

- Semantic Search-Based QnA Chatbot
  - Ko-SBERT 모델을 활용한 자연어 질의 응답 시스템
  - 사용자의 화상 관련 질문에 대해 유사한 질환_의도 추출 및 대응 응답 제공

- Context-Aware Answer Switching
  - '화상_진단' 또는 '화상_원인' 질의가 입력되면 자동으로 '화상_치료' 중심으로 응답 전환
  - 즉, 진단성 질의에도 실제 처치 중심 정보 제공

- Priority Keyword Filtering
  - ‘조치’, ‘응급’, ‘예방’, ‘냉찜질’, ‘연고’ 등 실질적 행동 안내 포함 응답을 우선적으로 제공

- TTS (Text-to-Speech) 안내 기능
  - Google TTS API 연동으로 응급처치 응답을 음성으로 안내 (한국어)

- RESTful API Interface
  - Flask 기반 API 서버, `/answer` endpoint로 POST 요청 시 JSON 응답 반환
  - pyngrok을 통한 외부 접속 가능 서버 구성

- 웹·모바일 UI 연동 준비
- React 프론트엔드와의 연동을 통해 사용자 친화적 UI 구현 가능

**실행 방법 (Run Instructions)**

필요한 라이브러리 설치
pip install -r requirements.txt
pip install openai-whisper gtts sounddevice wavio numpy
pip install gtts
pip install fastapi uvicorn gtts pygame
pip freeze


## 서버 실행 방법

```bash
cd /sosai
npm start
```


백엔드 실행 (FastAPI)
```bash
cd /backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
## Colab에서 ngrok 주소 연동하는 방법

1️⃣ ngrok 인증키 등록 (최초 1회만 실행)
!ngrok config add-authtoken <your_personal_ngrok_auth_token>

2️⃣ Colab 실행 시 ngrok 주소 확인
✅ 서버 주소: NgrokTunnel: "https://8c78-xxx-xxx-xxx.ngrok-free.app" -> "http://localhost:5000"

3️⃣ main.py 코드에서 ngrok 주소 수정
: Colab에서 실시간으로 할당된 ngrok 주소를 여기에 입력
COLAB_API_URL = "https://8c78-xxx-xxx-xxx.ngrok-free.app/answer"





**향후 계획 (Planned Improvements)**
실시간 웹캠 연동 기능 추가
모바일 앱(PWA) 변환
다국어 처리 (Multilingual TTS)
화상 외 다른 응급상황(절단, 출혈 등)으로 범위 확장




**저작권 및 라이선스 안내**

본 프로젝트의 소스코드 및 데이터는 모두 오픈소스 목적으로 작성되었습니다.
프로젝트 내 소스코드, 문서, 샘플 데이터 등은 MIT 라이선스를 따릅니다.
자유롭게 복사, 수정, 배포, 상업적 이용이 가능합니다.
단, 저작권 고지와 라이선스 전문을 반드시 포함해야 하며,
보증이 제공되지 않습니다.

외부 TTS 및 음성인식 API(예: Google gTTS, 네이버 CLOVA, 카카오 TTS 등)를
사용하는 경우, 해당 서비스의 약관 및 라이선스를 반드시 준수해야 합니다.


MIT License

Copyright (c) 2024 OPENSOURCECOLABO

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
