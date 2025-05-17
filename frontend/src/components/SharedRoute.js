import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import axios from 'axios';

// This component checks if the user is authenticated either as a regular user OR an admin
// If authenticated as either, it renders the children components
// If not, it redirects to the login page
const SharedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyAuthentication = async () => {
      // First check if we're coming from admin dashboard (admin visiting flag)
      const adminVisiting = localStorage.getItem('adminVisitingStudentPage');
      
      // Check for admin tokens
      const adminToken = localStorage.getItem('adminToken');
      const lastAdminToken = localStorage.getItem('lastAdminToken');
      const tokenToTry = adminToken || lastAdminToken;
      
      // Check for admin info
      const adminInfo = localStorage.getItem('adminInfo');
      const lastAdminInfo = localStorage.getItem('lastAdminInfo');
      
      // Check for user token (normal authentication)
      const userToken = localStorage.getItem('token');
      
      console.log('Admin visiting:', adminVisiting ? 'yes' : 'no');
      console.log('Admin token exists:', adminToken ? 'yes' : 'no');
      console.log('Last admin token exists:', lastAdminToken ? 'yes' : 'no');
      console.log('User token exists:', userToken ? 'yes' : 'no');
      
      // If we have admin visiting flag and admin credentials, authenticate as admin
      if (adminVisiting && tokenToTry) {
        try {
          // First try to directly use the token
          axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToTry}`;
          
          // Check if admin info exists
          if (!adminInfo && lastAdminInfo) {
            localStorage.setItem('adminInfo', lastAdminInfo);
          }
          
          // We're authenticated as admin
          setIsAuthenticated(true);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Admin verification error:', error);
          // Continue with regular verification
        }
      }
      
      // If admin authentication failed or not applicable, check for user authentication
      if (userToken) {
        try {
          // Verify user token with backend
          const response = await axios.get('/api/auth/verify-token', {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          });
          
          if (response.data.valid) {
            setIsAuthenticated(true);
          } else {
            // Invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('User token verification failed:', error);
          setError(error.message);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };

    verifyAuthentication();
  }, []);

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
        {error && (
          <Box sx={{ mt: 2, color: 'error.main' }}>
            {error}
          </Box>
        )}
      </Box>
    );
  }

  // If admin or user is authenticated, render children. Otherwise redirect to login
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default SharedRoute; 