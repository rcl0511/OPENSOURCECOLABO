from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from database_mongo import medical_col
from schemas import MedicalProfileIn, MedicalProfileOut
from deps import get_current_user_id

router = APIRouter(prefix="/medical", tags=["medical"])

def now_utc():
    return datetime.now(timezone.utc)

@router.on_event("startup")
async def ensure_indexes():
    await medical_col.create_index("user_id", unique=True)

@router.get("", response_model=MedicalProfileOut)
async def get_my_medical(user_id: str = Depends(get_current_user_id)):
    doc = await medical_col.find_one({"user_id": user_id})
    if not doc:
        return {
            "user_id": user_id,
            "name": "",
            "birth_date": "",
            "blood_type": "",
            "medical_history": "",
            "surgery_history": "",
            "medications": "",
            "allergies": "",
            "emergency_contacts": "",
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
    doc.pop("_id", None)
    return doc

@router.put("", response_model=MedicalProfileOut)
async def upsert_my_medical(payload: MedicalProfileIn, user_id: str = Depends(get_current_user_id)):
    existing = await medical_col.find_one({"user_id": user_id})
    created_at = existing.get("created_at", now_utc()) if existing else now_utc()

    update_doc = payload.model_dump()
    update_doc.update({
        "user_id": user_id,
        "created_at": created_at,
        "updated_at": now_utc(),
    })

    await medical_col.update_one(
        {"user_id": user_id},
        {"$set": update_doc},
        upsert=True
    )
    return update_doc
