import React, { useMemo, useState, useEffect } from 'react';
import './MyCommunities.css';
import { getAllCommunities, getMyCommunities, getCommunityInputs, getContributedCommunities } from '../../services/api';
import { getToken } from '../../services/api';

const MyCommunities = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [allCommunities, setAllCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [contributedCommunities, setContributedCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputCreatorsCache, setInputCreatorsCache] = useState({});
  const [loadingInputCreators, setLoadingInputCreators] = useState(new Set());

  useEffect(() => {
    const fetchCommunities = async () => {
      setIsLoading(true);
      setError(null);

      try {

        const [allData, myData, contributedData] = await Promise.all([
          getAllCommunities(),
          getMyCommunities(),
          getContributedCommunities()
        ]);

        const mapCommunity = (community) => ({
          id: community.id,
          title: community.title,
          description: community.description,
          creator: community.creator_name,
          creator_username: community.creator_username || '',
          creator_id: community.creator_id,
          tabs: community.tabs || [],
          createdAt: community.created_at,
          updatedAt: community.updated_at,
        });

        setAllCommunities(allData.map(mapCommunity));
        setMyCommunities(myData.map(mapCommunity));
        setContributedCommunities(contributedData.map(mapCommunity));
      } catch (err) {
        console.error('Error fetching communities:', err);
        setError(err.message || 'Failed to load communities. Please try again.');
        setAllCommunities([]);
        setMyCommunities([]);
        setContributedCommunities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const fetchInputCreators = async (communityId) => {
    if (inputCreatorsCache[communityId] || loadingInputCreators.has(communityId)) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setLoadingInputCreators(prev => new Set(prev).add(communityId));

    try {
      const inputs = await getCommunityInputs(communityId);
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

  
  useEffect(() => {
    if (searchQuery.trim()) {
      let cardsToCheck = [];
      if (activeSection === 'created') {
        cardsToCheck = myCommunities;
      } else if (activeSection === 'contributed') {
        cardsToCheck = contributedCommunities;
      } else {
        cardsToCheck = allCommunities;
      }

      
      cardsToCheck.forEach(card => {
        if (!inputCreatorsCache[card.id] && !loadingInputCreators.has(card.id)) {
          fetchInputCreators(card.id);
        }
      });
    }
    
  }, [searchQuery, activeSection]); // Fetch when search query or active section changes

  const filteredCards = useMemo(() => {
    let cardsToShow = [];
    
    if (activeSection === 'created') {
      cardsToShow = myCommunities;
    } else if (activeSection === 'contributed') {
      cardsToShow = contributedCommunities;
    } else {
      cardsToShow = allCommunities;
    }

    if (!searchQuery.trim()) {
      return cardsToShow;
    }

    const query = searchQuery.toLowerCase().trim();
    return cardsToShow.filter(card => {
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
  }, [activeSection, searchQuery, allCommunities, myCommunities, contributedCommunities, inputCreatorsCache]);

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
                  {`No communities found${searchQuery.trim() ? ' matching your search' : activeSection === 'created' ? ' created by you' : activeSection === 'contributed' ? ' where you have contributed' : ''}.`}
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

