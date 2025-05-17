import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import WarningIcon from '@mui/icons-material/Warning';
import '../styles/ScrollingAnnouncement.css';

/**
 * ScrollingAnnouncement component displays announcements in a scrolling ticker from right to left
 * @param {Object} props
 * @param {Array} props.announcements - Array of announcement objects
 * @param {string} props.page - Current page name to filter announcements
 */
const ScrollingAnnouncement = ({ announcements = [], page = 'home' }) => {
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);

  useEffect(() => {
    // Filter announcements for the current page
    if (announcements && announcements.length > 0) {
      const filtered = announcements.filter(
        announcement => announcement.pages && announcement.pages.includes(page)
      );
      setFilteredAnnouncements(filtered);
    }
  }, [announcements, page]);

  if (!filteredAnnouncements || filteredAnnouncements.length === 0) {
    return null;
  }

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        mb: 2,
        backgroundColor: '#f5f5f5',
        borderLeft: '4px solid #3f51b5',
        height: '50px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Box sx={{ 
        position: 'absolute', 
        left: 0,
        top: 0,
        bottom: 0,
        width: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3f51b5',
        color: 'white',
        zIndex: 2
      }}>
        <AnnouncementIcon />
      </Box>
      
      <Box className="scrolling-container" sx={{ paddingLeft: '60px', width: '100%' }}>
        <Box className="scrolling-text">
          {filteredAnnouncements.map((announcement, index) => (
            <Box 
              key={announcement._id || index} 
              sx={{ 
                display: 'inline-flex',
                alignItems: 'center',
                mr: 4,
                backgroundColor: announcement.important ? '#ffebee' : 'transparent',
                px: announcement.important ? 2 : 0,
                py: announcement.important ? 1 : 0,
                borderRadius: announcement.important ? '4px' : 0
              }}
            >
              {announcement.important && (
                <WarningIcon sx={{ color: '#f44336', mr: 1 }} fontSize="small" />
              )}
              <Typography 
                variant="body1" 
                component="span"
                sx={{ 
                  fontWeight: announcement.important ? 'bold' : 'normal',
                  color: announcement.important ? '#d32f2f' : 'inherit'
                }}
              >
                {announcement.message}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default ScrollingAnnouncement;
