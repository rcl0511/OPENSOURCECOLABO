from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=50)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    created_at: datetime

class MedicalProfileIn(BaseModel):
    name: str = ""
    birth_date: str = ""
    blood_type: str = ""
    medical_history: str = ""
    surgery_history: str = ""
    medications: str = ""
    allergies: str = ""
    emergency_contacts: str = ""

class MedicalProfileOut(MedicalProfileIn):
    user_id: str
    created_at: datetime
    updated_at: datetime
