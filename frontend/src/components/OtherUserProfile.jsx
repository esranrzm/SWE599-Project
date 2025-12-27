import React, { useMemo, useState, useEffect } from 'react';
import avatarDefault from '../assets/avatar-default.svg';
import './OtherUserProfile.css';
import { getUserByUsername, getUserCommunities } from '../services/api';

const OtherUserProfile = ({ user, onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userData, setUserData] = useState(null);
  const [userCommunities, setUserCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !user.username) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch user details
        const fetchedUser = await getUserByUsername(user.username);
        setUserData(fetchedUser);

        // Fetch user's communities
        const communities = await getUserCommunities(fetchedUser.id);
        
        // Map communities to match expected format
        const mappedCommunities = communities.map(community => ({
          id: community.id,
          title: community.title,
          description: community.description,
          creator_id: community.creator_id,
          creator_name: community.creator_name,
          createdAt: community.created_at,
          updatedAt: community.updated_at,
          tabs: community.tabs || [],
        }));

        setUserCommunities(mappedCommunities);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user?.username]);

  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) {
      return userCommunities;
    }

    const query = searchQuery.toLowerCase().trim();
    return userCommunities.filter(community =>
      community.title.toLowerCase().includes(query) ||
      community.description.toLowerCase().includes(query)
    );
  }, [searchQuery, userCommunities]);

  const truncate = (text, max) => (text.length > max ? text.slice(0, max) + '…' : text);

  if (isLoading) {
    return (
      <div className="other-user-profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading user profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="other-user-profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
              <p>{error || 'No user found.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { email, name, surname, username, profession, dateOfBirth } = userData;
  const displayPhoto = avatarDefault;

  return (
    <div className="other-user-profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-photo-box">
            <img src={displayPhoto} alt="Profile" className="profile-photo" />
          </div>
          <div className="profile-details">
            <div className="profile-row"><b>Full Name:</b> {name} {surname}</div>
            <div className="profile-row"><b>Email:</b>&nbsp;{email}</div>
            <div className="profile-row"><b>Username:</b>&nbsp;{username}</div>
            <div className="profile-row"><b>Profession:</b>&nbsp;{profession}</div>
            <div className="profile-row"><b>Date of Birth:</b>&nbsp;{dateOfBirth}</div>
          </div>
        </div>

        <div className="user-communities-section">
          <h2 className="section-title">Communities Created by {username}</h2>
          
          <div className="search-section">
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
            </div>
          </div>

          <div className="communities-grid">
            {filteredCommunities.length > 0 ? (
              filteredCommunities.map(community => (
                <button
                  key={community.id}
                  type="button"
                  className="community-card card-button"
                  onClick={() => onOpenCommunity && onOpenCommunity(community)}
                  aria-label={`Open ${community.title}`}
                >
                  <h3>{community.title}</h3>
                  <p>{truncate(community.description, 200)}</p>
                </button>
              ))
            ) : (
              <div className="no-results">
                <p>{userCommunities.length === 0 ? 'This user has not created any communities yet.' : 'No communities found matching your search.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtherUserProfile;

