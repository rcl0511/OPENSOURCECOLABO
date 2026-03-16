<div align="center">

# SOSAI
### AI 기반 응급 상황 대응 및 지능형 음성 가이드 시스템

[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://sosaii.netlify.app/)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![AWS EC2](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**[라이브 서비스 바로가기 →](https://sosaii.netlify.app/)**

</div>

---

## 목차

- [프로젝트 소개](#프로젝트-소개)
- [주요 기능](#주요-기능)
- [시스템 아키텍처](#시스템-아키텍처)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [API 명세](#api-명세)
- [LLM 설계 원칙](#llm-설계-원칙)
- [보안 설계](#보안-설계)
- [로컬 실행 방법](#로컬-실행-방법)
- [배포 구성](#배포-구성)
- [라이선스](#라이선스)

---

## 프로젝트 소개

**SOSAI**는 응급 상황에서 사용자가 신속하고 정확한 대처를 할 수 있도록 돕는 AI 기반 응급 가이드 애플리케이션입니다.

음성 또는 텍스트로 증상을 입력하면, 사전에 등록된 개인 의료 프로필(혈액형, 알레르기, 병력 등)을 참고하여 **개인화된 단계별 응급 행동 지침**을 텍스트와 음성(TTS)으로 즉시 제공합니다. 위험도 판단 결과에 따라 119 긴급 신고 화면으로 직결 연계됩니다.

> 본 서비스는 의료 진단 도구가 아닙니다. 모든 응급 상황에서는 반드시 전문 의료진의 도움을 받으십시오.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **AI 응급 안내** | OpenAI GPT-4.1-mini 기반 개인화 응급 가이드. 위험도·행동지침·주의사항을 구조화된 포맷으로 제공 |
| **음성 입력 (STT)** | Web Speech API를 통한 한국어 음성 인식 (`ko-KR`). 핸즈프리 응급 대응 가능 |
| **음성 출력 (TTS)** | Google gTTS 기반 MP3 생성 및 1.25배속 자동 재생 |
| **개인 의료 프로필** | 혈액형, 병력, 복용 약물, 알레르기, 비상 연락처 등록 및 LLM 컨텍스트 연동 |
| **응급 신고 연계** | 현재 위치 기반 지도 표시 및 119 직접 전화 연결 |
| **JWT 인증** | 회원가입/로그인, Bearer 토큰 기반 안전한 API 인증 |

---

## 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                   Client (모바일 브라우저)                  │
│              React SPA — Netlify CDN (HTTPS)              │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API (HTTPS)
┌──────────────────────▼───────────────────────────────────┐
│               AWS EC2 (Ubuntu) — NGINX                    │
│         FastAPI + Uvicorn  (port 8000, systemd)           │
│                                                           │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐  │
│   │  /auth/*    │   │  /dialog     │   │  /medical    │  │
│   │  JWT 인증    │   │  LLM 파이프라인│   │  프로필 CRUD │  │
│   └─────────────┘   └──────┬───────┘   └──────┬───────┘  │
└──────────────────────────  │  ───────────────  │  ────────┘
                             │                   │
              ┌──────────────▼──────┐   ┌────────▼──────────┐
              │   OpenAI GPT-4.1   │   │   MongoDB Atlas    │
              │   + Google gTTS    │   │  (users, medical)  │
              └────────────────────┘   └────────────────────┘
```

### 핵심 데이터 흐름

```
사용자 음성/텍스트 입력
        ↓
  Web Speech API (STT)
        ↓
  POST /dialog + Bearer Token
        ↓
  JWT 검증 → MongoDB에서 의료 프로필 로드
        ↓
  OpenAI API 호출
  (시스템 프롬프트 + 의료 컨텍스트 + 사용자 질문)
        ↓
  응답 텍스트 생성
        ↓
  Google gTTS → MP3 파일 생성 (/static/*.mp3)
        ↓
  { answer, audio_url, personalized } 반환
        ↓
  프론트엔드: 텍스트 표시 + 오디오 자동 재생
```

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.1.0 | SPA UI 프레임워크 |
| React Router DOM | 7.6.1 | 클라이언트 사이드 라우팅 |
| Create React App | 5.0.1 | 빌드 도구 |
| Leaflet + react-leaflet | 1.9.4 | 지도 및 위치 시각화 |
| Lucide React | 0.511.0 | 아이콘 컴포넌트 |
| Kakao Maps SDK | — | 주소 Geocoding |
| Web Speech API | 브라우저 내장 | 한국어 음성 인식 (STT) |

### Backend

| 기술 | 용도 |
|------|------|
| FastAPI (Python) | REST API 서버 |
| Uvicorn | ASGI 비동기 서버 |
| OpenAI SDK (GPT-4.1-mini) | 응급 안내 텍스트 생성 |
| Google gTTS | 텍스트 → MP3 음성 합성 |
| Motor | MongoDB 비동기 드라이버 |
| python-jose | JWT 생성 및 검증 (HS256) |
| passlib[bcrypt] | 비밀번호 해싱 |

### 인프라

| 구분 | 기술 |
|------|------|
| 프론트엔드 호스팅 | Netlify (Static + CDN, HTTPS 자동) |
| 백엔드 호스팅 | AWS EC2 (Ubuntu) + NGINX Reverse Proxy |
| 프로세스 관리 | systemd (`Restart=always`) |
| 데이터베이스 | MongoDB Atlas (Cloud, TLS 암호화) |

---

## 프로젝트 구조

```
OPENSOURCECOLABO/
├── README.md
├── ARCHITECTURE.md
├── assets/
│   └── SOSAI-architecture.png
│
├── backend/                        # Python FastAPI 백엔드
│   ├── main.py                    # 앱 진입점, /dialog /tts /health 라우트
│   ├── routes_auth.py             # 인증 라우터 (회원가입, 로그인)
│   ├── routes_medical.py          # 의료 프로필 CRUD 라우터
│   ├── database_mongo.py          # MongoDB 연결 및 컬렉션 설정
│   ├── schemas.py                 # Pydantic 요청/응답 모델 (DTO)
│   ├── security.py                # JWT 생성/검증, bcrypt 해싱
│   ├── deps.py                    # FastAPI 의존성 주입 (토큰 추출)
│   ├── requirements.txt           # Python 의존성 목록
│   └── static/                    # gTTS 생성 MP3 파일 (런타임)
│
└── sosai/                         # React 프론트엔드
    ├── package.json
    ├── public/
    └── src/
        ├── App.js                 # 라우팅 설정 (BrowserRouter + Routes)
        ├── index.js               # React 진입점
        ├── components/
        │   └── NavBar.jsx         # 하단 고정 내비게이션 바 (공유 컴포넌트)
        └── pages/
            ├── LoginPage.jsx      # 로그인 / 서비스 진입
            ├── SignupPage.jsx     # 회원가입 (이메일, 비밀번호, 이름)
            ├── VoicePage.jsx      # 핵심 기능: 음성·텍스트 입력 + AI 응답
            ├── CallPage.jsx       # 응급 신고: 지도 + 119 직접 전화
            ├── Medical.jsx        # 의료 프로필 조회 및 수정
            └── Settings.jsx       # 사용자 설정 및 프로필 이미지
```

### 설계 패턴

| 패턴 | 적용 위치 | 설명 |
|------|-----------|------|
| Feature-based 모듈화 | 전체 구조 | 기능 단위(`pages/`, `routes_*.py`)로 모듈 분리 |
| Dependency Injection | FastAPI | `deps.py`의 `get_current_user_id`를 라우트 의존성으로 주입 |
| Schema 기반 유효성 검증 | 백엔드 | Pydantic 모델(`schemas.py`)로 요청/응답 타입 강제 |
| localStorage 폴백 | 프론트엔드 | 미인증 상태에서도 의료 정보를 로컬에 유지, 오프라인 지원 |
| Upsert 패턴 | MongoDB | 의료 프로필 저장 시 insert/update 통합 처리 |

---

## API 명세

### 인증

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/auth/signup` | 회원가입, JWT 발급 | 불필요 |
| POST | `/auth/login` | 로그인, JWT 발급 | 불필요 |

### 핵심 기능

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/dialog` | AI 응급 안내 텍스트 + 오디오 생성 | 선택 (개인화) |
| POST | `/tts` | 텍스트 → MP3 변환 | 불필요 |

### 의료 프로필

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/medical` | 내 의료 프로필 조회 | 필수 |
| PUT | `/medical` | 의료 프로필 저장/수정 | 필수 |

### 상태 확인

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/` | 서비스 헬스 체크 |
| GET | `/health` | 상세 상태 (LLM, TTS 설정 등) |

<details>
<summary>요청/응답 예시 보기</summary>

**POST /dialog**
```json
// Request
{
  "keyword": "갑자기 가슴이 너무 아프고 왼쪽 팔이 저려요"
}

// Response
{
  "ok": true,
  "answer": "[위험도] 높음\n[즉시 해야 할 행동]\n1. 즉시 119에 신고하세요...",
  "audio_url": "/static/a1b2c3d4.mp3",
  "elapsed_ms": 2430,
  "personalized": true
}
```

**POST /auth/signup**
```json
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6650a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "홍길동",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

</details>

---

## LLM 설계 원칙

SOSAI의 LLM은 의료 진단을 수행하지 않습니다. 아래 원칙이 시스템 프롬프트 레벨에서 엄격히 제어됩니다.

1. **생명 위협 징후** (의식 소실, 호흡 곤란, 심한 출혈, 경련 등) 감지 시 → **"119에 신고하세요"를 최우선으로 안내**
2. 모든 안내는 **짧고 명확한 단계별 행동 지침** 포맷으로 제공
3. 의학 전문 용어 사용 최소화 (필요 시 간략한 설명 병기)
4. 판단 불명확 시 **"전문 의료진 도움 필요"** 명시
5. 사용자의 알레르기/기저 질환 등 의료 프로필을 응답에 반드시 반영

**응답 구조**
```
[위험도]      낮음 / 중간 / 높음
[즉시 행동]   단계별 행동 지침
[주의사항]    추가 경고 사항
[추가 질문]   상황 확인을 위한 후속 질문
[면책]        의료 면책 고지
```

---

## 보안 설계

| 항목 | 구현 방식 |
|------|-----------|
| 인증 | JWT (HS256), 유효기간 30일, `Authorization: Bearer` 헤더 |
| 비밀번호 | bcrypt 해싱 (자동 솔트 적용) |
| CORS | `sosaii.netlify.app`, `localhost:3000` 등 화이트리스트만 허용 |
| 의료 데이터 | user_id 기반 격리, 유효한 JWT 없이 접근 불가 |
| 환경 변수 | 모든 시크릿 `/etc/sosai.env`에 분리 저장 (`.gitignore` 처리) |

---

## 로컬 실행 방법

### 프론트엔드

```bash
cd sosai
npm install
# .env 파일 생성
echo "REACT_APP_API_BASE_URL=http://localhost:8000" > .env
npm start
# → http://localhost:3000
```

### 백엔드

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 환경 변수 설정
export OPENAI_API_KEY="sk-..."
export JWT_SECRET="your-secret-key"
export MONGODB_URI="mongodb+srv://..."

uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

---

## 배포 구성

### 프론트엔드 — Netlify

- GitHub 연동 자동 배포 (push to `main` → 빌드 트리거)
- `_redirects` 파일로 SPA 라우팅 지원 (`/* /index.html 200`)

### 백엔드 — AWS EC2 (Ubuntu)

**NGINX 리버스 프록시** (`/etc/nginx/sites-available/sosai`)

```nginx
server {
    listen 443 ssl;
    server_name api.rcl0511.xyz;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**systemd 서비스** (`/etc/systemd/system/sosai.service`)

```ini
[Unit]
Description=SOSAI FastAPI Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/OPENSOURCECOLABO/backend
EnvironmentFile=/etc/sosai.env
ExecStart=/home/ubuntu/OPENSOURCECOLABO/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable sosai
sudo systemctl start sosai
```

---

## 라이선스

본 프로젝트는 [MIT License](LICENSE)를 따릅니다.
자유롭게 수정, 배포 및 상업적 이용이 가능합니다.

단, 외부 API 사용 시 해당 서비스의 약관을 준수해야 합니다.
- [OpenAI Usage Policy](https://openai.com/policies/usage-policies)
- [Google Cloud TTS Terms](https://cloud.google.com/terms)

Copyright (c) 2025 OPENSOURCECOLABO
