import React, { useMemo, useState, useEffect } from 'react';
import './MainScreen.css';
import { getAllCommunities, getCommunityInputs } from '../../services/api';
import { getToken } from '../../services/api';

const MainScreen = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCards, setAllCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputCreatorsCache, setInputCreatorsCache] = useState({}); // Cache: { communityId: [creator names/usernames] }
  const [loadingInputCreators, setLoadingInputCreators] = useState(new Set());

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
          creator_username: community.creator_username || '',
          creator_id: community.creator_id,
          tabs: community.tabs || [],
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

  // Fetch input creators for a community
  const fetchInputCreators = async (communityId) => {
    // Skip if already cached or currently loading
    if (inputCreatorsCache[communityId] || loadingInputCreators.has(communityId)) {
      return;
    }

    // Check if user is authenticated (inputs require auth)
    const token = getToken();
    if (!token) {
      return;
    }

    setLoadingInputCreators(prev => new Set(prev).add(communityId));

    try {
      const inputs = await getCommunityInputs(communityId);
      // Extract unique creator names and usernames
      const creators = new Set();
      inputs.forEach(input => {
        if (input.creator_name) {
          creators.add(input.creator_name.toLowerCase());
        }
        if (input.creator_username) {
          creators.add(input.creator_username.toLowerCase());
        }
      });
      
      setInputCreatorsCache(prev => ({
        ...prev,
        [communityId]: Array.from(creators)
      }));
    } catch (err) {
      console.error(`Error fetching input creators for community ${communityId}:`, err);
      // Cache empty array to avoid retrying
      setInputCreatorsCache(prev => ({
        ...prev,
        [communityId]: []
      }));
    } finally {
      setLoadingInputCreators(prev => {
        const newSet = new Set(prev);
        newSet.delete(communityId);
        return newSet;
      });
    }
  };

  // Fetch input creators for all communities when search query changes
  useEffect(() => {
    if (searchQuery.trim() && allCards.length > 0) {
      // Fetch input creators for all communities that haven't been fetched yet
      allCards.forEach(card => {
        if (!inputCreatorsCache[card.id] && !loadingInputCreators.has(card.id)) {
          fetchInputCreators(card.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]); // Only fetch when search query changes

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCards;
    }

    const query = searchQuery.toLowerCase().trim();
    return allCards.filter(card => {
      // Search in title
      if (card.title.toLowerCase().includes(query)) return true;
      
      // Search in description
      if (card.description.toLowerCase().includes(query)) return true;
      
      // Search in creator name
      if (card.creator && card.creator.toLowerCase().includes(query)) return true;
      
      // Search in creator username
      if (card.creator_username && card.creator_username.toLowerCase().includes(query)) return true;
      
      // Search in tab names
      if (card.tabs && card.tabs.length > 0) {
        const tabNamesMatch = card.tabs.some(tab => 
          tab.name && tab.name.toLowerCase().includes(query)
        );
        if (tabNamesMatch) return true;
      }
      
      // Search in input creators (from cache)
      const inputCreators = inputCreatorsCache[card.id] || [];
      if (inputCreators.some(creator => creator.includes(query))) {
        return true;
      }
      
      return false;
    });
  }, [searchQuery, allCards, inputCreatorsCache]);

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

