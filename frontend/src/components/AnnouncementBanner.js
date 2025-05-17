import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('token') !== null;

  // Map pathname to page identifier
  const getPageIdentifier = (pathname) => {
    // Don't show announcements on admin pages
    if (pathname.includes('/admin')) return null;
    
    // Don't show announcements on marketplace as requested
    if (pathname.includes('/marketplace')) return null;
    
    if (pathname.includes('/ride-booking')) return 'ride_share';
    if (pathname.includes('/bus-booking')) return 'bus_booking';
    if (pathname.includes('/lost-found')) return 'lost_found';
    if (pathname === '/' || pathname === '/home') return 'home';
    return null;
  };

  const currentPage = getPageIdentifier(location.pathname);

  useEffect(() => {
    // Only fetch announcements if user is logged in and we know which page we're on
    if (isLoggedIn && currentPage) {
      fetchAnnouncements();
      
      // Set up polling to check for updates every 30 seconds
      const pollingInterval = setInterval(fetchAnnouncements, 30000);
      
      // Clean up interval on unmount
      return () => clearInterval(pollingInterval);
    }
  }, [isLoggedIn, currentPage, location.pathname]);

  const fetchAnnouncements = async () => {
    try {
      // Use the correct API endpoint for announcements
      const response = await axios.get(`http://localhost:5000/api/announcements/page/${currentPage}`);
      setAnnouncements(response.data);
      console.log('Fetched announcements:', response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  // If user is not logged in or there are no announcements, don't show the banner
  if (!isLoggedIn || announcements.length === 0) {
    return null;
  }

  return React.createElement(Paper, {
    elevation: 0,
    sx: {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      p: 2,
      borderRadius: 0,
      mb: 2
    }
  }, 
    React.createElement(Box, {
      sx: { maxWidth: 'lg', mx: 'auto' }
    },
      announcements.map((announcement, index) =>
        React.createElement(Box, {
          key: announcement._id,
          sx: { mb: index < announcements.length - 1 ? 2 : 0 }
        },
          React.createElement(Typography, {
            variant: 'h6',
            sx: { fontWeight: 'bold' }
          }, announcement.title || 'Announcement'),
          React.createElement(Typography, {
            variant: 'body1'
          }, announcement.message)
        )
      )
    )
  );
};

export default AnnouncementBanner;
