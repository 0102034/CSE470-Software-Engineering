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
import { Link, useNavigate, useLocation } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';
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

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  // Add login-page class to body
  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  // Extract token from URL and verify it
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenFromUrl = queryParams.get('token');
    
    if (!tokenFromUrl) {
      setError('Reset token is missing. Please request a new password reset link.');
      setVerifying(false);
      return;
    }
    
    setToken(tokenFromUrl);
    
    // Verify the token
    const verifyToken = async () => {
      try {
        const response = await api.post('/api/auth/verify-reset-token', { token: tokenFromUrl });
        setTokenValid(true);
      } catch (err) {
        console.error('Token verification error:', err);
        setError(err.response?.data?.error || 'Invalid or expired reset token. Please request a new password reset link.');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };
    
    verifyToken();
  }, [location]);

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Validate password strength
    if (!validatePassword(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.post('/api/auth/reset-password', { 
        token,
        password 
      });
      
      setSuccess(true);
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.error || 'An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', my: 4 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h6">Verifying reset token...</Typography>
          </Box>
        </GradientPaper>
      </Container>
    );
  }

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
          <LockIcon sx={{ fontSize: 40, color: 'white' }} />
        </GradientIconBox>
        
        <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#263238' }}>
          Reset Password
        </Typography>
        
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: '8px' }}>{error}</Alert>}
        
        {success ? (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>
              Your password has been reset successfully!
            </Alert>
            <Typography variant="body1" sx={{ mb: 3 }}>
              You will be redirected to the login page in a few seconds...
            </Typography>
            <MuiLink 
              component={Link} 
              to="/login" 
              sx={{ 
                color: 'var(--primary-main)', 
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
                '&:hover': {
                  color: 'var(--primary-dark)',
                }
              }}
            >
              Go to login page
            </MuiLink>
          </Box>
        ) : tokenValid ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Please enter your new password below.
            </Typography>
            <StyledTextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="New Password"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            />
            <StyledTextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            <GradientButton
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
            </GradientButton>
          </Box>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              The reset link is invalid or has expired. Please request a new password reset.
            </Typography>
            <MuiLink 
              component={Link} 
              to="/forgot-password" 
              sx={{ 
                color: 'var(--primary-main)', 
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
                '&:hover': {
                  color: 'var(--primary-dark)',
                }
              }}
            >
              Request new reset link
            </MuiLink>
          </Box>
        )}
      </GradientPaper>
    </Container>
  );
};

export default ResetPassword;
