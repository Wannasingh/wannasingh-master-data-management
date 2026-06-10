import pytest
import pandas as pd
from httpx import AsyncClient, ASGITransport
from api.index import app, clean_data, supabase

# Test Pandas ETL logic
def test_clean_data():
    # Mock dirty DataFrame
    data = {
        'name': ['  Product A  ', 'Product B', 'Product A  ', None],
        'category': ['  Category 1', 'Category 2', 'Category 1', None],
        'value': [10.5, 20.0, 10.5, None]
    }
    df = pd.DataFrame(data)
    
    cleaned_df = clean_data(df)
    
    # Assert duplicates removed
    assert len(cleaned_df) == 2
    
    # Assert whitespaces trimmed
    assert cleaned_df.iloc[0]['name'] == 'Product A'
    assert cleaned_df.iloc[0]['category'] == 'Category 1'
    
    # Assert empty rows dropped
    assert cleaned_df['name'].notna().all()

# Test FastAPI Endpoints using httpx.AsyncClient
@pytest.mark.asyncio
async def test_get_master_data(mocker):
    # Mocking supabase client response
    mock_response = mocker.MagicMock()
    mock_response.data = [
        {"id": 1, "name": "Test Product", "category": "Cat 1", "value": 100.0}
    ]
    
    mock_table = mocker.MagicMock()
    mock_select = mocker.MagicMock()
    mock_table.select.return_value = mock_select
    mock_select.execute.return_value = mock_response
    
    mocker.patch.object(supabase, 'table', return_value=mock_table)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/master-data")
        
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Test Product", "category": "Cat 1", "value": 100.0}]

@pytest.mark.asyncio
async def test_upload_invalid_file_format():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/upload-etl", files={"file": ("test.txt", b"dummy content", "text/plain")})
        
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid file format. Please upload a CSV."
