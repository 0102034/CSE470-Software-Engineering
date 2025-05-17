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
import { Link } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';
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

const ForgotPassword = () => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetInfo, setResetInfo] = useState(null);

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
    setSuccess(false);
    
    try {
      // Validate email format
      if (!email.endsWith('@g.bracu.ac.bd')) {
        setError('Email must be in the format name@g.bracu.ac.bd');
        setLoading(false);
        return;
      }

      const response = await api.post('/api/auth/forgot-password', { email });
      setSuccess(true);
      // Store the reset info if available (for development)
      if (response.data.dev_info) {
        setResetInfo(response.data.dev_info);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'An error occurred. Please try again later.');
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
          <LockResetIcon sx={{ fontSize: 40, color: 'white' }} />
        </GradientIconBox>
        
        <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#263238' }}>
          Forgot Password
        </Typography>
        
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: '8px' }}>{error}</Alert>}
        
        {success ? (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>
              Password reset instructions have been sent.
            </Alert>
            
            {resetInfo && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: '8px', textAlign: 'left' }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#333' }}>
                  Development Mode - Reset Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all' }}>
                  <strong>Token:</strong> {resetInfo.token}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all' }}>
                  <strong>Reset Link:</strong> <MuiLink href={resetInfo.reset_link} target="_blank">{resetInfo.reset_link}</MuiLink>
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Expires:</strong> {new Date(resetInfo.expires).toLocaleString()}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  component={Link} 
                  to={`/reset-password?token=${resetInfo.token}`}
                  sx={{ mt: 1 }}
                >
                  Go to Reset Password Page
                </Button>
              </Box>
            )}
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              {resetInfo ? 
                'Click the button above to reset your password.' : 
                'Please check your inbox and follow the instructions to reset your password.'}
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
              Return to login
            </MuiLink>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Enter your BRACU email address and we'll send you instructions to reset your password.
            </Typography>
            <StyledTextField
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
              sx={{ mb: 3 }}
              helperText="Must be your BRACU email (name@g.bracu.ac.bd)"
            />
            <GradientButton
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
            </GradientButton>
          </Box>
        )}
        
        <Box sx={{ mt: 3, width: '100%', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{' '}
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
              Sign in here
            </MuiLink>
          </Typography>
        </Box>
      </GradientPaper>
    </Container>
  );
};

export default ForgotPassword;
