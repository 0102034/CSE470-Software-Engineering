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
    if (pathname.includes('/marketplace')) return 'marketplace';
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
    }
  }, [isLoggedIn, currentPage, location.pathname]);

  const fetchAnnouncements = async () => {
    try {
      // Use the correct API endpoint for notifications/announcements
      const response = await axios.get(`/api/notifications/page/${currentPage}`);
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

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        overflow: 'hidden',
        position: 'relative',
        mb: 2
      }}
    >
      <Box 
        sx={{ 
          whiteSpace: 'nowrap',
          animation: 'marquee 20s linear infinite',
          '@keyframes marquee': {
            '0%': { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(-100%)' }
          },
          py: 1,
          px: 2
        }}
      >
        {announcements.map((announcement, index) => (
          <Typography 
            key={announcement._id} 
            component="span" 
            sx={{ 
              fontWeight: 'medium',
              mr: 4
            }}
          >
            📢 {announcement.message}
            {index < announcements.length - 1 && ' • '}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

export default AnnouncementBanner;
