import React from 'react';
import './CommunityDetails.css';

const CommunityDetails = ({ community }) => {
  const title = community?.title || 'Community';
  const description = community?.description || 'No description provided.';

  return (
    <div className="community-details">
      <div className="community-details-card">
        <h1 className="details-title">{title}</h1>
        <p className="details-description">{description}</p>
      </div>
    </div>
  );
};

export default CommunityDetails;

