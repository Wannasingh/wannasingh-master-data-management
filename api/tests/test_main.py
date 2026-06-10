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

@pytest.mark.asyncio
async def test_auth_signup(mocker):
    mock_auth = mocker.MagicMock()
    mock_res = mocker.MagicMock()
    mock_res.user = {"id": "user123", "email": "test@example.com"}
    mock_auth.sign_up.return_value = mock_res
    
    mocker.patch.object(supabase, 'auth', mock_auth)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/signup", json={
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User",
            "role": "data_analyst"
        })
        
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_auth_login(mocker):
    mock_auth = mocker.MagicMock()
    mock_res = mocker.MagicMock()
    mock_res.session = {"access_token": "token123", "refresh_token": "refresh123"}
    mock_auth.sign_in_with_password.return_value = mock_res
    
    mocker.patch.object(supabase, 'auth', mock_auth)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_auth_logout(mocker):
    mock_auth = mocker.MagicMock()
    mocker.patch.object(supabase, 'auth', mock_auth)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/logout")
        
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}

@pytest.mark.asyncio
async def test_auth_me(mocker):
    mock_auth = mocker.MagicMock()
    mock_res = mocker.MagicMock()
    mock_res.user = {"id": "user123", "email": "test@example.com"}
    mock_auth.get_user.return_value = mock_res
    
    mocker.patch.object(supabase, 'auth', mock_auth)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me", headers={"Authorization": "Bearer token123"})
        
    assert response.status_code == 200

