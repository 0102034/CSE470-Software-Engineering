import axios from 'axios';

/**
 * Sets up authentication headers for admin API requests
 * @returns {boolean} True if admin token exists and was set, false otherwise
 */
export const setupAdminAuth = () => {
  try {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
      console.warn('No admin token found');
      return false;
    }
    
    // Set the authorization header for all subsequent requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    return true;
  } catch (error) {
    console.error('Error setting up admin authentication:', error);
    return false;
  }
};

/**
 * Makes an authenticated admin API request with proper error handling
 * @param {string} url - The API endpoint URL
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {object} data - Request payload (for POST/PUT requests)
 * @returns {Promise} - The axios response
 */
export const adminApiRequest = async (url, method = 'get', data = null) => {
  const isAuthenticated = setupAdminAuth();
  
  // Check if we're on an admin page
  const isAdminPage = window.location.pathname.includes('/admin');
  
  if (!isAuthenticated && isAdminPage) {
    throw new Error('Admin authentication required');
  } else if (!isAuthenticated && !isAdminPage) {
    // If we're not on an admin page, use regular authentication instead
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
  
  try {
    const config = {
      method,
      url,
      ...(data && { data })
    };
    
    return await axios(config);
  } catch (error) {
    // Handle token expiration or authentication errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Admin authentication failed:', error.response.data);
      // You might want to redirect to admin login page here
    }
    throw error;
  }
};
