from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from database_mongo import users_col, medical_col
from schemas import SignupIn, LoginIn
from security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

def now_utc():
    return datetime.now(timezone.utc)

@router.post("/signup")
async def signup(payload: SignupIn):
    # 1) 이메일 중복 체크
    exists = await users_col.find_one({"email": payload.email})
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    # 2) users 컬렉션에 유저 생성
    created_at = now_utc()
    user_doc = {
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "created_at": created_at,
    }
    res = await users_col.insert_one(user_doc)
    user_id = str(res.inserted_id)

    # 3) ✅ medical_profiles 기본 문서 자동 생성
    # - 나중에 /dialog에서 user_id로 찾아 개인화할 수 있게 만들어둠
    # - 이미 존재하는 경우(희박하지만) 중복 생성 방지
    mp_exists = await medical_col.find_one({"user_id": user_id})
    if not mp_exists:
        medical_doc = {
            "user_id": user_id,
            "name": payload.name,          # 기본은 회원가입 이름으로 채움
            "birth_date": "",
            "blood_type": "",
            "medical_history": "",
            "surgery_history": "",
            "medications": "",
            "allergies": "",
            "emergency_contacts": "",
            "created_at": created_at,
            "updated_at": created_at,
        }
        await medical_col.insert_one(medical_doc)

    # 4) 토큰 발급 + 응답
    token = create_access_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": payload.email,
            "name": payload.name,
            "created_at": created_at,
        }
    }

@router.post("/login")
async def login(payload: LoginIn):
    user = await users_col.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(user["_id"])
    token = create_access_token(user_id)

    # (선택) 로그인할 때 medical profile이 없으면 만들어두는 “안전장치”
    # 운영 중간에 정책 바뀌었을 때 유저들 누락되는 거 방지됨
    mp_exists = await medical_col.find_one({"user_id": user_id})
    if not mp_exists:
        now = now_utc()
        await medical_col.insert_one({
            "user_id": user_id,
            "name": user.get("name", ""),
            "birth_date": "",
            "blood_type": "",
            "medical_history": "",
            "surgery_history": "",
            "medications": "",
            "allergies": "",
            "emergency_contacts": "",
            "created_at": now,
            "updated_at": now,
        })

    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "created_at": user["created_at"],
        }
    }
