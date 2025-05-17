// RideShareManagement.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Chip,
  Avatar,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PersonIcon from '@mui/icons-material/Person';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import axios from 'axios';

const RideShareManagement = () => {
  // State for ride share items
  const [rideShareItems, setRideShareItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for item details dialog
  const [itemDetails, setItemDetails] = useState({ open: false, item: null });
  
  // State for edit dialog
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItemData, setEditItemData] = useState(null);
  
  // State for current user
  const [currentUser, setCurrentUser] = useState(null);
  
  // State for delete confirmation
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  
  // State for snackbar notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Get current user from token
  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        return decodedToken.sub || decodedToken.id;
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    return null;
  };

  // Check if user is the creator of an item
  const isItemCreator = (item) => {
    const userId = getCurrentUser();
    return userId && item.user_id && userId.toString() === item.user_id.toString();
  };

  // Fetch ride share items
  const fetchRideShareItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/ride-share-posts');
      setRideShareItems(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching ride share posts:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch ride share posts',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchRideShareItems();
    setCurrentUser(getCurrentUser());
  }, []);

  // Handle view item details
  const handleViewItem = (item) => {
    setItemDetails({ open: true, item });
  };

  // Handle close item details
  const handleCloseItemDetails = () => {
    setItemDetails({ open: false, item: null });
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setEditItemData(item);
    setEditItemOpen(true);
  };

  // Handle close edit dialog
  const handleCloseEdit = () => {
    setEditItemOpen(false);
    setEditItemData(null);
  };

  // Handle save edited item
  const handleSaveEdit = async () => {
    try {
      await axios.put(`/api/ride-share-posts/${editItemData.id}`, editItemData);
      
      // Update local state
      setRideShareItems(prevItems => 
        prevItems.map(item => item.id === editItemData.id ? editItemData : item)
      );
      
      setSnackbar({
        open: true,
        message: 'Post updated successfully',
        severity: 'success'
      });
      
      handleCloseEdit();
    } catch (error) {
      console.error('Error updating post:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update post',
        severity: 'error'
      });
    }
  };

  // Handle delete item
  const handleDeleteItem = (id) => {
    setDeleteItemId(id);
    setDeleteItemOpen(true);
  };

  // Handle close delete confirmation
  const handleCloseDelete = () => {
    setDeleteItemOpen(false);
    setDeleteItemId(null);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteItemId) return;
    
    try {
      await axios.delete(`/api/ride-share-posts/${deleteItemId}`);
      
      // Update local state
      setRideShareItems(prevItems => prevItems.filter(item => item.id !== deleteItemId));
      
      setSnackbar({
        open: true,
        message: 'Post deleted successfully',
        severity: 'success'
      });
      
      handleCloseDelete();
    } catch (error) {
      console.error('Error deleting post:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete post',
        severity: 'error'
      });
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format time from 24-hour to 12-hour format
  const formatTime = (time) => {
    if (!time) return 'N/A';
    
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return time;
    }
  };

  // Render ride share items as cards
  const renderRideShareCards = () => {
    return React.createElement(
      Grid, 
      { container: true, spacing: 3 },
      rideShareItems.map(item => 
        React.createElement(
          Grid, 
          { item: true, xs: 12, sm: 6, md: 4, key: item.id },
          React.createElement(
            Card, 
            { 
              sx: { 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(63, 81, 181, 0.15)',
                border: '1px solid rgba(63, 81, 181, 0.1)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 15px 35px rgba(63, 81, 181, 0.25)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '5px',
                  background: 'linear-gradient(90deg, #3f51b5, #536dfe)'
                }
              }
            },
            // Card Header with gradient background
            React.createElement(
              Box, 
              { 
                sx: { 
                  p: 2.5, 
                  background: 'linear-gradient(135deg, #3f51b5 0%, #1a237e 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '150px',
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.1))',
                    transform: 'skewX(-30deg) translateX(90%)',
                  }
                }
              },
              React.createElement(
                Typography, 
                { 
                  variant: 'h6', 
                  fontWeight: 'bold', 
                  noWrap: true,
                  sx: {
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                  }
                },
                React.createElement(DirectionsCarIcon, { 
                  sx: { 
                    mr: 1.5, 
                    fontSize: '1.5rem',
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))'
                  } 
                }),
                item.title || `${item.pickup_location} to ${item.dropoff_location}`
              )
            ),
            // Card Image if available
            item.image && React.createElement(
              CardMedia,
              {
                component: 'img',
                height: 160,
                image: item.image,
                alt: 'Ride Share Image',
                sx: { 
                  objectFit: 'cover',
                  transition: 'transform 0.5s ease',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }
              }
            ),
            // Card Content with improved styling
            React.createElement(
              CardContent, 
              { sx: { flexGrow: 1, p: 2.5, pt: 3 } },
              // Description if available
              item.description && React.createElement(
                Typography,
                { 
                  variant: 'body2', 
                  color: 'text.secondary', 
                  mb: 2,
                  sx: {
                    backgroundColor: 'rgba(63, 81, 181, 0.05)',
                    p: 1.5,
                    borderRadius: '8px',
                    borderLeft: '3px solid #3f51b5'
                  }
                },
                item.description
              ),
              // From location
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'rgba(63, 81, 181, 0.05)' }
                  } 
                },
                React.createElement(LocationOnIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: '#3f51b5',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { 
                    variant: 'body2', 
                    color: 'text.primary',
                    fontWeight: '500'
                  },
                  `From: `,
                  React.createElement(
                    'span',
                    { style: { color: '#3f51b5', fontWeight: 'bold' } },
                    item.pickup_location || 'Not specified'
                  )
                )
              ),
              // To location
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.05)' }
                  } 
                },
                React.createElement(LocationOnIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: '#f44336',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { 
                    variant: 'body2', 
                    color: 'text.primary',
                    fontWeight: '500'
                  },
                  `To: `,
                  React.createElement(
                    'span',
                    { style: { color: '#f44336', fontWeight: 'bold' } },
                    item.dropoff_location || 'Not specified'
                  )
                )
              ),
              // Date
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'rgba(63, 81, 181, 0.05)' }
                  } 
                },
                React.createElement(EventIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: '#3f51b5',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { variant: 'body2', color: 'text.primary', fontWeight: '500' },
                  `Date: `,
                  React.createElement(
                    'span',
                    { style: { fontWeight: 'bold' } },
                    item.date ? new Date(item.date).toLocaleDateString() : 'Not specified'
                  )
                )
              ),
              // Time
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'rgba(63, 81, 181, 0.05)' }
                  } 
                },
                React.createElement(AccessTimeIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: '#3f51b5',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { variant: 'body2', color: 'text.primary', fontWeight: '500' },
                  `Time: `,
                  React.createElement(
                    'span',
                    { style: { fontWeight: 'bold' } },
                    formatTime(item.time)
                  )
                )
              ),
              // Available Seats
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'rgba(63, 81, 181, 0.05)' }
                  } 
                },
                React.createElement(AirlineSeatReclineNormalIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: '#3f51b5',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { variant: 'body2', color: 'text.primary', fontWeight: '500' },
                  `Available Seats: `,
                  React.createElement(
                    'span',
                    { style: { fontWeight: 'bold' } },
                    item.available_seats || 'Not specified'
                  )
                )
              ),
              // Price with highlighted styling
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1.5,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    border: '1px dashed rgba(76, 175, 80, 0.5)'
                  } 
                },
                React.createElement(AttachMoneyIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: 'success.main',
                    fontSize: '1.5rem',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { 
                    variant: 'body1', 
                    fontWeight: 'bold', 
                    color: 'success.main',
                    fontSize: '1.1rem'
                  },
                  `Price: $${item.price || 'Free'}`
                )
              ),
              // Posted by
              React.createElement(
                Box, 
                { 
                  sx: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    p: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'rgba(63, 81, 181, 0.05)' }
                  } 
                },
                React.createElement(PersonIcon, { 
                  sx: { 
                    mr: 1.5, 
                    color: '#3f51b5',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  } 
                }),
                React.createElement(
                  Typography, 
                  { variant: 'body2', color: 'text.primary', fontWeight: '500' },
                  `Posted by: `,
                  React.createElement(
                    'span',
                    { style: { fontWeight: 'bold' } },
                    item.user_name || 'Unknown'
                  )
                )
              ),
              // Status chip with improved styling
              React.createElement(
                Box, 
                { sx: { mt: 2, display: 'flex', justifyContent: 'center' } },
                React.createElement(
                  Chip,
                  {
                    label: item.status || 'Available',
                    color: item.status === 'Booked' ? 'error' : 'success',
                    size: 'medium',
                    sx: { 
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      py: 0.5,
                      px: 1,
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }
                  }
                )
              )
            ),  
            // Card Actions
            React.createElement(
              CardActions, 
              { sx: { p: 2, pt: 0 } },
              React.createElement(
                Button,
                {
                  size: 'small',
                  startIcon: React.createElement(VisibilityIcon),
                  onClick: () => handleViewItem(item),
                  sx: { mr: 1 }
                },
                'View'
              ),
              isItemCreator(item) ? [
                React.createElement(
                  Button,
                  {
                    size: 'small',
                    startIcon: React.createElement(EditIcon),
                    onClick: () => handleEditItem(item),
                    sx: { mr: 1 },
                    key: 'edit'
                  },
                  'Edit'
                ),
                React.createElement(
                  Button,
                  {
                    size: 'small',
                    startIcon: React.createElement(DeleteIcon),
                    onClick: () => handleDeleteItem(item.id),
                    color: 'error',
                    key: 'delete'
                  },
                  'Delete'
                )
              ] : [
                React.createElement(
                  Button,
                  {
                    size: 'small',
                    startIcon: React.createElement(BookOnlineIcon),
                    color: 'primary',
                    sx: { mr: 1 },
                    key: 'book',
                    disabled: item.status === 'Booked'
                  },
                  'Book Now'
                ),
                React.createElement(
                  Button,
                  {
                    size: 'small',
                    startIcon: React.createElement(ContactMailIcon),
                    color: 'secondary',
                    key: 'contact'
                  },
                  'Contact'
                )
              ]
            )
          )
        )
      )
    );
  };

  return React.createElement(
    Box,
    { sx: { p: 3 } },
    // Page Title
    React.createElement(
      Typography,
      { 
        variant: 'h4', 
        sx: { 
          mb: 3, 
          color: '#3f51b5', 
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }
      },
      'Ride Share Management'
    ),
    
    // Loading State
    loading ? 
      React.createElement(
        Box,
        { sx: { display: 'flex', justifyContent: 'center', p: 5 } },
        React.createElement(CircularProgress, null)
      ) : 
      React.createElement(
        Box,
        null,
        // Ride Share Items Section
        React.createElement(
          Paper,
          { 
            sx: { 
              p: 3, 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
              boxShadow: '0 8px 32px rgba(63, 81, 181, 0.15)'
            }
          },
          React.createElement(
            Box,
            { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 } },
            React.createElement(
              Typography,
              { variant: 'h6', sx: { color: '#3f51b5', fontWeight: 'bold' } },
              React.createElement(DirectionsCarIcon, { sx: { mr: 1, verticalAlign: 'middle' } }),
              `Ride Share Posts (${rideShareItems.length})`
            ),
            React.createElement(
              Button,
              { 
                variant: 'contained', 
                color: 'primary', 
                onClick: () => fetchRideShareItems(),
                sx: { 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(63, 81, 181, 0.3)'
                  }
                }
              },
              'Refresh'
            )
          ),
          rideShareItems.length > 0 ? renderRideShareCards() : 
            React.createElement(
              Box,
              { 
                sx: { 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  py: 4
                }
              },
              React.createElement(DirectionsCarIcon, { sx: { fontSize: 48, mb: 2, color: '#3f51b5', opacity: 0.6 } }),
              React.createElement(
                Typography,
                { variant: 'subtitle1', sx: { fontWeight: 'medium', color: '#3f51b5' } },
                'No ride share posts found'
              ),
              React.createElement(
                Typography,
                { variant: 'body2', sx: { mt: 0.5, color: '#3f51b5', opacity: 0.7 } },
                'Add ride share posts to see them here'
              )
            )
        )
      ),
    
    // Item Details Dialog
    React.createElement(
      Dialog,
      { open: itemDetails.open, onClose: handleCloseItemDetails, maxWidth: 'md' },
      React.createElement(DialogTitle, null, 'Ride Share Details'),
      React.createElement(
        DialogContent,
        null,
        itemDetails.item && React.createElement(
          Box,
          null,
          React.createElement(Typography, { variant: 'h6', gutterBottom: true }, 
            itemDetails.item.title || `${itemDetails.item.pickup_location} to ${itemDetails.item.dropoff_location}`
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(LocationOnIcon, { sx: { mr: 1, color: '#3f51b5' } }),
            React.createElement(Typography, { variant: 'body1' }, `From: ${itemDetails.item.pickup_location || 'Not specified'}`)
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(LocationOnIcon, { sx: { mr: 1, color: '#f44336' } }),
            React.createElement(Typography, { variant: 'body1' }, `To: ${itemDetails.item.dropoff_location || 'Not specified'}`)
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(EventIcon, { sx: { mr: 1, color: '#3f51b5' } }),
            React.createElement(Typography, { variant: 'body1' }, 
              `Date: ${itemDetails.item.date ? new Date(itemDetails.item.date).toLocaleDateString() : 'Not specified'}`
            )
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(AccessTimeIcon, { sx: { mr: 1, color: '#3f51b5' } }),
            React.createElement(Typography, { variant: 'body1' }, `Time: ${formatTime(itemDetails.item.time)}`)
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(AirlineSeatReclineNormalIcon, { sx: { mr: 1, color: '#3f51b5' } }),
            React.createElement(Typography, { variant: 'body1' }, 
              `Available Seats: ${itemDetails.item.available_seats || 'Not specified'}`
            )
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(AttachMoneyIcon, { sx: { mr: 1, color: 'success.main' } }),
            React.createElement(Typography, { variant: 'body1', fontWeight: 'bold', color: 'success.main' }, 
              `Price: $${itemDetails.item.price || 'Free'}`
            )
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(PersonIcon, { sx: { mr: 1, color: '#3f51b5' } }),
            React.createElement(Typography, { variant: 'body1' }, 
              `Posted by: ${itemDetails.item.user_name || 'Unknown'}`
            )
          ),
          itemDetails.item.description && React.createElement(
            Box,
            { sx: { mt: 2 } },
            React.createElement(Typography, { variant: 'body1' }, 
              `Additional Information: ${itemDetails.item.description}`
            )
          )
        )
      ),
      React.createElement(
        DialogActions,
        null,
        React.createElement(Button, { onClick: handleCloseItemDetails }, 'Close')
      )
    ),
    
    // Edit Item Dialog
    React.createElement(
      Dialog,
      { open: editItemOpen, onClose: handleCloseEdit },
      React.createElement(DialogTitle, null, 'Edit Ride Share Post'),
      React.createElement(
        DialogContent,
        null,
        editItemData && React.createElement(
          Box,
          { sx: { mt: 1 } },
          React.createElement(
            TextField,
            {
              label: 'Pickup Location',
              value: editItemData.pickup_location || '',
              onChange: (e) => setEditItemData({ ...editItemData, pickup_location: e.target.value }),
              fullWidth: true,
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Dropoff Location',
              value: editItemData.dropoff_location || '',
              onChange: (e) => setEditItemData({ ...editItemData, dropoff_location: e.target.value }),
              fullWidth: true,
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Date',
              value: editItemData.date || '',
              onChange: (e) => setEditItemData({ ...editItemData, date: e.target.value }),
              fullWidth: true,
              type: 'date',
              InputLabelProps: { shrink: true },
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Time',
              value: editItemData.time || '',
              onChange: (e) => setEditItemData({ ...editItemData, time: e.target.value }),
              fullWidth: true,
              type: 'time',
              InputLabelProps: { shrink: true },
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Available Seats',
              value: editItemData.available_seats || '',
              onChange: (e) => setEditItemData({ ...editItemData, available_seats: e.target.value }),
              fullWidth: true,
              type: 'number',
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Price',
              value: editItemData.price || '',
              onChange: (e) => setEditItemData({ ...editItemData, price: e.target.value }),
              fullWidth: true,
              type: 'number',
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Description',
              value: editItemData.description || '',
              onChange: (e) => setEditItemData({ ...editItemData, description: e.target.value }),
              fullWidth: true,
              multiline: true,
              rows: 3,
              sx: { mb: 2 }
            }
          )
        )
      ),
      React.createElement(
        DialogActions,
        null,
        React.createElement(Button, { onClick: handleCloseEdit }, 'Cancel'),
        React.createElement(Button, { onClick: handleSaveEdit, variant: 'contained', color: 'primary' }, 'Save')
      )
    ),
    
    // Delete Confirmation Dialog
    React.createElement(
      Dialog,
      { open: deleteItemOpen, onClose: handleCloseDelete },
      React.createElement(DialogTitle, null, 'Confirm Delete'),
      React.createElement(
        DialogContent,
        null,
        React.createElement(Typography, { variant: 'body1' }, 'Are you sure you want to delete this ride share post? This action cannot be undone.')
      ),
      React.createElement(
        DialogActions,
        null,
        React.createElement(Button, { onClick: handleCloseDelete }, 'Cancel'),
        React.createElement(Button, { onClick: handleConfirmDelete, variant: 'contained', color: 'error' }, 'Delete')
      )
    ),
    
    // Snackbar for notifications
    React.createElement(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 6000,
        onClose: handleSnackbarClose
      },
      React.createElement(Alert, { onClose: handleSnackbarClose, severity: snackbar.severity, sx: { width: '100%' } }, snackbar.message)
    )
  );
};

export default RideShareManagement;
