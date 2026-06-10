import os
import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()

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

class MasterDataResponse(BaseModel):
    id: Optional[int]
    name: str
    category: str
    value: float

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
    """Retrieve master data from Supabase"""
    try:
        response = supabase.table("master_data").select("*").execute()
        return response.data
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
        
        # Upsert into Supabase (Requires a primary key, e.g., 'id')
        if records:
            response = supabase.table("master_data").upsert(records).execute()
            return {"message": "Data processed and upserted successfully", "inserted_count": len(records), "data": response.data}
        else:
            return {"message": "No valid data to insert after cleaning."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
