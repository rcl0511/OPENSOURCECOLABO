응급 상황 자동 안내 시스템

이 프로젝트는 사용자가 음성으로 응급 상황을 설명하면,
보유하고 있는 대화 데이터와 시나리오를 바탕으로
상황에 맞는 단계별 안내 문장을 생성하여
TTS(Text to Speech)로 음성 안내를 제공하는 Python 기반 프로그램입니다.

주요 기능

사용자의 음성 입력을 텍스트로 변환합니다

내부 데이터와 매칭하여 적합한 대화 흐름을 선택합니다

상황에 맞는 안내 문장을 TTS로 변환하여 음성으로 안내합니다

예를 들어 사용자가 쓰러졌어요 라고 말하면 의식이 있나요 등의 후속 질문과 안내를 단계별로 제공합니다

기술 스택
Python 3
gTTS 또는 네이버 Clova 등 TTS API
음성 인식용 Speech to Text API
필요한 라이브러리는 requirements.txt에 정리되어 있습니다

실행 방법

필요한 라이브러리 설치
pip install -r requirements.txt

가상환경 사용 권장
python -m venv .venv
.venv\Scripts\activate

프로그램 실행
python main.py

향후 계획
더 다양한 응급 상황 데이터 추가
음성 인식 정확도 개선
웹 또는 모바일 연동 등 확장 개발


저작권 및 라이선스 안내

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
