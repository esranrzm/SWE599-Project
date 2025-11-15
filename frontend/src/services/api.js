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
      consent: userData.consent,
      photo: userData.photo ? userData.photo : null
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


