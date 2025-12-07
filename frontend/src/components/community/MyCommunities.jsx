import React, { useMemo, useState, useEffect } from 'react';
import './MyCommunities.css';
import { getAllCommunities, getMyCommunities } from '../../services/api';

const MyCommunities = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [allCommunities, setAllCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      setIsLoading(true);
      setError(null);

      try {

        const [allData, myData] = await Promise.all([
          getAllCommunities(),
          getMyCommunities()
        ]);

        const mapCommunity = (community) => ({
          id: community.id,
          title: community.title,
          description: community.description,
          creator: community.creator_name,
          creator_id: community.creator_id,
          createdAt: community.created_at,
          updatedAt: community.updated_at,
        });

        setAllCommunities(allData.map(mapCommunity));
        setMyCommunities(myData.map(mapCommunity));
      } catch (err) {
        console.error('Error fetching communities:', err);
        setError(err.message || 'Failed to load communities. Please try again.');
        setAllCommunities([]);
        setMyCommunities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const filteredCards = useMemo(() => {
    let cardsToShow = [];
    
    if (activeSection === 'created') {
      cardsToShow = myCommunities;
    } else if (activeSection === 'contributed') {
      cardsToShow = [];
    } else {
      cardsToShow = allCommunities;
    }

    if (!searchQuery.trim()) {
      return cardsToShow;
    }

    const query = searchQuery.toLowerCase().trim();
    return cardsToShow.filter(card => 
      card.title.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query)
    );
  }, [activeSection, searchQuery, allCommunities, myCommunities]);

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
                <p>
                  {activeSection === 'contributed' 
                    ? 'Contributed section will be available once community inputs are implemented.' 
                    : `No communities found${searchQuery.trim() ? ' matching your search' : activeSection === 'created' ? ' created by you' : ''}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCommunities;

