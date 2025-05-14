import React from 'react';
import withNotificationBanner from '../components/withNotificationBanner';
// ... other imports

const RideShare = () => {
  // ... existing component code
};

export default withNotificationBanner(RideShare, 'ride_share');
