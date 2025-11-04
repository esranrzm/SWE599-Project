import React, { useMemo, useState } from 'react';
import './MyCommunities.css';

const MyCommunities = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all'); // 'created', 'contributed', 'all'

  // Mock data - in a real app, this would come from API/state
  const allCards = useMemo(() => {
    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris pharetra, sem eget bibendum congue, neque orci porttitor nunc, vitae feugiat velit neque sit amet arcu. Integer laoreet, purus a tempor pulvinar, arcu eros lacinia massa, non interdum libero nibh eu risus. ';
    
    const created = Array.from({ length: 5 }).map((_, i) => ({
      id: `created-${i + 1}`,
      title: `My Community ${i + 1}`,
      description: lorem.repeat(((i % 3) + 1)),
      type: 'created'
    }));

    const contributed = Array.from({ length: 8 }).map((_, i) => ({
      id: `contributed-${i + 1}`,
      title: `Contributed Community ${i + 1}`,
      description: lorem.repeat(((i % 3) + 1)),
      type: 'contributed'
    }));

    return { created, contributed };
  }, []);

  const filteredCards = useMemo(() => {
    let cardsToShow = [];
    
    if (activeSection === 'created') {
      cardsToShow = allCards.created;
    } else if (activeSection === 'contributed') {
      cardsToShow = allCards.contributed;
    } else {
      cardsToShow = [...allCards.created, ...allCards.contributed];
    }

    if (!searchQuery.trim()) {
      return cardsToShow;
    }

    const query = searchQuery.toLowerCase().trim();
    return cardsToShow.filter(card => 
      card.title.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query)
    );
  }, [activeSection, searchQuery, allCards]);

  const truncate = (text, max) => (text.length > max ? text.slice(0, max) + '…' : text);

  return (
    <div className="my-communities-page">
      <div className="my-communities-content">
        <div className="my-communities-header">
          <h1 className="my-communities-title">My Communities</h1>
          
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

          <div className="section-tabs">
            <button
              type="button"
              className={`section-tab ${activeSection === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSection('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`section-tab ${activeSection === 'created' ? 'active' : ''}`}
              onClick={() => setActiveSection('created')}
            >
              Created by Me
            </button>
            <button
              type="button"
              className={`section-tab ${activeSection === 'contributed' ? 'active' : ''}`}
              onClick={() => setActiveSection('contributed')}
            >
              Contributed
            </button>
          </div>
        </div>

        <div className="communities-cards">
          {filteredCards.length > 0 ? (
            filteredCards.map(card => (
              <button
                key={card.id}
                type="button"
                className="community-card card-button"
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

export default MyCommunities;

