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
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slide
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import notificationService from '../services/notificationService';

// Transition for the dialog
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AnnouncementForm({ onClose }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
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
    
    // Set up a polling interval to refresh announcements periodically
    const intervalId = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Add cache-busting parameter to ensure we get fresh data
      const timestamp = new Date().getTime();
      const data = await notificationService.getAllAnnouncements(`?_=${timestamp}`);
      
      if (Array.isArray(data)) {
        setAnnouncements(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error loading announcements:', err);
      if (err.response && err.response.status === 401) {
        setError('Authentication error: You need admin privileges to manage announcements');
      } else if (err.response && err.response.status === 403) {
        setError('Authorization error: You need admin privileges to manage announcements');
      } else {
        setError('Failed to load announcements: ' + (err.message || 'Unknown error'));
      }
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
      
      let updatedAnnouncement;
      
      if (editingId) {
        // If editing, update the UI immediately
        const response = await notificationService.updateAnnouncement(editingId, formData);
        updatedAnnouncement = response.announcement;
        
        // Update the announcement in the local state
        if (updatedAnnouncement) {
          setAnnouncements(prevAnnouncements => 
            prevAnnouncements.map(announcement => 
              announcement._id === editingId ? updatedAnnouncement : announcement
            )
          );
        }
        
        setSuccess('Announcement updated successfully!');
      } else {
        // If creating, add to UI after successful creation
        const response = await notificationService.createAnnouncement(formData);
        updatedAnnouncement = response.announcement;
        
        // Add the new announcement to the local state
        if (updatedAnnouncement) {
          setAnnouncements(prevAnnouncements => [updatedAnnouncement, ...prevAnnouncements]);
        }
        
        setSuccess('Announcement created successfully!');
      }

      // Reset form
      setFormData({
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
      
      // Refresh the list to ensure we're in sync with the server
      await loadNotifications();
    } catch (error) {
      console.error('Error submitting announcement:', error);
      setSuccess('');
      setError('Failed to save announcement: ' + (error.message || 'Please try again'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement) => {
    // Convert pages array to object format for form
    const pagesObject = {
      home: false,
      ride_share: false,
      lost_found: false,
      marketplace: false
    };
    
    if (announcement.pages && Array.isArray(announcement.pages)) {
      announcement.pages.forEach(page => {
        if (pagesObject.hasOwnProperty(page)) {
          pagesObject[page] = true;
        }
      });
    }
    
    setFormData({
      message: announcement.message,
      pages: pagesObject,
      important: announcement.important || false
    });
    setEditingId(announcement._id);
    setError('');
    setSuccess('');
  };

  const openDeleteDialog = (announcement) => {
    setAnnouncementToDelete(announcement);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAnnouncementToDelete(null);
  };

  const handleDelete = async (id) => {
    // Close the dialog
    setDeleteDialogOpen(false);
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // First update the UI immediately by removing the announcement from the local state
      setAnnouncements(prevAnnouncements => prevAnnouncements.filter(announcement => announcement._id !== id));
      
      // Then send the delete request to the server
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
      
      // Reload the announcements to ensure our UI is in sync with the server
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setSuccess('');
      setError('Failed to delete announcement: ' + (error.message || 'Please try again'));
      // If the delete failed, reload the announcements to restore the UI
      await loadNotifications();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
          <AnnouncementIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Announcement Management
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={onClose}
          sx={{ borderRadius: '20px' }}
        >
          Back to Dashboard
        </Button>
      </Box>
      
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
      
      <Paper elevation={3} sx={{ 
        p: 3, 
        mb: 4, 
        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(33, 150, 243, 0.15)'
      }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            <AnnouncementIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </Typography>

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

      <Typography variant="h6" sx={{ mb: 2, color: '#7b1fa2', fontWeight: 'bold' }}>
        <AnnouncementIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Announcement History
      </Typography>
      
      <TableContainer component={Paper} sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(156, 39, 176, 0.15)',
      }}>
        <Table sx={{
          background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'
        }}>
          <TableHead>
            <TableRow sx={{ background: 'rgba(156, 39, 176, 0.2)' }}>
              <TableCell sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>Message</TableCell>
              <TableCell sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>Pages</TableCell>
              <TableCell sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>Important</TableCell>
              <TableCell sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>Created At</TableCell>
              <TableCell sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {announcements.map((announcement, index) => (
              <TableRow 
                key={announcement._id}
                sx={{ 
                  backgroundColor: index % 2 === 0 ? 'rgba(156, 39, 176, 0.05)' : 'rgba(156, 39, 176, 0.1)',
                  '&:hover': { backgroundColor: 'rgba(156, 39, 176, 0.15)' }
                }}
              >
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
                    onClick={() => openDeleteDialog(announcement)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {announcements.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    color: '#7b1fa2'
                  }}>
                    <AnnouncementIcon sx={{ fontSize: 40, mb: 1, opacity: 0.6 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      No announcements found
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#9c27b0', opacity: 0.7 }}>
                      Create a new announcement to get started
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={closeDeleteDialog}
        aria-describedby="delete-announcement-dialog"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(90deg, #f44336, #e91e63)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <DeleteIcon /> Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ mt: 2, minWidth: '400px' }}>
          <DialogContentText id="delete-announcement-dialog">
            Are you sure you want to delete this announcement?
          </DialogContentText>
          {announcementToDelete && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: 'rgba(156, 39, 176, 0.05)', 
              borderRadius: '8px',
              border: '1px solid rgba(156, 39, 176, 0.2)'
            }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {announcementToDelete.message}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                Pages: {announcementToDelete.pages && Array.isArray(announcementToDelete.pages) ? 
                  announcementToDelete.pages.map(page => 
                    pageOptions.find(opt => opt.value === page)?.label || page
                  ).join(', ') : 
                  '—'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={closeDeleteDialog} 
            variant="outlined"
            startIcon={<CloseIcon />}
            sx={{ borderRadius: '20px' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => announcementToDelete && handleDelete(announcementToDelete._id)} 
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ 
              borderRadius: '20px',
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(244, 67, 54, 0.4)',
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AnnouncementForm;
