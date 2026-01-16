from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from database_mongo import users_col
from schemas import SignupIn, LoginIn
from security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

def now_utc():
    return datetime.now(timezone.utc)

@router.post("/signup")
async def signup(payload: SignupIn):
    exists = await users_col.find_one({"email": payload.email})
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    doc = {
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "created_at": now_utc(),
    }
    res = await users_col.insert_one(doc)
    user_id = str(res.inserted_id)

    token = create_access_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": payload.email,
            "name": payload.name,
            "created_at": doc["created_at"],
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

    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "created_at": user["created_at"],
        }
    }
