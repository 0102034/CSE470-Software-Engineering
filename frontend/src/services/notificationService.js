import axios from 'axios';
import { getToken } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    if (error.response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    // Pass the entire error object to preserve status code
    error.message = error.response.data.error || 'An error occurred';
    throw error;
  } else if (error.request) {
    // Request was made but no response
    throw new Error('No response from server. Please check your connection.');
  } else {
    // Error setting up request
    throw new Error('Error making request. Please try again.');
  }
};

const notificationService = {
  // Create a new announcement
  createAnnouncement: async (data) => {
    try {
      // Convert pages object to array of selected pages
      const pagesArray = Object.entries(data.pages)
        .filter(([_, selected]) => selected)
        .map(([page]) => page);
      
      const announcementData = {
        title: 'Announcement', // Default title since we removed the title field
        message: data.message,
        pages: pagesArray,
        important: data.important
      };
      
      const response = await axios.post(
        `${API_URL}/admin/announcements`, 
        announcementData, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Update an existing announcement
  updateAnnouncement: async (announcementId, data) => {
    try {
      // Convert pages object to array of selected pages
      const pagesArray = Object.entries(data.pages)
        .filter(([_, selected]) => selected)
        .map(([page]) => page);
      
      const announcementData = {
        title: 'Announcement', // Default title since we removed the title field
        message: data.message,
        pages: pagesArray,
        important: data.important
      };
      
      const response = await axios.put(
        `${API_URL}/admin/announcements/${announcementId}`, 
        announcementData, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get announcements for a specific page
  getPageAnnouncements: async (page, cacheBuster = '') => {
    try {
      // This is a public endpoint, no auth headers needed
      const response = await axios.get(
        `${API_URL}/announcements/page/${page}${cacheBuster}`,
        {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get all announcements (admin only)
  getAllAnnouncements: async (cacheBuster = '') => {
    try {
      const headers = getAuthHeaders();
      // Add cache control headers to prevent browser caching
      headers.headers['Cache-Control'] = 'no-cache';
      headers.headers['Pragma'] = 'no-cache';
      
      const response = await axios.get(
        `${API_URL}/admin/announcements${cacheBuster}`,
        headers
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Deactivate/delete an announcement
  deactivateAnnouncement: async (announcementId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/admin/announcements/${announcementId}`,
        getAuthHeaders()
      );
      
      // Clear any cached announcements to ensure fresh data on next fetch
      localStorage.removeItem('cached_announcements');
      localStorage.removeItem('cached_announcements_timestamp');
      
      // For each page type, clear the specific page cache
      ['home', 'ride_share', 'lost_found', 'marketplace'].forEach(page => {
        localStorage.removeItem(`cached_page_announcements_${page}`);
        localStorage.removeItem(`cached_page_announcements_${page}_timestamp`);
      });
      
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
  
  // Legacy methods for backward compatibility
  createNotification: async (data) => {
    console.warn('createNotification is deprecated, use createAnnouncement instead');
    return notificationService.createAnnouncement({
      title: 'Notification',
      message: data.message,
      pages: { [data.page]: true },
      important: false
    });
  },

  getActiveNotifications: async (page) => {
    console.warn('getActiveNotifications is deprecated, use getPageAnnouncements instead');
    return notificationService.getPageAnnouncements(page);
  },

  getAllNotifications: async () => {
    console.warn('getAllNotifications is deprecated, use getAllAnnouncements instead');
    return notificationService.getAllAnnouncements();
  },

  deactivateNotification: async (notificationId) => {
    console.warn('deactivateNotification is deprecated, use deactivateAnnouncement instead');
    return notificationService.deactivateAnnouncement(notificationId);
  }
};

export default notificationService;
