/**
 * API service for backend communication
 */

const API_BASE_URL = 'http://localhost:8089/api';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Response with token and user data
 */
export const registerUser = async (userData) => {
  try {
    // Prepare data for API (convert camelCase to snake_case where needed)
    const apiData = {
      email: userData.email,
      name: userData.name,
      surname: userData.surname,
      username: userData.username,
      password: userData.password,
      profession: userData.profession,
      dateOfBirth: userData.dateOfBirth, // Frontend uses camelCase
      consent: userData.consent
      // photo field removed - using default avatar instead
    };

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Login a user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Response with token and user data
 */
export const loginUser = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Store authentication token in localStorage
 * @param {string} token - JWT token
 */
export const storeToken = (token) => {
  localStorage.setItem('access_token', token);
};

/**
 * Get authentication token from localStorage
 * @returns {string|null} Token or null
 */
export const getToken = () => {
  return localStorage.getItem('access_token');
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem('access_token');
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Get current authenticated user information
 * @returns {Promise<Object>} User data
 */
export const getCurrentUser = async () => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // If token is invalid, remove it
      if (response.status === 401) {
        removeToken();
      }
      throw new Error(data.detail || 'Failed to fetch user information');
    }

    // Map backend snake_case to frontend camelCase
    // Handle date_of_birth - ensure it's properly formatted
    let dateOfBirth = null;
    if (data.date_of_birth) {
      // FastAPI/Pydantic serializes Python date to YYYY-MM-DD string
      // Just use it directly as it's already in the correct format
      dateOfBirth = String(data.date_of_birth).split('T')[0]; // Extract date part if datetime
    }
    
    console.log('API Response - date_of_birth:', data.date_of_birth, 'mapped to:', dateOfBirth); // Debug
    
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      name: data.name,
      surname: data.surname,
      profession: data.profession,
      dateOfBirth: dateOfBirth, // Convert snake_case to camelCase
      photoUrl: data.photo_url,
      photo: data.photo_url, // For compatibility
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

/**
 * Check if user has a valid session by verifying the token
 * @returns {Promise<Object|null>} User data if valid, null otherwise
 */
export const checkSession = async () => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    // Try to get current user - this will verify the token is valid
    const userData = await getCurrentUser();
    return userData;
  } catch (error) {
    // Token is invalid or expired
    console.log('Session check failed:', error.message);
    removeToken();
    return null;
  }
};

/**
 * Update the current user's profile
 * @param {Object} userData - Updated user data (email, name, surname, username, profession, photo_url)
 * @returns {Promise<Object>} Updated user data
 */
export const updateUser = async (userData) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        surname: userData.surname,
        username: userData.username,
        profession: userData.profession,
        photo_url: null // Profile picture feature removed - always use default avatar
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update profile');
    }

    // Map backend response to frontend format
    let dateOfBirth = null;
    if (data.date_of_birth) {
      dateOfBirth = String(data.date_of_birth).split('T')[0];
    }

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      name: data.name,
      surname: data.surname,
      profession: data.profession,
      dateOfBirth: dateOfBirth,
      photoUrl: data.photo_url,
      photo: data.photo_url,
      photo_url: data.photo_url,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
};

/**
 * Update the current user's password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update password');
    }

    return data;
  } catch (error) {
    console.error('Update password error:', error);
    throw error;
  }
};

/**
 * Delete the current user's account
 * @returns {Promise<Object>} Success message
 */
export const deleteUser = async () => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to delete account');
    }

    return data;
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
};

/**
 * Logout the current user
 * Blacklists the token on the backend
 * @returns {Promise<Object>} Response from logout endpoint
 */
export const logoutUser = async () => {
  try {
    const token = getToken();
    
    if (!token) {
      // No token to logout, just remove from localStorage
      removeToken();
      return { message: 'Already logged out', logged_out: true };
    }

    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    // Remove token from localStorage regardless of response
    removeToken();

    // If logout was successful or already logged out
    if (response.ok || response.status === 401) {
      return data;
    }

    // If there was an error, still remove token from frontend
    return { message: 'Logged out from frontend', logged_out: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Even if API call fails, remove token from frontend
    removeToken();
    return { message: 'Logged out from frontend', logged_out: true };
  }
};

/**
 * Create a new community
 * @param {Object} communityData - Community data (title, description)
 * @returns {Promise<Object>} Created community data
 */
export const createCommunity = async (communityData) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/communities/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: communityData.title,
        description: communityData.description,
        tabs: communityData.tabs || null
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to create community');
    }

    return data;
  } catch (error) {
    console.error('Create community error:', error);
    throw error;
  }
};

/**
 * Get all communities with optional pagination
 * @param {Object} options - Pagination options (skip, limit)
 * @returns {Promise<Array>} Array of communities
 */
export const getAllCommunities = async (options = {}) => {
  try {
    const { skip = 0, limit = 100 } = options;
    const queryParams = new URLSearchParams();
    if (skip > 0) queryParams.append('skip', skip);
    if (limit !== 100) queryParams.append('limit', limit);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/communities/${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch communities');
    }

    return data;
  } catch (error) {
    console.error('Get all communities error:', error);
    throw error;
  }
};

/**
 * Get communities created by the current user
 * @param {Object} options - Pagination options (skip, limit)
 * @returns {Promise<Array>} Array of communities created by current user
 */
export const getMyCommunities = async (options = {}) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const { skip = 0, limit = 100 } = options;
    const queryParams = new URLSearchParams();
    if (skip > 0) queryParams.append('skip', skip);
    if (limit !== 100) queryParams.append('limit', limit);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/communities/me/created${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch your communities');
    }

    return data;
  } catch (error) {
    console.error('Get my communities error:', error);
    throw error;
  }
};

/**
 * Get communities created by other users
 * @param {Object} options - Pagination options (skip, limit)
 * @returns {Promise<Array>} Array of communities created by other users
 */
export const getOthersCommunities = async (options = {}) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const { skip = 0, limit = 100 } = options;
    const queryParams = new URLSearchParams();
    if (skip > 0) queryParams.append('skip', skip);
    if (limit !== 100) queryParams.append('limit', limit);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/communities/me/others${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch others\' communities');
    }

    return data;
  } catch (error) {
    console.error('Get others communities error:', error);
    throw error;
  }
};

/**
 * Get a community by ID
 * @param {number} communityId - Community ID
 * @returns {Promise<Object>} Community data
 */
export const getCommunityById = async (communityId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch community');
    }

    return data;
  } catch (error) {
    console.error('Get community by ID error:', error);
    throw error;
  }
};

/**
 * Update a community by ID
 * @param {number} communityId - Community ID
 * @param {Object} communityData - Updated community data (title, description)
 * @returns {Promise<Object>} Updated community data
 */
export const updateCommunity = async (communityId, communityData) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: communityData.title,
        description: communityData.description
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update community');
    }

    return data;
  } catch (error) {
    console.error('Update community error:', error);
    throw error;
  }
};

/**
 * Delete a community by ID
 * @param {number} communityId - Community ID
 * @returns {Promise<Object>} Success message
 */
export const getCommunityInputs = async (communityId, tabId = null) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    let url = `${API_BASE_URL}/communities/${communityId}/inputs`;
    if (tabId !== null) {
      url += `?tab_id=${tabId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch community inputs');
    }

    return data;
  } catch (error) {
    console.error('Get community inputs error:', error);
    throw error;
  }
};

export const updateCommunityInput = async (communityId, inputId, inputData) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/communities/${communityId}/inputs/${inputId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(inputData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update community input');
    }

    return data;
  } catch (error) {
    console.error('Update community input error:', error);
    throw error;
  }
};

export const submitCommunityInput = async (communityId, inputData) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/communities/${communityId}/inputs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(inputData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to submit community input');
    }

    return data;
  } catch (error) {
    console.error('Submit community input error:', error);
    throw error;
  }
};

export const deleteCommunityInput = async (communityId, inputId) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/communities/${communityId}/inputs/${inputId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to delete community input');
    }

    return data;
  } catch (error) {
    console.error('Delete community input error:', error);
    throw error;
  }
};

export const deleteCommunity = async (communityId) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to delete community');
    }

    return data;
  } catch (error) {
    console.error('Delete community error:', error);
    throw error;
  }
};


