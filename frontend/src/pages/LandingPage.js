import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid, Paper } from '@mui/material';
import CircleIcon from '@mui/icons-material/DonutLarge';

const options = [
  {
    name: 'Room Booking',
    color: '#8e24aa',
    path: '/login',
    icon: '📚',
    desc: 'Reserve your favorite study spaces and library rooms on campus with ease.'
  },
  {
    name: 'Bus/Ride Share Booking',
    color: '#039be5',
    path: '/login',
    icon: '🚌',
    desc: 'Book a seat on the campus bus or find/share rides with fellow students.'
  },
  {
    name: 'Marketplace',
    color: '#43a047',
    path: '/login',
    icon: '🛒',
    desc: 'Buy, sell, or swap books, gadgets, and more with the BRACU community.'
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', p: 0 }}>
      <Box sx={{ pt: 8, textAlign: 'center' }}>
        <CircleIcon sx={{ fontSize: 80, color: '#fff', mb: 2, filter: 'drop-shadow(0 4px 8px #8e24aa99)' }} />
        <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '2px 2px 8px #8e24aa99' }}>
          BRACU Circle
        </Typography>
        <Typography variant="h6" sx={{ mt: 1, mb: 2, color: '#fff', fontWeight: 500 }}>
          Your all-in-one campus platform for booking, trading, and connecting.
        </Typography>
        <Typography variant="body1" sx={{ mb: 5, color: '#fff', maxWidth: 600, mx: 'auto', fontSize: 18 }}>
          Welcome to BRACU Circle! Explore exclusive features designed for BRAC University students:
          reserve rooms, book rides, and trade goods safely within your campus community. Log in or register to get started!
        </Typography>
        <Button variant="contained" color="secondary" sx={{ mr: 2, fontWeight: 700 }} onClick={() => navigate('/login')}>Student Login</Button>
        <Button variant="outlined" color="secondary" sx={{ fontWeight: 700 }} onClick={() => navigate('/register')}>Student Registration</Button>
        <Button variant="text" color="inherit" sx={{ ml: 2, fontWeight: 700 }} onClick={() => navigate('/admin')}>Admin Login</Button>
      </Box>
      <Grid container justifyContent="center" spacing={4} sx={{ mt: 2 }}>
        {options.map(opt => (
          <Grid item xs={12} md={3} key={opt.name}>
            <Paper elevation={6} sx={{
              p: 4,
              textAlign: 'center',
              background: opt.color,
              color: '#fff',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.07)', boxShadow: '0 8px 24px #00000033' },
              minHeight: 220,
            }}
            onClick={() => navigate(opt.path)}
            >
              <Typography variant="h2" sx={{ mb: 2 }}>{opt.icon}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{opt.name}</Typography>
              <Typography variant="body2" sx={{ mt: 2, color: '#f8f8f8', fontWeight: 400 }}>{opt.desc}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 8, textAlign: 'center', color: '#fff', opacity: 0.9 }}>
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} BRACU Circle &mdash; Empowering campus life for every BRACU student.
        </Typography>
      </Box>
    </Box>
  );
}
