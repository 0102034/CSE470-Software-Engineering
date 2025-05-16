import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const AdminAnnouncement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPages, setSelectedPages] = useState([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const availablePages = [
    { value: 'home', label: 'Home Page' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'ride_share', label: 'Ride Share' },
    { value: 'bus_booking', label: 'Bus Booking' },
    { value: 'lost_found', label: 'Lost & Found' }
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/announcements', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showNotification('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!message.trim() || selectedPages.length === 0) {
      showNotification('Please enter a message and select at least one page', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/announcements',
        {
          message,
          pages: selectedPages
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Reset form
      setMessage('');
      setSelectedPages([]);
      
      // Refresh announcements
      fetchAnnouncements();
      
      showNotification('Announcement created successfully', 'success');
    } catch (error) {
      console.error('Error creating announcement:', error);
      showNotification('Failed to create announcement', 'error');
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!message.trim() || selectedPages.length === 0 || !editingAnnouncement) {
      showNotification('Please enter a message and select at least one page', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/announcements/${editingAnnouncement._id}`,
        {
          message,
          pages: selectedPages
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Reset form and close dialog
      setMessage('');
      setSelectedPages([]);
      setEditingAnnouncement(null);
      setOpenDialog(false);
      
      // Refresh announcements
      fetchAnnouncements();
      
      showNotification('Announcement updated successfully', 'success');
    } catch (error) {
      console.error('Error updating announcement:', error);
      showNotification('Failed to update announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/announcements/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Refresh announcements
      fetchAnnouncements();
      
      showNotification('Announcement deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification('Failed to delete announcement', 'error');
    }
  };

  const handleEditClick = (announcement) => {
    setEditingAnnouncement(announcement);
    setMessage(announcement.message);
    setSelectedPages(announcement.pages);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAnnouncement(null);
    setMessage('');
    setSelectedPages([]);
  };

  const handlePageChange = (event) => {
    setSelectedPages(event.target.value);
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Announcement Management
      </Typography>

      {/* Create Announcement Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Create New Announcement
        </Typography>
        <Box component="form" sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Announcement Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            rows={3}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="pages-select-label">Display on Pages</InputLabel>
            <Select
              labelId="pages-select-label"
              multiple
              value={selectedPages}
              onChange={handlePageChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const page = availablePages.find(p => p.value === value);
                    return (
                      <Chip key={value} label={page ? page.label : value} />
                    );
                  })}
                </Box>
              )}
            >
              {availablePages.map((page) => (
                <MenuItem key={page.value} value={page.value}>
                  {page.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateAnnouncement}
            sx={{ mt: 2 }}
          >
            Create Announcement
          </Button>
        </Box>
      </Paper>

      {/* Announcements List */}
      <Typography variant="h6" gutterBottom>
        Announcement History
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : announcements.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No announcements found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Message</TableCell>
                <TableCell>Pages</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement._id}>
                  <TableCell>{announcement.message}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {announcement.pages.map((page) => {
                        const pageInfo = availablePages.find(p => p.value === page);
                        return (
                          <Chip 
                            key={page} 
                            label={pageInfo ? pageInfo.label : page} 
                            size="small" 
                          />
                        );
                      })}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(announcement.created_at)}</TableCell>
                  <TableCell>{formatDate(announcement.updated_at)}</TableCell>
                  <TableCell>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleEditClick(announcement)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteAnnouncement(announcement._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Edit Announcement</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Announcement Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            rows={3}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="edit-pages-select-label">Display on Pages</InputLabel>
            <Select
              labelId="edit-pages-select-label"
              multiple
              value={selectedPages}
              onChange={handlePageChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const page = availablePages.find(p => p.value === value);
                    return (
                      <Chip key={value} label={page ? page.label : value} />
                    );
                  })}
                </Box>
              )}
            >
              {availablePages.map((page) => (
                <MenuItem key={page.value} value={page.value}>
                  {page.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleUpdateAnnouncement} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminAnnouncement;
