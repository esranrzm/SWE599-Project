import pytest
from datetime import date


class TestUserRegistration:
    
    def test_register_success(self, client, test_user_data):
        """Test successful user registration."""
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == test_user_data["username"]
        assert data["user"]["email"] == test_user_data["email"]
        assert data["user"]["name"] == test_user_data["name"]
        assert data["user"]["surname"] == test_user_data["surname"]
    
    def test_register_duplicate_username(self, client, test_user_data):
        """Test registration with duplicate username."""
        # Register first user
        client.post("/api/auth/register", json=test_user_data)
        
        # Try to register with same username
        duplicate_data = test_user_data.copy()
        duplicate_data["email"] = "different@example.com"
        response = client.post("/api/auth/register", json=duplicate_data)
        assert response.status_code == 400
        assert "username" in response.json()["detail"].lower()
    
    def test_register_duplicate_email(self, client, test_user_data):
        """Test registration with duplicate email."""
        # Register first user
        client.post("/api/auth/register", json=test_user_data)
        
        # Try to register with same email
        duplicate_data = test_user_data.copy()
        duplicate_data["username"] = "differentuser"
        response = client.post("/api/auth/register", json=duplicate_data)
        assert response.status_code == 400
        assert "email" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client, test_user_data):
        """Test registration with invalid email format."""
        invalid_data = test_user_data.copy()
        invalid_data["email"] = "notanemail"
        response = client.post("/api/auth/register", json=invalid_data)
        assert response.status_code == 422
    
    def test_register_short_password(self, client, test_user_data):
        """Test registration with password shorter than 6 characters."""
        invalid_data = test_user_data.copy()
        invalid_data["password"] = "12345"
        response = client.post("/api/auth/register", json=invalid_data)
        assert response.status_code == 422


class TestUserLogin:
    
    def test_login_success(self, client, test_user_data):
        """Test successful login."""
        # Register user first
        client.post("/api/auth/register", json=test_user_data)
        
        # Login
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == test_user_data["username"]
    
    def test_login_invalid_username(self, client):
        """Test login with non-existent username."""
        login_data = {
            "username": "nonexistent",
            "password": "password123"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()
    
    def test_login_invalid_password(self, client, test_user_data):
        """Test login with incorrect password."""
        # Register user first
        client.post("/api/auth/register", json=test_user_data)
        
        # Try to login with wrong password
        login_data = {
            "username": test_user_data["username"],
            "password": "wrongpassword"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()


class TestUserProfile:
    
    def test_get_current_user(self, client, authenticated_user):
        """Test getting current user information."""
        response = client.get("/api/auth/me", headers=authenticated_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == authenticated_user["user"]["username"]
        assert data["email"] == authenticated_user["user"]["email"]
    
    def test_get_current_user_no_token(self, client):
        """Test getting current user without token."""
        response = client.get("/api/auth/me")
        assert response.status_code == 403
    
    def test_verify_token(self, client, authenticated_user):
        """Test token verification."""
        response = client.get("/api/auth/verify-token", headers=authenticated_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["user"]["username"] == authenticated_user["user"]["username"]
    
    def test_update_profile(self, client, authenticated_user):
        """Test updating user profile."""
        update_data = {
            "username": "updateduser",
            "email": "updated@example.com",
            "name": "Updated",
            "surname": "Name",
            "profession": "Updated Profession"
        }
        response = client.put("/api/auth/me", json=update_data, headers=authenticated_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "updateduser"
        assert data["email"] == "updated@example.com"
        assert data["name"] == "Updated"
    
    def test_update_profile_duplicate_username(self, client, authenticated_user, test_user_2_data):
        """Test updating profile with duplicate username."""
        # Create second user
        client.post("/api/auth/register", json=test_user_2_data)
        
        # Try to update first user's username to second user's username
        update_data = {
            "username": test_user_2_data["username"],
            "email": authenticated_user["user"]["email"],
            "name": authenticated_user["user"]["name"],
            "surname": authenticated_user["user"]["surname"],
            "profession": authenticated_user["user"]["profession"]
        }
        response = client.put("/api/auth/me", json=update_data, headers=authenticated_user["headers"])
        assert response.status_code == 400
    
    def test_update_password(self, client, authenticated_user, test_user_data):
        """Test updating user password."""
        password_data = {
            "current_password": test_user_data["password"],
            "new_password": "newpassword123"
        }
        response = client.put("/api/auth/me/password", json=password_data, headers=authenticated_user["headers"])
        assert response.status_code == 200
        assert "successfully" in response.json()["message"].lower()
    
    def test_update_password_wrong_current(self, client, authenticated_user):
        """Test updating password with wrong current password."""
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        response = client.put("/api/auth/me/password", json=password_data, headers=authenticated_user["headers"])
        assert response.status_code == 401
    
    def test_delete_account(self, client, authenticated_user):
        """Test deleting user account."""
        response = client.delete("/api/auth/me", headers=authenticated_user["headers"])
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify user is deleted - login should fail
        login_data = {
            "username": authenticated_user["user"]["username"],
            "password": "testpass123"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401


class TestUserQueries:
    
    def test_get_all_users(self, client, authenticated_user, test_user_2_data):
        """Test getting all users (excluding current user)."""
        # Create second user
        client.post("/api/auth/register", json=test_user_2_data)
        
        response = client.get("/api/auth/users", headers=authenticated_user["headers"])
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        # Current user should not be in the list
        user_ids = [u["id"] for u in users]
        assert authenticated_user["user"]["id"] not in user_ids
    
    def test_get_users_by_name(self, client, test_user_data, test_user_2_data):
        """Test getting users by name."""
        # Register users
        client.post("/api/auth/register", json=test_user_data)
        client.post("/api/auth/register", json=test_user_2_data)
        
        # Search by first name
        response = client.get("/api/auth/users/by-name/Test")
        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
        
        # Search by full name
        response = client.get("/api/auth/users/by-name/Test User")
        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
    
    def test_get_user_by_username(self, client, test_user_data):
        """Test getting user by username."""
        # Register user
        register_response = client.post("/api/auth/register", json=test_user_data)
        user_data = register_response.json()["user"]
        
        # Get user by username
        response = client.get(f"/api/auth/users/{test_user_data['username']}")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user_data["username"]
        assert data["id"] == user_data["id"]
    
    def test_get_user_by_username_not_found(self, client):
        """Test getting non-existent user by username."""
        response = client.get("/api/auth/users/nonexistent")
        assert response.status_code == 404


class TestLogout:
    
    def test_logout_success(self, client, authenticated_user):
        """Test successful logout."""
        response = client.post("/api/auth/logout", headers=authenticated_user["headers"])
        assert response.status_code == 200
        assert response.json()["logged_out"] is True
        
        response = client.get("/api/auth/me", headers=authenticated_user["headers"])
        assert response.status_code == 401
    
    def test_logout_twice(self, client, authenticated_user):
        """Test logging out twice with same token."""
        # First logout
        response = client.post("/api/auth/logout", headers=authenticated_user["headers"])
        assert response.status_code == 200
        
        # Second logout with same token
        response = client.post("/api/auth/logout", headers=authenticated_user["headers"])
        assert response.status_code == 200
        assert "already" in response.json()["message"].lower()

