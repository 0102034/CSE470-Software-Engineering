import axios from 'axios';
import { API_URL } from '../config';
import { getToken } from './authService';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getToken();
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

// Create a new announcement (admin only)
export const createAnnouncement = async (announcementData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/announcements`,
      announcementData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all announcements (admin only)
export const getAllAnnouncements = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/announcements`, getAuthHeaders());
    return response.data.announcements || [];
  } catch (error) {
    console.error('Error in getAllAnnouncements:', error);
    throw error;
  }
};

// Get announcements for a specific page
export const getAnnouncementsByPage = async (page) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/announcements/page/${page}`,
      getAuthHeaders()
    );
    return response.data.announcements;
  } catch (error) {
    throw error;
  }
};

// Get a specific announcement by ID
export const getAnnouncementById = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/announcements/${id}`,
      getAuthHeaders()
    );
    return response.data.announcement;
  } catch (error) {
    throw error;
  }
};

// Update an announcement (admin only)
export const updateAnnouncement = async (id, announcementData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/announcements/${id}`,
      announcementData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete an announcement (admin only)
export const deleteAnnouncement = async (id) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/announcements/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
