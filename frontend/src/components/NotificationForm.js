import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import notificationService from '../services/notificationService';

function NotificationForm({ adminToken }) {
  const [formData, setFormData] = useState({
    message: '',
    page: 'ride_share'
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);

  const pageOptions = [
    { value: 'home', label: 'Homepage' },
    { value: 'ride_share', label: 'Ride Share' },
    { value: 'lost_found', label: 'Lost & Found' },
    { value: 'marketplace', label: 'Marketplace' }
  ];

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the provided admin token for authentication
      const config = {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/notifications?_=${timestamp}`, config);
      const data = response.data;
      
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications: ' + (err.response?.data?.error || err.message || 'Unknown error'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate form data
      if (!formData.message.trim()) {
        setError('Please enter a message');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');
      
      // Use the provided admin token for authentication
      const config = {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (editingId) {
        await axios.put(`/api/notifications/${editingId}`, formData, config);
        setSuccess('Notification updated successfully!');
      } else {
        await axios.post('/api/notifications', formData, config);
        setSuccess('Notification created successfully!');
      }

      // Reset form
      setFormData({
        message: '',
        page: 'ride_share'
      });
      setEditingId(null);
      
      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error submitting notification:', error);
      setSuccess('');
      setError(error.response?.data?.error || error.message || 'Failed to save notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (notification) => {
    setFormData({
      message: notification.message,
      page: notification.page
    });
    setEditingId(notification._id);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Use the provided admin token for authentication
      const config = {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      await axios.delete(`/api/notifications/${id}`, config);
      setSuccess('Notification deleted successfully!');
      
      // Clear form if we're editing the notification that was just deleted
      if (editingId === id) {
        setFormData({
          message: '',
          page: 'ride_share'
        });
        setEditingId(null);
      }
      
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      setSuccess('');
      setError('Failed to delete notification: ' + (error.response?.data?.error || error.message || 'Please try again'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Page</InputLabel>
            <Select
              name="page"
              value={formData.page}
              onChange={handleChange}
              label="Select Page"
              required
            >
              {pageOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Announcement Message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            multiline
            rows={4}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : editingId ? 'Update' : 'Create'}
            </Button>
            {editingId && (
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ message: '', page: 'ride_share' });
                }}
              >
                Cancel Edit
              </Button>
            )}
          </Box>
        </form>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Announcement History
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Message</TableCell>
              <TableCell>Page</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification._id}>
                <TableCell>{notification.message}</TableCell>
                <TableCell>
                  {pageOptions.find(opt => opt.value === notification.page)?.label || notification.page}
                </TableCell>
                <TableCell>
                  {new Date(notification.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => handleEdit(notification)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(notification._id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {notifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No announcements found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default NotificationForm;
