import React, { useMemo, useState } from 'react';
import './MainScreen.css';

const MainScreen = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const allCards = useMemo(() => {
    const lorem =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris pharetra, sem eget bibendum congue, neque orci porttitor nunc, vitae feugiat velit neque sit amet arcu. Integer laoreet, purus a tempor pulvinar, arcu eros lacinia massa, non interdum libero nibh eu risus. ';
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i + 1,
      title: `Community ${i + 1}`,
      description: lorem.repeat(((i % 3) + 1)),
    }));
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
      </div>
    </div>
  );
};

export default MainScreen;

