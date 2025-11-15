import React, { useMemo, useState } from 'react';
import './MyCommunities.css';

const MyCommunities = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all'); // 'created', 'contributed', 'all'

  // Mock data - in a real app, this would come from API/state
  const allCards = useMemo(() => {
    const created = [
      {
        id: 'created-1',
        title: 'Neighborhood Solar Coalition',
        description:
          'Started weekend workshops with rooftop installers in Çankaya and helped 14 apartment boards evaluate net-metering proposals using shared spreadsheets.',
        type: 'created',
      },
      {
        id: 'created-2',
        title: 'Ankara Open Library Network',
        description:
          'Maintains curbside book exchange cabinets, scheduling volunteers for weekly restocks and read-aloud afternoons for children.',
        type: 'created',
      },
      {
        id: 'created-3',
        title: 'Urban Farming Lab',
        description:
          'Converted an unused parking lot near Kolej metro into raised-bed gardens and coordinates drip-irrigation training with Hacettepe horticulture students.',
        type: 'created',
      },
      {
        id: 'created-4',
        title: 'Tech for Accessibility Meetup',
        description:
          'Brings developers and disability advocates together, prototyping a voice-guided museum tour showcased at CerModern in March 2025.',
        type: 'created',
      },
      {
        id: 'created-5',
        title: 'Community Disaster Response Playbook',
        description:
          'Documented shelter logistics based on February 2023 earthquake deployments and distributes updated checklists to neighborhood leaders each quarter.',
        type: 'created',
      },
    ];

    const contributed = [
      {
        id: 'contributed-1',
        title: 'Kadıköy Cycling Coalition',
        description:
          'Assisted with data collection for Sunday open-street pilots and authored blog posts analyzing the impact on local shops.',
        type: 'contributed',
      },
      {
        id: 'contributed-2',
        title: 'İzmir Food Rescue Alliance',
        description:
          'Volunteered in midnight surplus pickups and built Airtable automations linking markets with shelters before Bayram.',
        type: 'contributed',
      },
      {
        id: 'contributed-3',
        title: 'STEM Sisters Mentorship',
        description:
          'Coached a high school robotics team preparing for Teknofest and helped secure sponsorship from a local manufacturing cooperative.',
        type: 'contributed',
      },
      {
        id: 'contributed-4',
        title: 'Anatolian Storytelling Festival',
        description:
          'Co-produced the digital program with live-captioning and curated community storytellers from Kars to Antalya.',
        type: 'contributed',
      },
      {
        id: 'contributed-5',
        title: 'Zero Waste Dorms Initiative',
        description:
          'Ran compost workshops and monitored waste-sorting compliance using QR code check-ins across campus dormitories.',
        type: 'contributed',
      },
      {
        id: 'contributed-6',
        title: 'Ankara Civic Tech Commons',
        description:
          'Contributed map layers for accessible transit stations and moderated monthly lightning talk sessions.',
        type: 'contributed',
      },
      {
        id: 'contributed-7',
        title: 'Eastern Black Sea Trail Alliance',
        description:
          'Helped mark trailheads and produced bilingual safety briefings distributed to hikers last summer.',
        type: 'contributed',
      },
      {
        id: 'contributed-8',
        title: 'Makers without Borders Turkey Chapter',
        description:
          'Fabricated open-source medical device parts during 2024 supply shortages, coordinating shipments with field clinics.',
        type: 'contributed',
      },
    ];

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

