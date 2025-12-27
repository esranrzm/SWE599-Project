import pytest


class TestAdminStats:
    
    def test_get_admin_stats(self, client, authenticated_admin):
        """Test getting admin statistics."""
        response = client.get(
            "/api/admin/stats",
            headers=authenticated_admin["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_communities" in data
        assert "total_users" in data
        assert "total_tabs" in data
        assert isinstance(data["total_communities"], int)
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_tabs"], int)
    
    def test_get_admin_stats_non_admin(self, client, authenticated_user):
        """Test getting admin stats as non-admin user."""
        response = client.get(
            "/api/admin/stats",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 403


class TestAdminUsers:
    
    def test_get_all_users_admin(self, client, authenticated_admin, test_user_data):
        """Test getting all users as admin."""
        # Create a test user
        client.post("/api/auth/register", json=test_user_data)
        
        response = client.get(
            "/api/admin/users",
            headers=authenticated_admin["headers"]
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 1
    
    def test_get_all_users_admin_non_admin(self, client, authenticated_user):
        """Test getting all users as non-admin."""
        response = client.get(
            "/api/admin/users",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 403
    
    def test_delete_user_admin(self, client, authenticated_admin, test_user_data):
        """Test deleting a user as admin."""
        # Create a test user
        register_response = client.post("/api/auth/register", json=test_user_data)
        user_id = register_response.json()["user"]["id"]
        
        # Delete user as admin
        response = client.delete(
            f"/api/admin/users/{user_id}",
            headers=authenticated_admin["headers"]
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify user is deleted - login should fail
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
    
    def test_delete_user_admin_self(self, client, authenticated_admin):
        """Test admin trying to delete their own account."""
        admin_id = authenticated_admin["user"]["id"]
        response = client.delete(
            f"/api/admin/users/{admin_id}",
            headers=authenticated_admin["headers"]
        )
        assert response.status_code == 400
        assert "own account" in response.json()["detail"].lower()
    
    def test_delete_user_admin_non_admin(self, client, authenticated_user, test_user_2_data):
        """Test deleting user as non-admin."""
        # Create a test user
        register_response = client.post("/api/auth/register", json=test_user_2_data)
        user_id = register_response.json()["user"]["id"]
        
        # Try to delete as non-admin
        response = client.delete(
            f"/api/admin/users/{user_id}",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 403


class TestAdminCommunities:
    
    def test_get_all_communities_admin(self, client, authenticated_admin, authenticated_user, sample_community_data):
        """Test getting all communities as admin."""
        # Create a community
        client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        
        response = client.get(
            "/api/admin/communities",
            headers=authenticated_admin["headers"]
        )
        assert response.status_code == 200
        communities = response.json()
        assert isinstance(communities, list)
        assert len(communities) >= 1
    
    def test_get_all_communities_admin_non_admin(self, client, authenticated_user):
        """Test getting all communities as non-admin."""
        response = client.get(
            "/api/admin/communities",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 403


class TestAdminTabs:
    
    def test_get_all_tabs_admin(self, client, authenticated_admin, authenticated_user, sample_community_data):
        """Test getting all tabs as admin."""
        # Create a community with tabs
        client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        
        response = client.get(
            "/api/admin/tabs",
            headers=authenticated_admin["headers"]
        )
        assert response.status_code == 200
        tabs = response.json()
        assert isinstance(tabs, list)
        assert len(tabs) >= 1
        assert "id" in tabs[0]
        assert "name" in tabs[0]
        assert "community_id" in tabs[0]
        assert "input_count" in tabs[0]
    
    def test_get_all_tabs_admin_non_admin(self, client, authenticated_user):
        """Test getting all tabs as non-admin."""
        response = client.get(
            "/api/admin/tabs",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 403

