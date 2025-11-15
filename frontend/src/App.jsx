 import { useState, useEffect } from 'react'
import Header from './components/Header'
import Login from './components/auth/Login'
import Registration from './components/auth/Registration'
import MainScreen from './components/community/MainScreen'
import CommunityDetails from './components/community/CommunityDetails'
import CreateCommunity from './components/community/CreateCommunity'
import Profile from './components/profile/Profile';
import MyCommunities from './components/community/MyCommunities';
import AllUsers from './components/AllUsers';
import OtherUserProfile from './components/OtherUserProfile';
import avatarDefault from './assets/avatar-default.svg';
import { logoutUser, removeToken, checkSession, getToken } from './services/api';
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Loading state for session check
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [userProfile, setUserProfile] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Check for existing session on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        setIsLoading(true);
        const token = getToken();
        
        if (token) {
          // Try to restore session
          const userData = await checkSession();
          if (userData) {
            // Valid session found - restore user state
            console.log('Session restored:', userData);
            setUserProfile(userData);
            setIsLoggedIn(true);
            
            // Navigate to appropriate view based on URL
            const path = window.location.pathname;
            if (path === '/' || path === '/main') {
              setCurrentView('main');
              window.history.replaceState({ view: 'main' }, '', '/main');
            } else {
              // Let the route handler decide
              setCurrentView('main'); // Default to main if logged in
            }
          } else {
            // Invalid token - clear it and navigate to login
            console.log('No valid session found - navigating to login');
            setIsLoggedIn(false);
            setCurrentView('login');
            window.history.replaceState({ view: 'login' }, '', '/');
          }
        } else {
          // No token - navigate to login
          console.log('No auth token found - navigating to login');
          setIsLoggedIn(false);
          setCurrentView('login');
          window.history.replaceState({ view: 'login' }, '', '/');
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        setIsLoggedIn(false);
        setCurrentView('login');
        window.history.replaceState({ view: 'login' }, '', '/');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []); // Run once on mount

  // Sync URL <-> view on load and on back/forward
  useEffect(() => {
    if (isLoading) return; // Don't apply routes while checking session
    
    const applyRoute = () => {
      const path = window.location.pathname
      if (!isLoggedIn) {
        // If not logged in, always redirect to login (unless on registration)
        if (path.startsWith('/register')) {
          setCurrentView('registration')
          return
        }
        // Navigate to login page
        setCurrentView('login')
        if (path !== '/') {
          window.history.replaceState({ view: 'login' }, '', '/')
        }
        return
      }

      if (path === '/main' || path === '/') {
        setCurrentView('main')
        return
      }
      if (path.startsWith('/community/create')) {
        setCurrentView('createCommunity')
        return
      }
      if (path.startsWith('/community/')) {
        const idStr = path.replace('/community/', '')
        const id = parseInt(idStr, 10)
        // If reloading details, we do not have the data; keep placeholder
        setSelectedCommunity((prev) => prev && prev.id === id ? prev : { id, title: `Community ${id}`, description: 'No description provided.' })
        setCurrentView('communityDetails')
        return
      }
      if (path.startsWith('/register')) {
        setCurrentView('registration')
        return
      }
      if (path.startsWith('/my-communities')) {
        setCurrentView('myCommunities')
        return
      }
      if (path.startsWith('/profile')) {
        setCurrentView('profile')
        return
      }
      if (path.startsWith('/users')) {
        setCurrentView('allUsers')
        return
      }
      if (path.startsWith('/user/')) {
        const username = path.replace('/user/', '')
        setSelectedUser((prev) => {
          if (prev && prev.username === username) return prev;
          // For now, create a placeholder
          return {
            id: Math.random(),
            username: username,
            name: 'User',
            surname: 'Name',
            profession: 'Profession',
            email: `${username}@example.com`,
            dateOfBirth: '2000-01-01',
          };
        });
        setCurrentView('otherUserProfile')
        return
      }
      setCurrentView('main')
    }

    const handlePopState = () => {
      applyRoute()
    }

    applyRoute()
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isLoggedIn, isLoading])

  const handleNavigateToRegister = () => {
    setCurrentView('registration')
    window.history.pushState({ view: 'registration' }, '', '/register')
  }

  const handleNavigateToLogin = () => {
    setCurrentView('login')
    window.history.pushState({ view: 'login' }, '', '/')
  }

  const handleLogin = (userData = null) => {
    setIsLoggedIn(true)
    
    // If user data is provided from API, store it
    if (userData) {
      setUserProfile(userData)
    }
    
    setCurrentView('main')
    // Push state to history to allow back navigation
    window.history.pushState({ view: 'main' }, '', '/main')
  }

  const handleLogout = async () => {
    // Call backend logout endpoint to blacklist token
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout API error:', error);
      // Even if API call fails, proceed with frontend logout
      removeToken();
    }
    
    setIsLoggedIn(false)
    setCurrentView('login')
    setUserProfile(null)
    // Replace current history entry to prevent back navigation to main screen
    window.history.replaceState({ view: 'login' }, '', '/')
  }

  const handleOpenCommunity = (community) => {
    setSelectedCommunity(community)
    setCurrentView('communityDetails')
    window.history.pushState({ view: 'communityDetails', id: community?.id }, '', `/community/${community?.id || ''}`)
  }

  const handleCreateCommunity = () => {
    setCurrentView('createCommunity')
    window.history.pushState({ view: 'createCommunity' }, '', '/community/create')
  }

  const handleProfileRegistration = (userData) => {
    // userData comes from API response (already has user info without passwords)
    setUserProfile(userData);
    setIsLoggedIn(true)
    setCurrentView('main')
    window.history.pushState({ view: 'main' }, '', '/main')
  };

  const handleEditProfile = () => {
    setCurrentView('editProfile');
    window.history.pushState({ view: 'editProfile' }, '', '/profile/edit');
  };

  const handleSelectProfile = () => {
    setCurrentView('profile');
    window.history.pushState({view:'profile'}, '', '/profile');
  };

  const handleSelectMyCommunities = () => {
    setCurrentView('myCommunities');
    window.history.pushState({ view: 'myCommunities' }, '', '/my-communities');
  };

  const handleSaveProfile = (updated) => {
    setUserProfile(updated);
  };

  const handleSelectAllUsers = () => {
    setCurrentView('allUsers');
    window.history.pushState({ view: 'allUsers' }, '', '/users');
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setCurrentView('otherUserProfile');
    window.history.pushState({ view: 'otherUserProfile', username: user.username }, '', `/user/${user.username}`);
  };

  const renderCurrentView = () => {
    // Show loading while checking session
    if (isLoading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.1rem'
        }}>
          Loading...
        </div>
      );
    }

    switch (currentView) {
      case 'login':
        return <Login onNavigateToRegister={handleNavigateToRegister} onLogin={handleLogin} />
      case 'registration':
        return <Registration onNavigateToLogin={handleNavigateToLogin} onRegister={handleProfileRegistration} />
      case 'main':
        return <MainScreen onOpenCommunity={handleOpenCommunity} />
      case 'myCommunities':
        return <MyCommunities onOpenCommunity={handleOpenCommunity} />
      case 'profile':
        return <Profile user={userProfile} onSaveProfile={handleSaveProfile} onDeleteAccount={handleLogout} />;
      case 'communityDetails':
        return <CommunityDetails community={selectedCommunity} />
      case 'createCommunity':
        return <CreateCommunity />
      case 'allUsers':
        return <AllUsers onSelectUser={handleSelectUser} />
      case 'otherUserProfile':
        return <OtherUserProfile user={selectedUser} onOpenCommunity={handleOpenCommunity} />
      default:
        return <Login onNavigateToRegister={handleNavigateToRegister} onLogin={handleLogin} />
    }
  }

  return (
    <div className="app">
      <Header isLoggedIn={isLoggedIn} onLogout={handleLogout}
        onCreateCommunity={handleCreateCommunity}
        onSelectProfile={handleSelectProfile}
        onSelectMyCommunities={handleSelectMyCommunities}
        onSelectAllUsers={handleSelectAllUsers}
      />
      {renderCurrentView()}
    </div>
  )
}

export default App
