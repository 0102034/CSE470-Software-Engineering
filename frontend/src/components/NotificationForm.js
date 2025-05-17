import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import notificationService from '../services/notificationService';

function AnnouncementForm() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    pages: {
      home: false,
      ride_share: false,
      lost_found: false,
      marketplace: false
    },
    important: false
  });
  const [announcements, setAnnouncements] = useState([]);
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
      const data = await notificationService.getAllAnnouncements();
      if (Array.isArray(data)) {
        setAnnouncements(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error loading announcements:', err);
      setError('Failed to load announcements: ' + (err.message || 'Unknown error'));
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    if (name.startsWith('page-')) {
      // Handle checkbox changes for pages
      const page = name.replace('page-', '');
      setFormData({
        ...formData,
        pages: {
          ...formData.pages,
          [page]: checked
        }
      });
    } else if (type === 'checkbox') {
      // Handle other checkbox inputs
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      // Handle text inputs and selects
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate form data
      if (!formData.title.trim()) {
        setError('Please enter a title');
        return;
      }
      
      if (!formData.message.trim()) {
        setError('Please enter a message');
        return;
      }
      
      // Check if at least one page is selected
      const hasSelectedPage = Object.values(formData.pages).some(selected => selected);
      if (!hasSelectedPage) {
        setError('Please select at least one page to display the announcement');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');
      
      if (editingId) {
        await notificationService.updateAnnouncement(editingId, formData);
        setSuccess('Announcement updated successfully!');
      } else {
        await notificationService.createAnnouncement(formData);
        setSuccess('Announcement created successfully!');
      }

      // Reset form
      setFormData({
        title: '',
        message: '',
        pages: {
          home: false,
          ride_share: false,
          lost_found: false,
          marketplace: false
        },
        important: false
      });
      setEditingId(null);
      
      // Reload announcements
      await loadNotifications();
    } catch (error) {
      console.error('Error submitting announcement:', error);
      setSuccess('');
      setError(error.message || 'Failed to save announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement) => {
    // Convert the pages array to the expected format
    const pagesObject = {};
    pageOptions.forEach(option => {
      pagesObject[option.value] = announcement.pages.includes(option.value);
    });
    
    setFormData({
      title: announcement.title || '',
      message: announcement.message,
      pages: pagesObject,
      important: announcement.important || false
    });
    setEditingId(announcement._id);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await notificationService.deactivateAnnouncement(id);
      setSuccess('Announcement deleted successfully!');
      
      // Clear form if we're editing the announcement that was just deleted
      if (editingId === id) {
        setFormData({
          title: '',
          message: '',
          pages: {
            home: false,
            ride_share: false,
            lost_found: false,
            marketplace: false
          },
          important: false
        });
        setEditingId(null);
      }
      
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setSuccess('');
      setError('Failed to delete announcement: ' + (error.message || 'Please try again'));
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
            <AnnouncementIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </Typography>
          
          <TextField
            fullWidth
            label="Announcement Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
          />

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
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Display on Pages:
          </Typography>
          
          <FormGroup sx={{ mb: 3 }}>
            {pageOptions.map(option => (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    checked={formData.pages[option.value]}
                    onChange={handleChange}
                    name={`page-${option.value}`}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.important}
                onChange={handleChange}
                name="important"
              />
            }
            label="Mark as Important (will be highlighted)"
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: 120 }}
              startIcon={<AnnouncementIcon />}
            >
              {loading ? <CircularProgress size={24} /> : editingId ? 'Update' : 'Create'}
            </Button>
            {editingId && (
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    title: '',
                    message: '',
                    pages: {
                      home: false,
                      ride_share: false,
                      lost_found: false,
                      marketplace: false
                    },
                    important: false
                  });
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
              <TableCell>Title</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Pages</TableCell>
              <TableCell>Important</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {announcements.map((announcement) => (
              <TableRow key={announcement._id}>
                <TableCell>{announcement.title}</TableCell>
                <TableCell>{announcement.message}</TableCell>
                <TableCell>
                  {announcement.pages && Array.isArray(announcement.pages) ? 
                    announcement.pages.map(page => 
                      pageOptions.find(opt => opt.value === page)?.label || page
                    ).join(', ') : 
                    '—'
                  }
                </TableCell>
                <TableCell>
                  {announcement.important ? 'Yes' : 'No'}
                </TableCell>
                <TableCell>
                  {new Date(announcement.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => handleEdit(announcement)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(announcement._id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {announcements.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
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

export default AnnouncementForm;
