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
    throw new Error(error.response.data.error || 'An error occurred');
  } else if (error.request) {
    // Request was made but no response
    throw new Error('No response from server. Please check your connection.');
  } else {
    // Error setting up request
    throw new Error('Error making request. Please try again.');
  }
};

const notificationService = {
  createNotification: async (data) => {
    try {
      const response = await axios.post(
        `${API_URL}/notifications`, 
        data, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  getActiveNotifications: async (page) => {
    try {
      const response = await axios.get(
        `${API_URL}/notifications/page/${page}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  getAllNotifications: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/notifications`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  deactivateNotification: async (notificationId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/notifications/${notificationId}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};

export default notificationService;
