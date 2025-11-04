import React, { useMemo, useState } from 'react';
import './AllUsers.css';
import avatarDefault from '../assets/avatar-default.svg';

const AllUsers = ({ onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in a real app, this would come from API
  const allUsers = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i + 1,
      username: `user${i + 1}`,
      name: `User ${i + 1}`,
      surname: `Surname ${i + 1}`,
      email: `user${i + 1}@example.com`,
      photo: null, // Will use default avatar
      photoPreview: '',
      profession: `Profession ${i + 1}`,
      dateOfBirth: '2000-01-01',
    }));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return allUsers;
    }

    const query = searchQuery.toLowerCase().trim();
    return allUsers.filter(user =>
      user.username.toLowerCase().includes(query) ||
      user.name.toLowerCase().includes(query) ||
      user.surname.toLowerCase().includes(query)
    );
  }, [searchQuery, allUsers]);

  return (
    <div className="all-users-page">
      <div className="all-users-content">
        <div className="all-users-header">
          <h1 className="all-users-title">ComHub Users</h1>
          
          <div className="search-section">
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search users..."
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
        </div>

        <div className="users-grid">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <button
                key={user.id}
                type="button"
                className="user-card"
                onClick={() => onSelectUser && onSelectUser(user)}
                aria-label={`View profile of ${user.username}`}
              >
                <div className="user-card-photo">
                  <img 
                    src={user.photoPreview || user.photo || avatarDefault} 
                    alt={`${user.name} ${user.surname}`}
                    className="user-photo"
                  />
                </div>
                <div className="user-card-info">
                  <h3 className="user-card-username">{user.username}</h3>
                  <p className="user-card-name">{user.name} {user.surname}</p>
                  {user.profession && (
                    <p className="user-card-profession">{user.profession}</p>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="no-results">
              <p>No users found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllUsers;

