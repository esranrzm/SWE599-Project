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
    const communities = [
      {
        title: `${user.username} • Youth Coding Lab`,
        description:
          'Weekly after-school program at Çankaya Science Center where volunteers help teens build dashboards for the Ankara Marathon charity drive.',
      },
      {
        title: `${user.username} • Open Streets Ankara`,
        description:
          'Coordinates Sunday bike rides with Ankara Metropolitan Municipality and introduced traffic-calming pop-ups along Tunalı Hilmi in April 2025.',
      },
      {
        title: `${user.username} • Refugee Language Exchange`,
        description:
          'Matches Turkish and Syrian neighbors for conversation hours, collecting 600 vocabulary cards published online for newcomers.',
      },
      {
        title: `${user.username} • Sustainable Campus Forum`,
        description:
          'Brings together student clubs tracking energy use and secured a grant to retrofit dormitory lighting with smart sensors in autumn 2024.',
      },
      {
        title: `${user.username} • Community Science Nights`,
        description:
          'Hosts hands-on experiments in local libraries and partnered with TED University physics faculty to demo low-cost lab kits.',
      },
      {
        title: `${user.username} • Inclusive Design Roundtable`,
        description:
          'Runs quarterly critiques for accessibility advocates and produced a shared checklist now adopted by three Ankara NGOs.',
      },
      {
        title: `${user.username} • Civic Data Commons`,
        description:
          'Maintains open datasets on public transit punctuality while volunteers built dashboards highlighting late-night service gaps after citizen feedback.',
      },
      {
        title: `${user.username} • Tech for Heritage Labs`,
        description:
          'Digitizes historical archives with 3D scanning weekends and collaborated with the Museum of Anatolian Civilizations on a virtual exhibit.',
      },
    ];

    return communities.map((community, index) => ({
      id: index + 1,
      ...community,
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

