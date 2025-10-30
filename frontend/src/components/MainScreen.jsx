import React, { useMemo } from 'react';
import './MainScreen.css';

const MainScreen = ({ onOpenCommunity }) => {
  const cards = useMemo(() => {
    const lorem =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris pharetra, sem eget bibendum congue, neque orci porttitor nunc, vitae feugiat velit neque sit amet arcu. Integer laoreet, purus a tempor pulvinar, arcu eros lacinia massa, non interdum libero nibh eu risus. ';
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i + 1,
      title: `Community ${i + 1}`,
      description: lorem.repeat(((i % 3) + 1)),
    }));
  }, []);

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
        
        <div className="dashboard-cards">
          {cards.map(card => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainScreen;
