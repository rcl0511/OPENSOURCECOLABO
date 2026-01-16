import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "sosai")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]

users_col = db["users"]
medical_col = db["medical_profiles"]
