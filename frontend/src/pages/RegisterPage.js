import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, MenuItem, Alert, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const majors = [
  'CSE', 'EEE', 'BBA', 'LLB', 'ENH', 'PHR', 'ARC', 'MNS', 'Other'
];

function validateBracuId(id) {
  return /^\d{8}$/.test(id);
}

function validateBracuEmail(email) {
  // Must end with @g.bracu.ac.bd
  return /^[^@\s]+@g\.bracu\.ac\.bd$/.test(email);
}

function validatePassword(password) {
  // At least 8 chars, one uppercase, one special char, one digit
  return /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?=.*\d).{8,}$/.test(password);
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    bracu_id: '', name: '', email: '', password: '', major: '', semester: '', id_card: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [idCardName, setIdCardName] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (files) {
      setForm(prev => ({ ...prev, [name]: files[0] }));
      setIdCardName(files[0]?.name || '');
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!validateBracuId(form.bracu_id)) {
      setError('ID must be exactly 8 digits.');
      return;
    }
    if (!validateBracuEmail(form.email)) {
      setError('Email must be your BRACU email (e.g., name@g.bracu.ac.bd)');
      return;
    }
    if (!validatePassword(form.password)) {
      setError('Password must be at least 8 characters, contain one uppercase letter, one special character, and one digit.');
      return;
    }
    if (!form.id_card) {
      setError('ID Card photo is required.');
      return;
    }
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      await axios.post('/api/register', data);
      setSuccess('Registration submitted! Your account will be verified by an admin within a few moments.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
      <Paper elevation={8} sx={{ p: 5, minWidth: 340, borderRadius: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>Student Registration</Typography>
        <Typography variant="body2" sx={{ mb: 2, color: '#888' }}>
          Please fill out the form below. Your account will be reviewed by an admin before activation.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <Tooltip title="Your BRACU ID must be exactly 8 digits (e.g., 20301234)">
            <TextField label="BRACU ID" name="bracu_id" fullWidth required sx={{ mb: 2 }} value={form.bracu_id} onChange={handleChange} inputProps={{ maxLength: 8 }} helperText="ID should be 8 digits" />
          </Tooltip>
          <TextField label="Name" name="name" fullWidth required sx={{ mb: 2 }} value={form.name} onChange={handleChange} helperText="Enter your full name" />
          <Tooltip title="Your BRACU email must end with @g.bracu.ac.bd">
            <TextField label="Email" name="email" type="email" fullWidth required sx={{ mb: 2 }} value={form.email} onChange={handleChange} helperText="Email must be your BRACU email (e.g., name@g.bracu.ac.bd)" />
          </Tooltip>
          <Tooltip title="At least 8 chars, one uppercase, one special char, one digit">
            <TextField label="Password" name="password" type="password" fullWidth required sx={{ mb: 2 }} value={form.password} onChange={handleChange} helperText="Password must be at least 8 characters, contain one uppercase letter, one special character, and one digit." />
          </Tooltip>
          <TextField label="Major" name="major" select fullWidth required sx={{ mb: 2 }} value={form.major} onChange={handleChange} helperText="Select your major">
            {majors.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField label="Semester" name="semester" fullWidth required sx={{ mb: 2 }} value={form.semester} onChange={handleChange} helperText="e.g., Spring 2025" />
          <Button variant="contained" component="label" fullWidth sx={{ mb: 3, py: 1.2, fontWeight: 600 }}>
            Upload ID Card Photo
            <input type="file" name="id_card" accept="image/*" hidden onChange={handleChange} />
          </Button>
          {idCardName && <Typography variant="caption" sx={{ color: '#555', mb: 2, display: 'block' }}>Selected: {idCardName}</Typography>}
          <Button variant="contained" color="primary" type="submit" fullWidth sx={{ py: 1.2, fontWeight: 600 }}>Register</Button>
        </form>
        <Button onClick={() => navigate('/login')} sx={{ mt: 2, color: '#8e24aa' }}>Already have an account? Login</Button>
      </Paper>
    </Box>
  );
}
