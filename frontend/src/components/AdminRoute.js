import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import axios from 'axios';

// This component checks if the user is authenticated as an admin
// If authenticated as admin, it renders the admin routes
// If not, it redirects to the admin login page
const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const verifyAdminToken = async () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminInfo = localStorage.getItem('adminInfo');
      
      if (!adminToken) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // First try checking if admin info exists and is valid
        if (adminInfo) {
          try {
            const adminData = JSON.parse(adminInfo);
            if (adminData && adminData.role === 'admin') {
              // Skip token verification and try to get admin data directly
              // If this fails with a 401, we'll redirect to login anyway
              try {
                const statsResponse = await axios.get('/api/admin/statistics', {
                  headers: {
                    Authorization: `Bearer ${adminToken}`
                  }
                });
                
                // If we can get statistics, we're definitely an admin
                if (statsResponse.data) {
                  setIsAdmin(true);
                  setLoading(false);
                  return;
                }
              } catch (statError) {
                // If this fails with anything other than 429, continue with token verification
                if (statError.response?.status === 429) {
                  throw statError; // Rethrow to handle rate limiting
                }
                // Otherwise, fall through to token verification
              }
            }
          } catch (parseError) {
            // Ignore JSON parse errors and continue with verification
            console.error('Error parsing admin info:', parseError);
          }
        }

        // Verify admin token with backend
        const response = await axios.get('/api/auth/verify-token', {
          headers: {
            Authorization: `Bearer ${adminToken}`
          }
        });
        
        if (response.data.valid && response.data.admin) {
          setIsAdmin(true);
          // Reset retry count on success
          setRetryCount(0);
        } else {
          // Invalid token or not admin
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminInfo');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Admin token verification failed:', error);
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          setError('Rate limit exceeded');
          // Retry after exponential backoff: 2^retry seconds (max 30 seconds)
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          
          const delay = Math.min(Math.pow(2, newRetryCount), 30) * 1000;
          setTimeout(() => {
            // Reset error and try again
            setError(null);
            verifyAdminToken();
          }, delay);
          
          return; // Don't set loading to false yet
        } else if (error.response?.status === 401) {
          // Clear invalid token for auth errors
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminInfo');
          setIsAdmin(false);
        } else {
          // For network errors, we'll try once more in 2 seconds
          if (retryCount < 1) {
            setRetryCount(1);
            setTimeout(() => {
              setError(null);
              verifyAdminToken();
            }, 2000);
            return; // Don't set loading to false yet
          } else {
            // After retry, assume access denied
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminInfo');
            setIsAdmin(false);
          }
        }
      } finally {
        // Only set loading to false if we're not retrying
        if (error === null) {
          setLoading(false);
        }
      }
    };

    verifyAdminToken();
  }, [retryCount]);

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
          <Typography variant="body1" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        {retryCount > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Retrying... (Attempt {retryCount})
          </Typography>
        )}
      </Box>
    );
  }

  return isAdmin ? children : <Navigate to="/admin-login" />;
};

export default AdminRoute; 