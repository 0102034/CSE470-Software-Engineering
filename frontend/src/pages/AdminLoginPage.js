import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = e => {
    e.preventDefault();
    setError('');
    // Hardcoded admin credentials
    if (email === '470@gmail.com' && password === 'bracu2025') {
      navigate('/admin/dashboard');
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
      <Paper elevation={8} sx={{ p: 5, minWidth: 340, borderRadius: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Admin Login</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleLogin}>
          <TextField label="Admin Email" type="email" fullWidth required sx={{ mb: 2 }} value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Password" type="password" fullWidth required sx={{ mb: 3 }} value={password} onChange={e => setPassword(e.target.value)} />
          <Button variant="contained" color="secondary" type="submit" fullWidth sx={{ py: 1.2, fontWeight: 600 }}>Login</Button>
        </form>
      </Paper>
    </Box>
  );
}
