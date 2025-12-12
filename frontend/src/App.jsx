 import { useState, useEffect } from 'react'
import Header from './components/Header'
import Login from './components/auth/Login'
import Registration from './components/auth/Registration'
import MainScreen from './components/community/MainScreen'
import CommunityDetails from './components/community/CommunityDetails'
import CreateCommunity from './components/community/CreateCommunity'
import UpdateCommunity from './components/community/UpdateCommunity'
import Profile from './components/profile/Profile';
import MyCommunities from './components/community/MyCommunities';
import AllUsers from './components/AllUsers';
import OtherUserProfile from './components/OtherUserProfile';
import { logoutUser, removeToken, checkSession, getToken, getCommunityById } from './services/api';
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [userProfile, setUserProfile] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        setIsLoading(true);
        const token = getToken();
        
        if (token) {
          const userData = await checkSession();
          if (userData) {
            console.log('Session restored:', userData);
            setUserProfile(userData);
            setIsLoggedIn(true);
            
          } else {
            console.log('No valid session found - navigating to login');
            setIsLoggedIn(false);
            setCurrentView('login');
            window.history.replaceState({ view: 'login' }, '', '/');
          }
        } else {
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
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    const applyRoute = () => {
      const path = window.location.pathname
      if (!isLoggedIn) {
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
      if (path.startsWith('/community/') && path.includes('/update') && !path.startsWith('/community/create')) {
        const idStr = path.replace('/community/', '').replace('/update', '')
        const id = parseInt(idStr, 10)
        setCurrentView('updateCommunity')
        const fetchCommunity = async () => {
          try {
            const community = await getCommunityById(id);
            const mappedCommunity = {
              id: community.id,
              title: community.title,
              description: community.description,
              creator: community.creator_name,
              creator_id: community.creator_id,
              createdAt: community.created_at,
              updatedAt: community.updated_at,
              tabs: community.tabs || [],
            };
            setSelectedCommunity(mappedCommunity);
          } catch (err) {
            console.error('Error fetching community:', err);
            setSelectedCommunity({ id, title: `Community ${id}`, description: 'No description provided.', tabs: [] });
          }
        };
        fetchCommunity();
        return
      }
      if (path.startsWith('/community/') && !path.startsWith('/community/create')) {
        const idStr = path.replace('/community/', '')
        const id = parseInt(idStr, 10)
        setCurrentView('communityDetails')
        const fetchCommunity = async () => {
          try {
            const community = await getCommunityById(id);
            const mappedCommunity = {
              id: community.id,
              title: community.title,
              description: community.description,
              creator: community.creator_name,
              creator_id: community.creator_id,
              createdAt: community.created_at,
              updatedAt: community.updated_at,
              tabs: community.tabs || [],
            };
            setSelectedCommunity(mappedCommunity);
          } catch (err) {
            console.error('Error fetching community:', err);
            setSelectedCommunity({ id, title: `Community ${id}`, description: 'No description provided.', tabs: [] });
          }
        };
        fetchCommunity();
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
    
    if (userData) {
      setUserProfile(userData)
    }
    
    setCurrentView('main')
    window.history.pushState({ view: 'main' }, '', '/main')
  }

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout API error:', error);
      removeToken();
    }
    
    setIsLoggedIn(false)
    setCurrentView('login')
    setUserProfile(null)
    window.history.replaceState({ view: 'login' }, '', '/')
  }

  const handleOpenCommunity = (community) => {
    const fetchFullCommunity = async () => {
      if (community?.id) {
        try {
          const fullCommunity = await getCommunityById(community.id);
            const mappedCommunity = {
              id: fullCommunity.id,
              title: fullCommunity.title,
              description: fullCommunity.description,
              creator: fullCommunity.creator_name,
              creator_id: fullCommunity.creator_id,
              creator_username: fullCommunity.creator_username,
              creator_email: fullCommunity.creator_email,
              createdAt: fullCommunity.created_at,
              updatedAt: fullCommunity.updated_at,
              tabs: fullCommunity.tabs || [],
            };
          setSelectedCommunity(mappedCommunity);
        } catch (err) {
          console.error('Error fetching community:', err);
          setSelectedCommunity(community);
        }
      } else {
        setSelectedCommunity(community);
      }
    };
    
    // Only push to history if we're not already on this community's details page
    const currentPath = window.location.pathname;
    const targetPath = `/community/${community?.id || ''}`;
    
    if (currentPath !== targetPath) {
      window.history.pushState({ view: 'communityDetails', id: community?.id }, '', targetPath);
    }
    
    setCurrentView('communityDetails');
    fetchFullCommunity();
  }

  const handleCreateCommunity = () => {
    setCurrentView('createCommunity')
    window.history.pushState({ view: 'createCommunity' }, '', '/community/create')
  }

  const handleProfileRegistration = (userData) => {
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
    setSuccessMessage('Profile updated successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleDeleteAccount = async () => {
    removeToken();
    setIsLoggedIn(false);
    setCurrentView('login');
    setUserProfile(null);
    window.history.replaceState({ view: 'login' }, '', '/');
  };

  const handlePasswordUpdated = () => {
    setSuccessMessage('Password updated successfully! Please login again with your new password.');
    
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
    
    removeToken();
    setIsLoggedIn(false);
    setCurrentView('login');
    setUserProfile(null);
    window.history.replaceState({ view: 'login' }, '', '/');
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

  const handleNavigateToHome = () => {
    setCurrentView('main');
    window.history.pushState({ view: 'main' }, '', '/main');
    setSelectedCommunity(null);
  };

  const handleCommunityDeleted = (communityTitle) => {
    setSuccessMessage(`Community "${communityTitle}" has been deleted successfully.`);
    
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
    
    setCurrentView('main');
    setSelectedCommunity(null);
    window.history.pushState({ view: 'main' }, '', '/main');
  };

  const handleCommunityUpdated = (updatedCommunity) => {
    const communityWithTabs = {
      ...updatedCommunity,
      tabs: updatedCommunity.tabs || selectedCommunity?.tabs || [],
    };
    setSelectedCommunity(communityWithTabs);
    
    setSuccessMessage(`Community "${updatedCommunity.title}" has been updated successfully.`);
    
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleNavigateToUpdate = (community) => {
    setSelectedCommunity(community);
    setCurrentView('updateCommunity');
    // Push to history - browser back button will go back to community details
    window.history.pushState({ view: 'updateCommunity', id: community?.id }, '', `/community/${community?.id}/update`);
  };


  const handleUpdateSuccess = () => {
    if (selectedCommunity?.id) {
      const fetchCommunity = async () => {
        try {
          const fullCommunity = await getCommunityById(selectedCommunity.id);
          const mappedCommunity = {
            id: fullCommunity.id,
            title: fullCommunity.title,
            description: fullCommunity.description,
            creator: fullCommunity.creator_name,
            creator_id: fullCommunity.creator_id,
            creator_username: fullCommunity.creator_username,
            creator_email: fullCommunity.creator_email,
            createdAt: fullCommunity.created_at,
            updatedAt: fullCommunity.updated_at,
            tabs: fullCommunity.tabs || [],
          };
          setSelectedCommunity(mappedCommunity);
          setSuccessMessage(`Community "${mappedCommunity.title}" has been updated successfully.`);
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        } catch (err) {
          console.error('Error fetching community:', err);
        }
      };
      fetchCommunity();
    }
    setCurrentView('communityDetails');
    window.history.replaceState({ view: 'communityDetails', id: selectedCommunity?.id }, '', `/community/${selectedCommunity?.id || ''}`);
  };

  const renderCurrentView = () => {
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
        return <Profile user={userProfile} onSaveProfile={handleSaveProfile} onDeleteAccount={handleDeleteAccount} onPasswordUpdated={handlePasswordUpdated} />;
      case 'communityDetails':
        return <CommunityDetails community={selectedCommunity} currentUser={userProfile} onDeleteSuccess={handleCommunityDeleted} onCommunityUpdated={handleCommunityUpdated} onSelectUser={handleSelectUser} onNavigateToUpdate={handleNavigateToUpdate} />
      case 'updateCommunity':
        return <UpdateCommunity community={selectedCommunity} onUpdateSuccess={handleUpdateSuccess} />
      case 'createCommunity':
        return <CreateCommunity onCommunityCreated={handleOpenCommunity} />
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
        onNavigateToHome={handleNavigateToHome}
      />
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#10b981',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxWidth: '90%',
          textAlign: 'center',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {successMessage}
        </div>
      )}
      {renderCurrentView()}
    </div>
  )
}

export default App
