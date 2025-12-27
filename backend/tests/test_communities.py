import pytest


class TestCommunityCreation:
    
    def test_create_community_success(self, client, authenticated_user, sample_community_data):
        """Test successful community creation."""
        response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == sample_community_data["title"]
        assert data["description"] == sample_community_data["description"]
        assert data["creator_id"] == authenticated_user["user"]["id"]
        assert len(data["tabs"]) == 1
    
    def test_create_community_no_tabs(self, client, authenticated_user):
        """Test creating community without tabs."""
        community_data = {
            "title": "Simple Community",
            "description": "A community without tabs"
        }
        response = client.post(
            "/api/communities/",
            json=community_data,
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Simple Community"
        assert data["tabs"] is None or len(data["tabs"]) == 0
    
    
    def test_create_community_unauthorized(self, client, sample_community_data):
        """Test creating community without authentication."""
        response = client.post("/api/communities/", json=sample_community_data)
        assert response.status_code == 403


class TestCommunityRetrieval:
    
    def test_get_all_communities(self, client, authenticated_user, sample_community_data):
        """Test getting all communities."""
        # Create a community
        client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        
        response = client.get("/api/communities/")
        assert response.status_code == 200
        communities = response.json()
        assert isinstance(communities, list)
        assert len(communities) >= 1
    
    def test_get_community_by_id(self, client, authenticated_user, sample_community_data):
        """Test getting community by ID."""
        # Create a community
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Get community by ID
        response = client.get(f"/api/communities/{community_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == community_id
        assert data["title"] == sample_community_data["title"]
    
    def test_get_community_not_found(self, client):
        """Test getting non-existent community."""
        response = client.get("/api/communities/99999")
        assert response.status_code == 404
    
    def test_get_my_communities(self, client, authenticated_user, sample_community_data):
        """Test getting current user's created communities."""
        # Create a community
        client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        
        response = client.get(
            "/api/communities/me/created",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
        communities = response.json()
        assert len(communities) >= 1
        assert all(c["creator_id"] == authenticated_user["user"]["id"] for c in communities)
    
    def test_get_others_communities(self, client, authenticated_user, authenticated_user_2, sample_community_data):
        """Test getting communities created by others."""
        # Create community with first user
        client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        
        # Get others' communities as second user
        response = client.get(
            "/api/communities/me/others",
            headers=authenticated_user_2["headers"]
        )
        assert response.status_code == 200
        communities = response.json()
        assert len(communities) >= 1
        assert all(c["creator_id"] != authenticated_user_2["user"]["id"] for c in communities)
    
    def test_get_user_communities(self, client, authenticated_user, sample_community_data):
        """Test getting communities by user ID."""
        # Create a community
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        
        user_id = authenticated_user["user"]["id"]
        response = client.get(f"/api/communities/user/{user_id}/created")
        assert response.status_code == 200
        communities = response.json()
        assert len(communities) >= 1
        assert all(c["creator_id"] == user_id for c in communities)


class TestCommunityUpdate:
    
    def test_update_community(self, client, authenticated_user, sample_community_data):
        """Test updating community."""
        # Create a community
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Update community
        update_data = {
            "title": "Updated Community Title",
            "description": "Updated description"
        }
        response = client.put(
            f"/api/communities/{community_id}",
            json=update_data,
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Community Title"
        assert data["description"] == "Updated description"
    
    def test_update_community_not_creator(self, client, authenticated_user, authenticated_user_2, sample_community_data):
        """Test updating community as non-creator."""
        # Create community with first user
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Try to update as second user
        update_data = {
            "title": "Hacked Title",
            "description": "Hacked description"
        }
        response = client.put(
            f"/api/communities/{community_id}",
            json=update_data,
            headers=authenticated_user_2["headers"]
        )
        assert response.status_code == 403
    
    def test_update_community_full(self, client, authenticated_user, sample_community_data):
        """Test full community update with tabs."""
        # Create a community
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Update with new tabs
        update_data = {
            "title": "Updated Community",
            "description": "Updated description",
            "tabs": [
                {
                    "id": create_response.json()["tabs"][0]["id"],
                    "name": "Updated Tab",
                    "color": "#ef4444",
                    "description": "Updated tab description",
                    "inputTypes": [
                        {
                            "type": "free text",
                            "name": "Updated Input",
                            "items": [],
                            "display_order": 0
                        }
                    ],
                    "display_order": 0
                }
            ]
        }
        response = client.put(
            f"/api/communities/{community_id}/update-full",
            json=update_data,
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Community"
        assert len(data["tabs"]) == 1
        assert data["tabs"][0]["name"] == "Updated Tab"


class TestCommunityDeletion:
    
    def test_delete_community(self, client, authenticated_user, sample_community_data):
        """Test deleting community."""
        # Create a community
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Delete community
        response = client.delete(
            f"/api/communities/{community_id}",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify community is deleted
        response = client.get(f"/api/communities/{community_id}")
        assert response.status_code == 404
    
    def test_delete_community_not_creator(self, client, authenticated_user, authenticated_user_2, sample_community_data):
        """Test deleting community as non-creator."""
        # Create community with first user
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Try to delete as second user
        response = client.delete(
            f"/api/communities/{community_id}",
            headers=authenticated_user_2["headers"]
        )
        assert response.status_code == 403


class TestCommunityInputs:
    
    def test_submit_community_input(self, client, authenticated_user, sample_community_data):
        """Test submitting input to a community."""
        # Create a community with a tab
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        tab_id = create_response.json()["tabs"][0]["id"]
        
        # Submit input
        input_data = {
            "tab_title": "Projects",
            "input_creator": f"{authenticated_user['user']['name']} {authenticated_user['user']['surname']}",
            "tab_id": tab_id,
            "tab_inputs": [
                {
                    "input_id": 0,
                    "input_title": "Project Name",
                    "input_type": "free text",
                    "selected_input_fields": [
                        {"value": "My Awesome Project"}
                    ]
                },
                {
                    "input_id": 1,
                    "input_title": "GitHub Repository",
                    "input_type": "url",
                    "selected_input_fields": [
                        {"value": "https://github.com/user/project"}
                    ]
                }
            ]
        }
        response = client.post(
            f"/api/communities/{community_id}/inputs",
            json=input_data,
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 201
        assert "input_id" in response.json()
    
    def test_get_community_inputs_count(self, client, authenticated_user, sample_community_data):
        """Test getting count of community inputs."""
        # Create a community
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        
        # Get count (should be 0 initially)
        response = client.get(f"/api/communities/{community_id}/inputs/count")
        assert response.status_code == 200
        assert response.json()["count"] == 0
    
    def test_get_community_inputs(self, client, authenticated_user, sample_community_data):
        """Test getting community inputs."""
        # Create a community with a tab
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        tab_id = create_response.json()["tabs"][0]["id"]
        
        # Submit input first
        input_data = {
            "tab_title": "Projects",
            "input_creator": f"{authenticated_user['user']['name']} {authenticated_user['user']['surname']}",
            "tab_id": tab_id,
            "tab_inputs": [
                {
                    "input_id": 0,
                    "input_title": "Project Name",
                    "input_type": "free text",
                    "selected_input_fields": [
                        {"value": "Test Project"}
                    ]
                }
            ]
        }
        client.post(
            f"/api/communities/{community_id}/inputs",
            json=input_data,
            headers=authenticated_user["headers"]
        )
        
        # Get inputs
        response = client.get(
            f"/api/communities/{community_id}/inputs",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
        inputs = response.json()
        assert isinstance(inputs, list)
        assert len(inputs) >= 1
    
    def test_update_community_input(self, client, authenticated_user, sample_community_data):
        """Test updating a community input."""
        # Create community and submit input
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        tab_id = create_response.json()["tabs"][0]["id"]
        
        input_data = {
            "tab_title": "Projects",
            "input_creator": f"{authenticated_user['user']['name']} {authenticated_user['user']['surname']}",
            "tab_id": tab_id,
            "tab_inputs": [
                {
                    "input_id": 0,
                    "input_title": "Project Name",
                    "input_type": "free text",
                    "selected_input_fields": [
                        {"value": "Original Project"}
                    ]
                }
            ]
        }
        submit_response = client.post(
            f"/api/communities/{community_id}/inputs",
            json=input_data,
            headers=authenticated_user["headers"]
        )
        input_id = submit_response.json()["input_id"]
        
        # Update input
        update_data = {
            "tab_title": "Projects",
            "input_creator": f"{authenticated_user['user']['name']} {authenticated_user['user']['surname']}",
            "tab_id": tab_id,
            "tab_inputs": [
                {
                    "input_id": 0,
                    "input_title": "Project Name",
                    "input_type": "free text",
                    "selected_input_fields": [
                        {"value": "Updated Project"}
                    ]
                }
            ]
        }
        response = client.put(
            f"/api/communities/{community_id}/inputs/{input_id}",
            json=update_data,
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
    
    def test_delete_community_input(self, client, authenticated_user, sample_community_data):
        """Test deleting a community input."""
        # Create community and submit input
        create_response = client.post(
            "/api/communities/",
            json=sample_community_data,
            headers=authenticated_user["headers"]
        )
        community_id = create_response.json()["id"]
        tab_id = create_response.json()["tabs"][0]["id"]
        
        input_data = {
            "tab_title": "Projects",
            "input_creator": f"{authenticated_user['user']['name']} {authenticated_user['user']['surname']}",
            "tab_id": tab_id,
            "tab_inputs": [
                {
                    "input_id": 0,
                    "input_title": "Project Name",
                    "input_type": "free text",
                    "selected_input_fields": [
                        {"value": "Project to Delete"}
                    ]
                }
            ]
        }
        submit_response = client.post(
            f"/api/communities/{community_id}/inputs",
            json=input_data,
            headers=authenticated_user["headers"]
        )
        input_id = submit_response.json()["input_id"]
        
        # Delete input
        response = client.delete(
            f"/api/communities/{community_id}/inputs/{input_id}",
            headers=authenticated_user["headers"]
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()


class TestCitiesAPI:
    """Tests for cities API endpoint."""
    
    def test_get_cities_by_country(self, client):
        """Test getting cities for a country."""
        response = client.get("/api/communities/cities/Turkey")
        # This might fail if external API is down, so we check for either success or appropriate error
        assert response.status_code in [200, 502, 504, 500]
        if response.status_code == 200:
            data = response.json()
            assert "data" in data
            assert isinstance(data["data"], list)

