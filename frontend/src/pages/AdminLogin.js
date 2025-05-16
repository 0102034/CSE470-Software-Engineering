import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Container, 
  Paper, 
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import axios from 'axios';
import '../AppBackgrounds.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);

  // Clear any existing tokens when this page loads
  useEffect(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
  }, []);

  useEffect(() => {
    document.body.classList.add('admin-login-page');
    return () => document.body.classList.remove('admin-login-page');
  }, []);

  // Handle retry countdown
  useEffect(() => {
    let timer;
    if (retryDelay > 0) {
      timer = setTimeout(() => {
        setRetryDelay(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (retryDelay === 0 && retryCount > 0) {
      // Auto-retry when countdown reaches zero
      handleSubmit(null, true);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [retryDelay, retryCount]);

  const handleSubmit = async (e, isRetry = false) => {
    if (e && !isRetry) e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    // Only reset debug info on initial attempt, not retries
    if (!isRetry) {
      setDebugInfo(null);
    }

    try {
      console.log('Attempting admin login with:', { email, password });
      
      const response = await axios.post('/api/auth/admin/login', {
        email,
        password
      });

      console.log('Admin login successful, response:', response.data);
      
      // Reset retry counters on success
      setRetryCount(0);
      setRetryDelay(0);
      
      // Store debug info
      setDebugInfo({
        status: 'Success',
        data: response.data
      });

      // Store admin token and info
      const adminToken = response.data.access_token;
      localStorage.setItem('adminToken', adminToken);
      localStorage.setItem('adminInfo', JSON.stringify(response.data.admin));
      
      // Set the default Authorization header for all subsequent requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Test the token by making a request to the statistics endpoint
      try {
        console.log('Testing admin token with statistics endpoint...');
        const testResponse = await axios.get('/api/admin/statistics');
        console.log('Token validation successful:', testResponse.data);
        setDebugInfo(prev => ({
          ...prev,
          tokenValidation: 'Success',
          testResponse: testResponse.data
        }));
      } catch (testErr) {
        console.error('Token validation failed:', testErr);
        setDebugInfo(prev => ({
          ...prev,
          tokenValidation: 'Failed',
          testError: {
            message: testErr.message,
            status: testErr.response?.status,
            data: testErr.response?.data
          }
        }));
      }
      
      // Immediately navigate to admin dashboard
      console.log('Navigating to admin dashboard...');
      navigate('/admin-dashboard');
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle rate limiting with exponential backoff
      if (err.response?.status === 429) {
        // Increase retry count and calculate exponential backoff
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        // Calculate delay with exponential backoff: 2^retry * 1000ms (capped at 30s)
        const backoffDelay = Math.min(Math.pow(2, newRetryCount) * 1, 30);
        setRetryDelay(backoffDelay);
        
        setError(`Rate limit exceeded. Retrying in ${backoffDelay} seconds...`);
      } else {
        // Reset retry counters for non-rate-limit errors
        setRetryCount(0);
        setRetryDelay(0);
        setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
      }
      
      // Store debug info
      setDebugInfo({
        status: 'Error',
        error: {
          message: err.message,
          name: err.name,
          stack: err.stack
        },
        response: err.response?.data,
        statusCode: err.response?.status,
        url: err.config?.url,
        retryCount: retryCount,
        retryDelay: retryDelay
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: '16px'
        }}
      >
        <Box sx={{ 
          backgroundColor: '#c62828', 
          borderRadius: '50%', 
          p: 2, 
          mb: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 40, color: 'white' }} />
        </Box>
        
        <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#263238' }}>
          Admin Login
        </Typography>
        
        {error && (
          <Alert 
            severity={retryDelay > 0 ? "warning" : "error"} 
            sx={{ width: '100%', mb: 2 }}
          >
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            disabled={retryDelay > 0}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            disabled={retryDelay > 0}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="error"
            size="large"
            disabled={loading || retryDelay > 0}
            sx={{ 
              py: 1.5, 
              backgroundColor: '#c62828',
              '&:hover': { backgroundColor: '#b71c1c' },
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : retryDelay > 0 ? (
              `Retrying in ${retryDelay}s...`
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
        
        {debugInfo && (
          <Box sx={{ mt: 3, width: '100%', border: '1px solid #ddd', p: 2, borderRadius: '8px' }}>
            <Typography variant="h6">Debug Info:</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AdminLogin; 