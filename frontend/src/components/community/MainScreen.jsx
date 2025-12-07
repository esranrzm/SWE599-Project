import React, { useMemo, useState, useEffect } from 'react';
import './MainScreen.css';
import { getAllCommunities } from '../../services/api';

const MainScreen = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCards, setAllCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const communities = await getAllCommunities();
        
        const mappedCommunities = communities.map(community => ({
          id: community.id,
          title: community.title,
          description: community.description,
          creator: community.creator_name,
          creator_id: community.creator_id,
          createdAt: community.created_at,
          updatedAt: community.updated_at,
        }));
        
        setAllCards(mappedCommunities);
      } catch (err) {
        console.error('Error fetching communities:', err);
        setError(err.message || 'Failed to load communities. Please try again.');
        setAllCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCards;
    }

    const query = searchQuery.toLowerCase().trim();
    return allCards.filter(card =>
      card.title.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query)
    );
  }, [searchQuery, allCards]);

  const truncate = (text, max) => (text.length > max ? text.slice(0, max) + '…' : text);

  return (
    <div className="main-screen">
      <div className="main-content">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome to My App</h1>
          <p className="welcome-subtitle">
            You have successfully logged in! This is your main dashboard.
          </p>
        </div>

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
        
        {error && (
          <div className="error-message" style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading-message" style={{
            padding: '40px',
            textAlign: 'center',
            fontSize: '1.1rem',
            color: '#666'
          }}>
            Loading communities...
          </div>
        ) : (
          <div className="dashboard-cards">
            {filteredCards.length > 0 ? (
              filteredCards.map(card => (
                <button
                  key={card.id}
                  type="button"
                  className="dashboard-card card-button"
                  onClick={() => {
                    console.log(card.title);
                    onOpenCommunity && onOpenCommunity(card);
                  }}
                  aria-label={`Open ${card.title}`}
                >
                  <h3>{card.title}</h3>
                  <p>{truncate(card.description, 200)}</p>
                </button>
              ))
            ) : (
              <div className="no-results">
                <p>No communities found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainScreen;

