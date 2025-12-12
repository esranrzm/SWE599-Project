const API_BASE_URL = 'http://localhost:8089/api';


export const registerUser = async (userData) => {
  try {
    const apiData = {
      email: userData.email,
      name: userData.name,
      surname: userData.surname,
      username: userData.username,
      password: userData.password,
      profession: userData.profession,
      dateOfBirth: userData.dateOfBirth,
      consent: userData.consent
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


export const storeToken = (token) => {
  localStorage.setItem('access_token', token);
};


export const getToken = () => {
  return localStorage.getItem('access_token');
};


export const removeToken = () => {
  localStorage.removeItem('access_token');
};


export const isAuthenticated = () => {
  return !!getToken();
};


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
      if (response.status === 401) {
        removeToken();
      }
      throw new Error(data.detail || 'Failed to fetch user information');
    }

    let dateOfBirth = null;
    if (data.date_of_birth) {
      dateOfBirth = String(data.date_of_birth).split('T')[0];
    }
    
    console.log('API Response - date_of_birth:', data.date_of_birth, 'mapped to:', dateOfBirth);
    
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
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};


export const checkSession = async () => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const userData = await getCurrentUser();
    return userData;
  } catch (error) {
    console.log('Session check failed:', error.message);
    removeToken();
    return null;
  }
};


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
        photo_url: null
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update profile');
    }

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


export const logoutUser = async () => {
  try {
    const token = getToken();
    
    if (!token) {
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

    removeToken();

    if (response.ok || response.status === 401) {
      return data;
    }

    return { message: 'Logged out from frontend', logged_out: true };
  } catch (error) {
    console.error('Logout error:', error);
    removeToken();
    return { message: 'Logged out from frontend', logged_out: true };
  }
};


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

export const updateCommunityWithTabs = async (communityId, communityData) => {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/communities/${communityId}/update-full`, {
      method: 'PUT',
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
      throw new Error(data.detail || 'Failed to update community');
    }

    return data;
  } catch (error) {
    console.error('Update community with tabs error:', error);
    throw error;
  }
};


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


export const getCommunityInputsCount = async (communityId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/communities/${communityId}/inputs/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch community inputs count');
    }

    return data.count || 0;
  } catch (error) {
    console.error('Get community inputs count error:', error);
    throw error;
  }
};


export const getAllUsers = async (options = {}) => {
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
    const url = `${API_BASE_URL}/auth/users${queryString ? `?${queryString}` : ''}`;
    
    console.log('Fetching users from:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          removeToken();
        }
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch users' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Users fetched successfully:', data.length);
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};


export const getUserByUsername = async (username) => {
  try {
    const url = `${API_BASE_URL}/auth/users/${encodeURIComponent(username)}`;
    console.log('Fetching user from:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch user' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let dateOfBirth = null;
      if (data.date_of_birth) {
        dateOfBirth = String(data.date_of_birth).split('T')[0];
      }

      console.log('User fetched successfully:', data.username);
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
        createdAt: data.created_at
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Get user by username error:', error);
    throw error;
  }
};


export const getUsersByName = async (name) => {
  try {
    const url = `${API_BASE_URL}/auth/users/by-name/${encodeURIComponent(name)}`;
    console.log('Searching users by name:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to search users' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Users found by name:', data.length);
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Get users by name error:', error);
    throw error;
  }
};


export const getUserCommunities = async (userId, options = {}) => {
  try {
    const { skip = 0, limit = 100 } = options;
    const queryParams = new URLSearchParams();
    if (skip > 0) queryParams.append('skip', skip);
    if (limit !== 100) queryParams.append('limit', limit);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/communities/user/${userId}/created${queryString ? `?${queryString}` : ''}`;
    
    console.log('Fetching user communities from:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch user communities' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('User communities fetched successfully:', data.length);
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Get user communities error:', error);
    throw error;
  }
};


// Admin API functions
export const getAdminStats = async () => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch admin stats');
    }

    return data;
  } catch (error) {
    console.error('Get admin stats error:', error);
    throw error;
  }
};

export const getAllCommunitiesAdmin = async () => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/admin/communities`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch communities');
    }

    return data;
  } catch (error) {
    console.error('Get all communities admin error:', error);
    throw error;
  }
};

export const getAllUsersAdmin = async () => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch users');
    }

    return data;
  } catch (error) {
    console.error('Get all users admin error:', error);
    throw error;
  }
};

export const deleteUserAdmin = async (userId) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to delete user');
    }

    return data;
  } catch (error) {
    console.error('Delete user admin error:', error);
    throw error;
  }
};

export const getAllTabsAdmin = async () => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/admin/tabs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch tabs');
    }

    return data;
  } catch (error) {
    console.error('Get all tabs admin error:', error);
    throw error;
  }
};


