import React, { useMemo, useState, useEffect } from 'react';
import './AllUsers.css';
import avatarDefault from '../assets/avatar-default.svg';
import { getAllUsers } from '../services/api';

const AllUsers = ({ onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const users = await getAllUsers();
        
        const mappedUsers = users.map(user => {
          let dateOfBirth = null;
          if (user.date_of_birth) {
            dateOfBirth = String(user.date_of_birth).split('T')[0];
          }
          
          return {
            id: user.id,
            username: user.username,
            name: user.name,
            surname: user.surname,
            email: user.email,
            profession: user.profession,
            dateOfBirth: dateOfBirth,
          };
        });
        
        setAllUsers(mappedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
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

  if (isLoading) {
    return (
      <div className="all-users-page">
        <div className="all-users-content">
          <div className="all-users-header">
            <h1 className="all-users-title">ComHub Users</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-users-page">
        <div className="all-users-content">
          <div className="all-users-header">
            <h1 className="all-users-title">ComHub Users</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
            <p>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

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
                    src={avatarDefault} 
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

