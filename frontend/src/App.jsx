 import { useState, useEffect } from 'react'
import Header from './components/Header'
import Login from './components/Login'
import Registration from './components/Registration'
import MainScreen from './components/MainScreen'
import CommunityDetails from './components/CommunityDetails'
import CreateCommunity from './components/CreateCommunity'
import Profile from './components/Profile';
import avatarDefault from './assets/avatar-default.svg';
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [userProfile, setUserProfile] = useState(null);

  // Sync URL <-> view on load and on back/forward
  useEffect(() => {
    const applyRoute = () => {
      const path = window.location.pathname
      if (!isLoggedIn) {
        // Only allow login/registration when logged out
        if (path.startsWith('/register')) {
          setCurrentView('registration')
          return
        }
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
  }, [isLoggedIn])

  const handleNavigateToRegister = () => {
    setCurrentView('registration')
    window.history.pushState({ view: 'registration' }, '', '/register')
  }

  const handleNavigateToLogin = () => {
    setCurrentView('login')
    window.history.pushState({ view: 'login' }, '', '/')
  }

  const handleLogin = () => {
    setIsLoggedIn(true)
    setCurrentView('main')
    // Push state to history to allow back navigation
    window.history.pushState({ view: 'main' }, '', '/main')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentView('login')
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

  const handleProfileRegistration = (formData) => {
    // Remove password fields from registration data before saving to userProfile
    const { password, confirmPassword, ...profileData } = formData;
    setUserProfile(profileData);
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

  const handleSaveProfile = (updated) => {
    setUserProfile(updated);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return <Login onNavigateToRegister={handleNavigateToRegister} onLogin={handleLogin} />
      case 'registration':
        return <Registration onNavigateToLogin={handleNavigateToLogin} onRegister={handleProfileRegistration} />
      case 'main':
        return <MainScreen onOpenCommunity={handleOpenCommunity} />
      case 'profile':
        return <Profile user={userProfile} onSaveProfile={handleSaveProfile} onDeleteAccount={handleLogout} />;
      case 'communityDetails':
        return <CommunityDetails community={selectedCommunity} />
      case 'createCommunity':
        return <CreateCommunity />
      default:
        return <Login onNavigateToRegister={handleNavigateToRegister} onLogin={handleLogin} />
    }
  }

  return (
    <div className="app">
      <Header isLoggedIn={isLoggedIn} onLogout={handleLogout}
        onCreateCommunity={handleCreateCommunity}
        onSelectProfile={handleSelectProfile}
      />
      {renderCurrentView()}
    </div>
  )
}

export default App
