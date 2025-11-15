import React, { useMemo, useState } from 'react';
import './MainScreen.css';

const MainScreen = ({ onOpenCommunity }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const allCards = useMemo(
    () => [
      {
        id: 1,
        title: 'Van School Rebuild Collective',
        description:
          'Parents and civil engineers coordinate drives for chairs, whiteboards, chalk, pens, and pencils while recruiting volunteer carpenters and masons to partner with contractors rebuilding the Derebahçe primary school after the winter storm collapse.',
      },
      {
        id: 2,
        title: 'Istanbul Climate Lab',
        description:
          'Meteorology students and city planners model Bosphorus microclimates together and produced an open-source flood readiness toolkit now piloted by the Kadıköy municipality.',
      },
      {
        id: 3,
        title: 'Bursa Makers Market',
        description:
          'Local artisans coordinate pop-up fairs in Nilüfer, sharing supplier tips and negotiating packaging discounts that supported 42 sellers during the 2025 Ramadan market season.',
      },
      {
        id: 4,
        title: 'Aegean Coastal Cleanup Crew',
        description:
          'Volunteer divers and kayakers organize quarterly shoreline cleanups from Çeşme to Kuşadası and have logged 18 tons of waste removed since 2022 with transparent impact dashboards.',
      },
      {
        id: 5,
        title: 'Anatolian Data Storytellers',
        description:
          'Journalists and analysts collaborate on regional datasets, publishing a bilingual housing affordability report cited by Anadolu Agency in May 2025.',
      },
      {
        id: 6,
        title: 'Cappadocia Astronomy Circle',
        description:
          'Hosts stargazing nights near Uçhisar, lending telescopes to local schools and curating a dark-sky guide for visiting campers.',
      },
      {
        id: 7,
        title: 'Trabzon Heritage Kitchen',
        description:
          'Food historians digitize Black Sea family recipes and recently launched livestream cooking classes featuring grandmothers from Sürmene.',
      },
      {
        id: 8,
        title: 'Women in Rail Türkiye',
        description:
          'Engineers and conductors mentor students, arranging job-shadow days with TCDD and securing 12 internship placements last summer.',
      },
      {
        id: 9,
        title: 'Van Lake Wildlife Watch',
        description:
          'Citizen scientists track waterbird migration and maintain a shared dataset that WWF Türkiye uses to plan wetland restoration.',
      },
      {
        id: 10,
        title: 'Ankara Tech Innovators',
        description:
          'Runs monthly hardware hack nights at Bilkent Cyberpark, where volunteers prototype civic tech solutions like low-cost air-quality sensors deployed across Çankaya in spring 2024.',
      },
      {
        id: 11,
        title: 'Eskişehir Game Dev Guild',
        description:
          'Indie developers host playtest evenings at Atatürk Culture Centre and shipped four mobile titles showcased during the 2025 Indie Expo.',
      },
      {
        id: 12,
        title: 'Mediterranean Film Exchange',
        description:
          'Filmmakers share equipment and critique sessions, coordinating a short-film residency aligned with the Antalya Golden Orange Festival.',
      },
      {
        id: 13,
        title: 'Black Sea Trail Runners',
        description:
          'Organizes sunrise trail runs and safety clinics while maintaining a route-mapping app for beginner-friendly segments near Rize.',
      },
      {
        id: 14,
        title: 'Inclusive Design Ankara',
        description:
          'UX professionals run accessibility audits for NGOs and delivered volunteer training to the Turkish Red Crescent digital team in February 2025.',
      },
      {
        id: 15,
        title: 'Izmir Circular Fashion Hub',
        description:
          'Designers experiment with textile recycling and operate a fabric swap library that now serves 300 members across Konak.',
      },
      {
        id: 16,
        title: 'Gaziantep Robotics League',
        description:
          'High school mentors support FIRST Tech Challenge teams and helped rebuild lab space after the 2023 earthquakes using donated equipment.',
      },
    ],
    [],
  );

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

