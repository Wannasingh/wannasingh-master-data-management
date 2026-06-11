import os
# Auto-instrument FastAPI, HTTP client libraries, and Redis for Datadog APM
try:
    import ddtrace.auto
except ImportError:
    pass

import io
import json
import redis
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Annotated
import httpx
import random

class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SystemSettings(BaseModel):
    fuzzy_threshold: int
    golden_quality_threshold: int
    auto_merge: bool
    redis_cache_ttl: int

load_dotenv(override=True)

app = FastAPI(title="MDM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Initialization
# These env vars should be set in Vercel or locally via .env
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mock-url.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "mock-key")
SUPABASE_SCHEMA = os.getenv("SUPABASE_SCHEMA", "public")

opts = ClientOptions(schema=SUPABASE_SCHEMA)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=opts)

# Redis Initialization
REDIS_URL = os.getenv("REDIS_URL")
if REDIS_URL:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
else:
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

DEFAULT_SETTINGS = {
    "fuzzy_threshold": 75,
    "golden_quality_threshold": 80,
    "auto_merge": True,
    "redis_cache_ttl": 60
}

def _get_settings_from_redis() -> Optional[dict]:
    cache_key = "system_settings_cache"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        print(f"Redis get settings warning: {e}")
    return None

def _parse_supabase_settings(data: list) -> dict:
    settings_dict = {}
    for item in data:
        k = item["key"]
        v = item["value"]
        if k in ["fuzzy_threshold", "golden_quality_threshold", "redis_cache_ttl"]:
            settings_dict[k] = int(v)
        elif k == "auto_merge":
            settings_dict[k] = v.lower() == "true"
        else:
            settings_dict[k] = v
    return settings_dict

def _cache_settings_in_redis(settings_dict: dict) -> None:
    cache_key = "system_settings_cache"
    try:
        redis_client.set(cache_key, json.dumps(settings_dict), ex=300)
    except Exception as e:
        print(f"Redis set settings cache warning: {e}")

def get_system_settings() -> dict:
    """Fetch settings from Redis, or Supabase, or fall back to defaults"""
    cached = _get_settings_from_redis()
    if cached:
        return cached

    # Fetch from Supabase
    try:
        response = supabase.table("system_settings").select("*").execute()
        if response.data:
            settings_dict = _parse_supabase_settings(response.data)
            
            # Ensure all defaults are present if not in DB
            for k, val in DEFAULT_SETTINGS.items():
                if k not in settings_dict:
                    settings_dict[k] = val
            
            _cache_settings_in_redis(settings_dict)
            return settings_dict
    except Exception as e:
        print(f"Supabase read settings warning: {e}. Falling back to default settings.")
    
    return DEFAULT_SETTINGS


def save_system_settings(settings: SystemSettings):
    """Save settings to Supabase and cache in Redis"""
    cache_key = "system_settings_cache"
    settings_dict = settings.model_dump() if hasattr(settings, "model_dump") else settings.dict()
    
    # Save to Supabase (upsert)
    records = []
    for k, v in settings_dict.items():
        records.append({
            "key": k,
            "value": str(v)
        })
    
    try:
        supabase.table("system_settings").upsert(records).execute()
        # Log to audit_logs
        try:
            supabase.table("audit_logs").insert({
                "action": "UPDATE_SETTINGS",
                "details": f"System settings updated: {json.dumps(settings_dict)}",
                "actor": "Administrator"
            }).execute()
        except Exception as ae:
            print(f"Failed to write settings update to audit_logs: {ae}")
    except Exception as e:
        print(f"Supabase save settings warning: {e}")
    
    # Write/Update Redis cache
    try:
        redis_client.set(cache_key, json.dumps(settings_dict), ex=300)
    except Exception as e:
        print(f"Redis write settings cache warning: {e}")

class MasterDataResponse(BaseModel):
    id: Optional[int] = None
    name: str
    category: str
    value: float
    source_system: Optional[str] = "Manual Entry"
    status: Optional[str] = "Golden"
    data_quality_score: Optional[int] = 100

class MergeRequest(BaseModel):
    primary_id: int
    duplicate_id: int

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pandas ETL cleansing logic:
    - Drops duplicates
    - Trims whitespaces from string columns
    - Drops rows with missing required fields
    """
    # Drop completely empty rows
    df.dropna(how='all', inplace=True)
    
    # Trim whitespace for string columns
    map_fn = getattr(df, 'map', getattr(df, 'applymap', None))
    df = map_fn(lambda x: x.strip() if isinstance(x, str) else x)
    
    # Drop duplicates
    df.drop_duplicates(inplace=True)
    
    return df

@app.get("/api/master-data", response_model=List[MasterDataResponse], responses={500: {"description": "Internal Server Error"}})
async def get_master_data():
    """Retrieve master data from Supabase, caching in Redis"""
    cache_key = "master_data_cache"
    try:
        # Attempt to read from Redis cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        # Fallback gracefully if Redis is down/unavailable
        print(f"Redis cache read warning: {e}")

    try:
        response = supabase.table("master_data").select("*").execute()
        data = response.data
        
        # Attempt to cache the result in Redis with dynamic TTL
        try:
            settings = get_system_settings()
            ttl = settings.get("redis_cache_ttl", 60)
            redis_client.set(cache_key, json.dumps(data), ex=ttl)
        except Exception as e:
            print(f"Redis cache write warning: {e}")
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _score_single_record(rec: dict) -> None:
    if 'source_system' not in rec or not rec['source_system']:
        rec['source_system'] = 'CSV Ingestion'
    if 'status' not in rec or not rec['status']:
        rec['status'] = 'Golden'
    if 'data_quality_score' not in rec or rec['data_quality_score'] is None:
        score = 100
        name_str = str(rec.get('name', ''))
        val = rec.get('value')
        if not name_str or len(name_str) < 3:
            score -= 20
        if val is not None and float(val) <= 0:
            score -= 30
        rec['data_quality_score'] = max(10, score)

def _process_and_score_records(records: list) -> None:
    # Add default values and data quality calculation
    for rec in records:
        _score_single_record(rec)

@app.post("/api/upload-etl", responses={400: {"description": "Invalid File Format"}, 500: {"description": "Internal Server Error"}})
async def upload_and_process_file(file: Annotated[UploadFile, File(...)]):
    """Upload CSV, clean using Pandas, and upsert to Supabase"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV.")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Clean Data
        cleaned_df = clean_data(df)
        
        # Convert to list of dicts for Supabase insertion
        records = cleaned_df.to_dict(orient="records")
        
        # Process and calculate quality scores
        _process_and_score_records(records)
        
        # Upsert into Supabase (Requires a primary key, e.g., 'id')
        if records:
            response = supabase.table("master_data").upsert(records).execute()
            
            # Invalidate Redis cache
            try:
                redis_client.delete("master_data_cache")
            except Exception as e:
                print(f"Redis cache delete warning: {e}")
                
            return {"message": "Data processed and upserted successfully", "inserted_count": len(records), "data": response.data}
        else:
            return {"message": "No valid data to insert after cleaning."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _fetch_external_users() -> list:
    url = "https://jsonplaceholder.typicode.com/users"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch customer data from external API")
    
    users = res.json()
    records = []
    for user in users:
        records.append({
            "name": user["name"],
            "category": "Customers",
            "value": float(random.randint(10, 100) * 1000),
            "source_system": "CRM API (JSONPlaceholder)",
            "status": "Golden",
            "data_quality_score": 95 if "@" in user["email"] else 70
        })
    return records

async def _fetch_external_products() -> list:
    url = "https://dummyjson.com/products?limit=10"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch product data from external API")
    
    products_data = res.json().get("products", [])
    records = []
    for prod in products_data:
        records.append({
            "name": prod["title"],
            "category": "Products",
            "value": float(prod["price"]),
            "source_system": "ERP API (DummyJSON)",
            "status": "Golden",
            "data_quality_score": 100
        })
    return records

@app.post("/api/ingest-external", responses={400: {"description": "Invalid Domain"}, 500: {"description": "External API or Database Error"}})
async def ingest_external(domain: str):
    """Fetch data from external APIs and upsert to master_data"""
    if domain == "customers":
        records = await _fetch_external_users()
    elif domain == "products":
        records = await _fetch_external_products()
    else:
        raise HTTPException(status_code=400, detail="Unsupported domain. Use 'customers' or 'products'.")

    if records:
        try:
            supabase.table("master_data").upsert(records).execute()
            try:
                redis_client.delete("master_data_cache")
            except Exception as e:
                print(f"Redis cache delete warning: {e}")
            return {"message": f"Successfully ingested {len(records)} records for category {domain}", "count": len(records)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return {"message": "No records fetched."}


@app.get("/api/deduplicate", responses={500: {"description": "Internal Server Error"}})
async def deduplicate():
    """Scan master_data for potential duplicate records across domains"""
    from difflib import SequenceMatcher
    try:
        response = supabase.table("master_data").select("*").execute()
        records = response.data
        
        settings = get_system_settings()
        fuzzy_threshold = settings.get("fuzzy_threshold", 75) / 100.0
        
        duplicates = []
        for i in range(len(records)):
            for j in range(i + 1, len(records)):
                rec1 = records[i]
                rec2 = records[j]
                
                if rec1["category"] == rec2["category"]:
                    name1 = str(rec1.get("name", "")).lower().strip()
                    name2 = str(rec2.get("name", "")).lower().strip()
                    
                    ratio = SequenceMatcher(None, name1, name2).ratio()
                    
                    if ratio >= fuzzy_threshold or name1 in name2 or name2 in name1:
                        duplicates.append({
                             "id1": rec1["id"],
                             "name1": rec1["name"],
                             "source1": rec1.get("source_system", "Unknown"),
                             "quality1": rec1.get("data_quality_score", 100),
                             "status1": rec1.get("status", "Golden"),
                             "id2": rec2["id"],
                             "name2": rec2["name"],
                             "source2": rec2.get("source_system", "Unknown"),
                             "quality2": rec2.get("data_quality_score", 100),
                             "status2": rec2.get("status", "Golden"),
                             "category": rec1["category"],
                             "similarity": round(ratio * 100, 1)
                        })
        return duplicates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/merge", responses={404: {"description": "Record Not Found"}, 500: {"description": "Internal Server Error"}})
async def merge_records(req: MergeRequest):
    """Merge duplicate record into the primary record, removing duplicate and marking primary as Golden"""
    try:
        prim_res = supabase.table("master_data").select("*").eq("id", req.primary_id).execute()
        dup_res = supabase.table("master_data").select("*").eq("id", req.duplicate_id).execute()
        
        if not prim_res.data or not dup_res.data:
            raise HTTPException(status_code=404, detail="Primary or duplicate record not found")
        
        prim = prim_res.data[0]
        dup = dup_res.data[0]
        
        new_value = max(float(prim.get("value", 0)), float(dup.get("value", 0)))
        
        supabase.table("master_data").update({
            "value": new_value,
            "status": "Golden",
            "data_quality_score": min(100, int(prim.get("data_quality_score", 100)) + 5)
        }).eq("id", req.primary_id).execute()
        
        supabase.table("master_data").delete().eq("id", req.duplicate_id).execute()
        
        try:
            redis_client.delete("master_data_cache")
        except Exception as e:
            print(f"Redis cache delete warning: {e}")
            
        return {"message": f"Successfully merged record {req.duplicate_id} into {req.primary_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/signup", responses={400: {"description": "Signup Failed"}})
async def auth_signup(req: SignUpRequest):
    """Sign up a new user in Supabase Auth with metadata"""
    try:
        response = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {
                "data": {
                    "full_name": req.full_name,
                    "role": req.role
                }
            }
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login", responses={400: {"description": "Authentication Failed"}})
async def auth_login(req: LoginRequest):
    """Authenticate user with email and password in Supabase Auth"""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/logout", responses={400: {"description": "Logout Failed"}})
async def auth_logout():
    """Sign out user from current session in Supabase"""
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/me", responses={401: {"description": "Unauthorized"}})
async def auth_me(authorization: Annotated[Optional[str], Header()] = None):
    """Retrieve logged-in user profile using JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        return user_response
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/api/settings", response_model=SystemSettings, responses={500: {"description": "Internal Server Error"}})
async def get_settings():
    """Retrieve active system settings"""
    try:
        settings = get_system_settings()
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings", responses={400: {"description": "Validation Error"}, 500: {"description": "Internal Server Error"}})
async def update_settings(settings: SystemSettings):
    """Update system settings dynamically"""
    try:
        # Validate values
        if settings.fuzzy_threshold < 50 or settings.fuzzy_threshold > 100:
            raise HTTPException(status_code=400, detail="Fuzzy threshold must be between 50 and 100")
        if settings.golden_quality_threshold < 0 or settings.golden_quality_threshold > 100:
            raise HTTPException(status_code=400, detail="Golden record quality minimum must be between 0 and 100")
        if settings.redis_cache_ttl < 1:
            raise HTTPException(status_code=400, detail="Redis Cache TTL must be at least 1 second")

        save_system_settings(settings)
        return {"message": "Settings updated successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cache/purge", responses={500: {"description": "Internal Server Error"}})
async def purge_cache():
    """Manually clear the Redis and master data caching layers"""
    try:
        try:
            redis_client.delete("master_data_cache")
            redis_client.delete("system_settings_cache")
            # Write to audit_logs in Supabase if possible
            try:
                supabase.table("audit_logs").insert({
                    "action": "PURGE_CACHE",
                    "details": "Application and master data cache manually purged.",
                    "actor": "Administrator"
                }).execute()
            except Exception as ae:
                print(f"Failed to write purge cache to audit_logs: {ae}")
        except Exception as e:
            print(f"Redis delete cache warning: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to purge Redis cache: {e}")
            
        return {"message": "Cache purged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audit-logs")
async def get_audit_logs():
    """Retrieve audit logs from Supabase, or fall back to sample logs"""
    try:
        response = supabase.table("audit_logs").select("*").order("created_at", desc=True).limit(50).execute()
        # Sort or formatting if needed, otherwise return data
        return response.data
    except Exception as e:
        print(f"Supabase read audit_logs warning: {e}")
        # Return fallback sample audit logs
        return [
            {"id": 1, "action": "SYSTEM_INIT", "details": "MDM database schema initialized successfully.", "actor": "System", "created_at": "2026-06-10T09:00:00+07:00"},
            {"id": 2, "action": "INGEST_EXTERNAL", "details": "Ingested 10 customer records from CRM API.", "actor": "System", "created_at": "2026-06-10T12:30:00+07:00"},
            {"id": 3, "action": "MERGE_RECORDS", "details": "Merged duplicate record (id: 45) into primary (id: 12).", "actor": "Sarah Jenkins", "created_at": "2026-06-10T14:15:00+07:00"},
            {"id": 4, "action": "UPDATE_SETTINGS", "details": "Similarity threshold updated to 85%.", "actor": "Administrator", "created_at": "2026-06-10T15:45:00+07:00"}
        ]
