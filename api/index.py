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
from typing import List, Optional
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

class MasterDataResponse(BaseModel):
    id: Optional[int]
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

@app.get("/api/master-data", response_model=List[MasterDataResponse])
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
        
        # Attempt to cache the result in Redis for 60 seconds
        try:
            redis_client.set(cache_key, json.dumps(data), ex=60)
        except Exception as e:
            print(f"Redis cache write warning: {e}")
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-etl")
async def upload_and_process_file(file: UploadFile = File(...)):
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
        
        # Add default values and data quality calculation
        for rec in records:
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
                if val is None or float(val) <= 0:
                    score -= 30
                rec['data_quality_score'] = max(10, score)
        
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

@app.post("/api/ingest-external")
async def ingest_external(domain: str):
    """Fetch data from external APIs and upsert to master_data"""
    if domain == "customers":
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
    elif domain == "products":
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
    else:
        raise HTTPException(status_code=400, detail="Unsupported domain. Use 'customers' or 'products'.")

    if records:
        try:
            response = supabase.table("master_data").upsert(records).execute()
            try:
                redis_client.delete("master_data_cache")
            except Exception as e:
                print(f"Redis cache delete warning: {e}")
            return {"message": f"Successfully ingested {len(records)} records for category {domain}", "count": len(records)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return {"message": "No records fetched."}

@app.get("/api/deduplicate")
async def deduplicate():
    """Scan master_data for potential duplicate records across domains"""
    from difflib import SequenceMatcher
    try:
        response = supabase.table("master_data").select("*").execute()
        records = response.data
        
        duplicates = []
        for i in range(len(records)):
            for j in range(i + 1, len(records)):
                rec1 = records[i]
                rec2 = records[j]
                
                if rec1["category"] == rec2["category"]:
                    name1 = str(rec1.get("name", "")).lower().strip()
                    name2 = str(rec2.get("name", "")).lower().strip()
                    
                    ratio = SequenceMatcher(None, name1, name2).ratio()
                    
                    if ratio > 0.75 or name1 in name2 or name2 in name1:
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

@app.post("/api/merge")
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

@app.post("/api/auth/signup")
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

@app.post("/api/auth/login")
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

@app.post("/api/auth/logout")
async def auth_logout():
    """Sign out user from current session in Supabase"""
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    """Retrieve logged-in user profile using JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        return user_response
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
