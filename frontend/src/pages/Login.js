import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Container, 
  Paper, 
  CircularProgress,
  Alert,
  Link as MuiLink,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link, useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import api from '../utils/api';
import '../AppBackgrounds.css';

// Styled components
const GradientPaper = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: 'var(--shadow-xl)',
  }
}));

const GradientIconBox = styled(Box)(({ theme }) => ({
  background: 'var(--gradient-primary)',
  borderRadius: '50%',
  padding: '16px',
  marginBottom: '16px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: 'var(--shadow-md)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    '&:hover fieldset': {
      borderColor: 'var(--primary-light)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--primary-main)',
    }
  },
}));

const GradientButton = styled(Button)(({ theme }) => ({
  background: 'var(--gradient-primary)',
  color: 'var(--primary-contrast)',
  padding: '12px 0',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '500',
  boxShadow: 'var(--shadow-md)',
  transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
  '&:hover': {
    background: 'var(--gradient-primary)',
    boxShadow: 'var(--shadow-lg)',
    transform: 'translateY(-2px)',
  }
}));

const Login = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add login-page class to body
  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/login', {
        identifier,
        password
      });
      
      // Check if the user is an admin
      if (response.data.user && response.data.user.role === 'admin') {
        // If user is an admin, redirect to admin login page
        setError('Administrators must use the admin login page');
        setTimeout(() => {
          navigate('/admin-login');
        }, 2000); // Redirect after showing the message for 2 seconds
        return;
      }
      
      // Store token in localStorage for regular users
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to profile page instead of home page
      // Use replace instead of push to handle back button correctly
      navigate('/profile', { replace: false });
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.error === 'Your account is pending approval. Please check back later.') {
        setError('Your account is pending approval by an administrator.');
      } else {
        setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <GradientPaper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
        }}
      >
        <GradientIconBox>
          <PersonIcon sx={{ fontSize: 40, color: 'white' }} />
        </GradientIconBox>
        
        <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#263238' }}>
          Student Login
        </Typography>
        
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: '8px' }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <StyledTextField
            margin="normal"
            required
            fullWidth
            id="identifier"
            label="Username or Email"
            name="identifier"
            autoComplete="username"
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            sx={{ mb: 2 }}
          />
          <StyledTextField
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
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <MuiLink
              component={Link}
              to="/forgot-password"
              sx={{
                color: 'var(--primary-main)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
                '&:hover': {
                  color: 'var(--primary-dark)',
                }
              }}
            >
              Forgot password?
            </MuiLink>
          </Box>
          <GradientButton
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </GradientButton>
        </Box>
        
        <Box sx={{ mt: 3, width: '100%', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <MuiLink 
              component={Link} 
              to="/register" 
              sx={{ 
                color: 'var(--primary-main)', 
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
                '&:hover': {
                  color: 'var(--primary-dark)',
                }
              }}
            >
              Register here
            </MuiLink>
          </Typography>
        </Box>
      </GradientPaper>
    </Container>
  );
};

export default Login; 
