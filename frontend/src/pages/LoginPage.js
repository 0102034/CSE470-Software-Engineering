import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    try {
      // TODO: Replace with actual API endpoint
      const res = await axios.post('/api/login', { email, password });
      // Save token/user info as needed
      navigate('/profile');
    } catch (err) {
      setError('Invalid credentials or not verified yet.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
      <Paper elevation={8} sx={{ p: 5, minWidth: 340, borderRadius: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Student Login</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleLogin}>
          <TextField label="Email" type="email" fullWidth required sx={{ mb: 2 }} value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Password" type="password" fullWidth required sx={{ mb: 3 }} value={password} onChange={e => setPassword(e.target.value)} />
          <Button variant="contained" color="primary" type="submit" fullWidth sx={{ py: 1.2, fontWeight: 600 }}>Login</Button>
        </form>
        <Button onClick={() => navigate('/register')} sx={{ mt: 2, color: '#8e24aa' }}>Don't have an account? Register</Button>
      </Paper>
    </Box>
  );
}
