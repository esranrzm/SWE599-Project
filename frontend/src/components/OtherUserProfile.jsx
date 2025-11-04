import React, { useMemo, useState } from 'react';
import avatarDefault from '../assets/avatar-default.svg';
import './OtherUserProfile.css';

const OtherUserProfile = ({ user, onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return <div className="other-user-profile-page"><div className="profile-card">No user found.</div></div>;
  
  const { photo, photoPreview, email, name, surname, username, profession, dateOfBirth } = user;

  let displayPhoto = photoPreview;
  if (!displayPhoto && typeof photo === 'string' && photo.startsWith('data:')) displayPhoto = photo;
  if (!displayPhoto) displayPhoto = avatarDefault;

  // Mock user's communities data
  const userCommunities = useMemo(() => {
    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris pharetra, sem eget bibendum congue, neque orci porttitor nunc, vitae feugiat velit neque sit amet arcu. ';
    
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      title: `${user.username}'s Community ${i + 1}`,
      description: lorem.repeat((i % 3) + 2),
    }));
  }, [user.username]);

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
                <p>No communities found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtherUserProfile;

