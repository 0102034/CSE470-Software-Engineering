// LostFoundManagement.js - Pure JavaScript implementation with React.createElement
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LostFoundManagement.css';
import {
  Container, Typography, Box, Grid, Card, CardContent, CardMedia, CardActions,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, MenuItem, Select, FormControl,
  InputLabel, Snackbar, Alert, Chip, Paper, List, ListItem,
  ListItemText, CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Category as CategoryIcon,
  LocationOn as LocationOnIcon,
  Event as EventIcon,
  ContactMail as ContactMailIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const LostFoundManagement = () => {
  // State for lost and found items
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for item details dialog
  const [itemDetails, setItemDetails] = useState({ open: false, item: null });
  
  // State for edit dialog
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItemData, setEditItemData] = useState(null);
  
  // State for delete confirmation
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  
  // State for current user
  const [currentUser, setCurrentUser] = useState(null);
  
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

  // Fetch lost and found items
  const fetchLostFoundItems = async () => {
    setLoading(true);
    try {
      // Get admin token for authentication
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) throw new Error('Admin authentication required');
      
      // Create axios instance with proper headers
      const axiosInstance = axios.create({
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fetching real lost and found items from database...');
      
      // Try to fetch real data using the correct endpoint
      let allItems = [];
      
      try {
        // First try to fetch from the user-facing endpoint which is more likely to work
        const response = await axios.get('/api/lost-found/items', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || adminToken}`
          },
          // Add cache-busting parameter to prevent caching
          params: { _: new Date().getTime() }
        });
        
        console.log('Lost & Found response from user endpoint:', response.data);
        allItems = response.data || [];
      } catch (error) {
        console.error('Error fetching from user endpoint, trying admin endpoints:', error);
        
        // Try admin endpoints
        try {
          // Try the combined admin endpoint
          const adminResponse = await axiosInstance.get('/api/admin/lost-found', {
            params: { _: new Date().getTime() } // Cache-busting
          });
          console.log('Lost & Found response from admin endpoint:', adminResponse.data);
          
          if (adminResponse.data && adminResponse.data.items) {
            allItems = adminResponse.data.items;
          }
        } catch (adminError) {
          console.error('Error fetching from admin endpoint:', adminError);
          
          // Last attempt - try separate admin endpoints
          try {
            const [lostResponse, foundResponse] = await Promise.all([
              axiosInstance.get('/api/admin/lost-items', { params: { _: new Date().getTime() } }),
              axiosInstance.get('/api/admin/found-items', { params: { _: new Date().getTime() } })
            ]);
            
            console.log('Lost items response:', lostResponse.data);
            console.log('Found items response:', foundResponse.data);
            
            allItems = [...(lostResponse.data || []), ...(foundResponse.data || [])];
          } catch (separateError) {
            console.error('Error fetching from separate admin endpoints:', separateError);
            
            // If all real data fetching fails, use sample data
            console.log('Using sample data as fallback...');
            allItems = [];
          }
        }
      }
      
      // Separate lost and found items
      const lostItems = allItems.filter(item => 
        item.type === 'lost' || item.item_type === 'lost'
      );
      
      const foundItems = allItems.filter(item => 
        item.type === 'found' || item.item_type === 'found'
      );
      
      console.log('Fetched lost items:', lostItems);
      console.log('Fetched found items:', foundItems);
      
      // Process lost items
      const processedLostItems = lostItems.map(item => {
        console.log('Processing lost item with data:', item);
        return {
          ...item,
          id: item._id || item.id, // Ensure id is available for operations
          type: 'lost',
          title: item.title || 'Untitled Lost Item',
          description: item.description || 'No description provided',
          category: item.category || 'Other',
          location: item.location || 'Unknown',
          status: item.status || 'active',
          date_formatted: item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date',
          created_at_formatted: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown',
          image: item.image || 'https://via.placeholder.com/300x200?text=No+Image',
          // Extract phone number from different possible locations in the data
          contact_info: item.contact_info || item.contact || 
                       (item.user && item.user.phone) || 
                       (item.user_details && item.user_details.phone) ||
                       (item.contact_details && item.contact_details.phone) || 'Not provided'
        };
      });
      
      // Process found items
      const processedFoundItems = foundItems.map(item => {
        console.log('Processing found item with data:', item);
        return {
          ...item,
          id: item._id || item.id, // Ensure id is available for operations
          type: 'found',
          title: item.title || 'Untitled Found Item',
          description: item.description || 'No description provided',
          category: item.category || 'Other',
          location: item.location || 'Unknown',
          status: item.status || 'active',
          date_formatted: item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date',
          created_at_formatted: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown',
          image: item.image || 'https://via.placeholder.com/300x200?text=No+Image',
          // Extract phone number from different possible locations in the data
          contact_info: item.contact_info || item.contact || 
                       (item.user && item.user.phone) || 
                       (item.user_details && item.user_details.phone) ||
                       (item.contact_details && item.contact_details.phone) || 'Not provided'
        };
      });
      
      // Update state with processed items
      setLostItems(processedLostItems);
      setFoundItems(processedFoundItems);
      setLoading(false);
      
      console.log('Processed lost items:', processedLostItems);
      console.log('Processed found items:', processedFoundItems);
    } catch (error) {
      console.error('Error fetching lost and found items:', error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Error loading items: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchLostFoundItems();
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
      if (!editItemData) return;
      
      // Check if it's a sample item (starts with 'sample-')
      const isSampleItem = String(editItemData._id || editItemData.id).startsWith('sample-');
      
      // Prepare data for update
      const updateData = {
        title: editItemData.title,
        description: editItemData.description,
        category: editItemData.category,
        location: editItemData.location,
        contact_info: editItemData.contact_info || editItemData.user?.phone || '',
        item_type: editItemData.type || editItemData.item_type // Make sure to include the item type
      };
      
      if (isSampleItem) {
        console.log('Updating sample item:', editItemData.id || editItemData._id);
        // For sample items, just update the UI without API call
        if (editItemData.type === 'lost' || editItemData.item_type === 'lost') {
          setLostItems(prevItems => 
            prevItems.map(item => 
              (item.id || item._id) === (editItemData.id || editItemData._id) 
                ? { ...item, ...updateData }
                : item
            )
          );
        } else {
          setFoundItems(prevItems => 
            prevItems.map(item => 
              (item.id || item._id) === (editItemData.id || editItemData._id) 
                ? { ...item, ...updateData }
                : item
            )
          );
        }
        
        // Close dialog and show success message
        setEditItemOpen(false);
        setEditItemData(null);
        setSnackbar({
          open: true,
          message: 'Item updated successfully',
          severity: 'success'
        });
        return;
      }
      
      // For real items, proceed with API call
      // Get admin token for authentication
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) throw new Error('Admin authentication required');
      
      // Create axios instance with proper headers
      const axiosInstance = axios.create({
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Get item ID (handle both _id and id formats)
      const itemId = editItemData._id || editItemData.id;
      
      // Try all possible endpoints for update
      const endpoints = [
        `/api/admin/lost-found/${itemId}`,
        `/api/admin/lost-items/${itemId}`,
        `/api/admin/found-items/${itemId}`,
        `/api/lost-found/items/${itemId}`,
        `/api/lost-found/${itemId}`
      ];
      
      let updated = false;
      let lastError = null;
      
      // Try each endpoint with both PUT and PATCH methods
      for (const endpoint of endpoints) {
        if (updated) break;
        
        for (const method of ['put', 'patch']) {
          if (updated) break;
          
          try {
            console.log(`Trying ${method.toUpperCase()} request to ${endpoint}`);
            const response = await axiosInstance[method](endpoint, updateData);
            console.log(`Item updated via ${method.toUpperCase()} to ${endpoint}:`, response.data);
            updated = true;
            break;
          } catch (error) {
            console.log(`Failed ${method.toUpperCase()} request to ${endpoint}:`, error.message);
            lastError = error;
          }
        }
      }
      
      if (!updated) {
        throw lastError || new Error('All update endpoints failed');
      }
      
      // If we got here, at least one endpoint succeeded
      // Immediately refresh data from server to get the latest changes
      await fetchLostFoundItems();
      
      // Close dialog and show success message
      setEditItemOpen(false);
      setEditItemData(null);
      setSnackbar({
        open: true,
        message: 'Item updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating item:', error);
      setSnackbar({
        open: true,
        message: 'Error updating item: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    }
  };

  // Handle delete item
  const handleDeleteItem = (item) => {
    console.log('Deleting item:', item);
    // Make sure we have the item object, not just the ID
    const itemToDelete = typeof item === 'object' ? item : 
                         lostItems.find(i => i.id === item) || 
                         foundItems.find(i => i.id === item);
    
    if (!itemToDelete) {
      console.error('Could not find item to delete with id:', item);
      setSnackbar({
        open: true,
        message: 'Error: Could not find item to delete',
        severity: 'error'
      });
      return;
    }
    
    setDeleteItemId(itemToDelete.id);
    setDeleteItemOpen(true);
  };

  // Handle close delete confirmation
  const handleCloseDelete = () => {
    setDeleteItemOpen(false);
    setDeleteItemId(null);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    try {
      if (!deleteItemId) return;
      
      // Check if it's a sample item (starts with 'sample-')
      const isSampleItem = String(deleteItemId).startsWith('sample-');
      
      // Determine if it's a lost or found item
      const isLostItem = lostItems.some(item => 
        (item.id === deleteItemId) || (item._id === deleteItemId)
      );
      
      if (isSampleItem) {
        console.log('Deleting sample item:', deleteItemId);
        // For sample items, just update the UI without API call
        if (isLostItem) {
          setLostItems(prevItems => prevItems.filter(item => 
            (item.id !== deleteItemId) && (item._id !== deleteItemId)
          ));
        } else {
          setFoundItems(prevItems => prevItems.filter(item => 
            (item.id !== deleteItemId) && (item._id !== deleteItemId)
          ));
        }
        
        // Close dialog and show success message
        setDeleteItemOpen(false);
        setDeleteItemId(null);
        setSnackbar({
          open: true,
          message: 'Item deleted successfully',
          severity: 'success'
        });
        return;
      }
      
      // For real items, proceed with API call
      // Get admin token for authentication
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) throw new Error('Admin authentication required');
      
      // Create axios instance with proper headers
      const axiosInstance = axios.create({
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Try all possible endpoints for deletion
      const endpoints = [
        `/api/admin/lost-found/${deleteItemId}`,
        `/api/admin/lost-items/${deleteItemId}`,
        `/api/admin/found-items/${deleteItemId}`,
        `/api/lost-found/items/${deleteItemId}`,
        `/api/lost-found/${deleteItemId}`
      ];
      
      let deleted = false;
      let lastError = null;
      
      // Try each endpoint
      for (const endpoint of endpoints) {
        if (deleted) break;
        
        try {
          console.log(`Trying DELETE request to ${endpoint}`);
          const response = await axiosInstance.delete(endpoint);
          console.log(`Item deleted via ${endpoint}:`, response.data);
          deleted = true;
          break;
        } catch (error) {
          console.log(`Failed DELETE request to ${endpoint}:`, error.message);
          lastError = error;
        }
      }
      
      if (!deleted) {
        throw lastError || new Error('All delete endpoints failed');
      }
      
      // If we got here, at least one endpoint succeeded
      // Immediately refresh data from server to get the latest changes
      await fetchLostFoundItems();
      
      // Update local state for immediate UI feedback
      if (isLostItem) {
        setLostItems(prevItems => prevItems.filter(item => 
          (item.id !== deleteItemId) && (item._id !== deleteItemId)
        ));
      } else {
        setFoundItems(prevItems => prevItems.filter(item => 
          (item.id !== deleteItemId) && (item._id !== deleteItemId)
        ));
      }
      
      // Close dialog and show success message
      setDeleteItemOpen(false);
      setDeleteItemId(null);
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting item: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Render lost items as cards
  const renderLostItemsCards = () => {
    if (lostItems.length === 0) {
      // Create a sample lost item for demonstration
      const sampleLostItem = {
        id: 'sample-lost-1',
        title: 'Lost Laptop',
        description: 'MacBook Pro 13" lost in the library',
        category: 'Electronics',
        location: 'University Library',
        date: new Date(),
        date_formatted: new Date().toLocaleDateString(),
        contact_info: 'john.doe@example.com',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        status: 'active',
        user: { name: 'John Doe', email: 'john.doe@example.com' }
      };
      
      return React.createElement(
        Grid,
        { container: true, spacing: 3 },
        React.createElement(
          Grid,
          { item: true, xs: 12, sm: 6, md: 4 },
          React.createElement(
            Card,
            { 
              sx: { 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)'
                }
              } 
            },
            // Card Header
            React.createElement(
              Box, 
              { 
                sx: { 
                  p: 2, 
                  background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                  color: 'white'
                }
              },
              React.createElement(
                Typography, 
                { variant: 'h6', fontWeight: 'bold', noWrap: true },
                sampleLostItem.title
              )
            ),
            // Card Media (Image)
            sampleLostItem.image && React.createElement(
              CardMedia,
              {
                component: 'img',
                height: 140,
                image: sampleLostItem.image,
                alt: sampleLostItem.title,
                sx: { objectFit: 'cover' }
              }
            ),
            // Card Content
            React.createElement(
              CardContent,
              { sx: { flexGrow: 1, p: 2 } },
              React.createElement(
                Typography,
                { variant: 'body2', color: 'text.secondary', mb: 2 },
                sampleLostItem.description
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(CategoryIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Category: ${sampleLostItem.category}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(LocationOnIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Location: ${sampleLostItem.location}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(EventIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Date: ${sampleLostItem.date_formatted}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(ContactMailIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Contact: ${sampleLostItem.contact_info}`
                )
              ),
              React.createElement(
                Box, 
                { sx: { mt: 2 } },
                React.createElement(
                  Chip,
                  {
                    label: sampleLostItem.status === 'resolved' ? 'Found' : 'Lost',
                    color: sampleLostItem.status === 'resolved' ? 'success' : 'error',
                    size: 'small',
                    sx: { borderRadius: '4px' }
                  }
                )
              )
            ),
            // Card Actions
            React.createElement(
              CardActions,
              { sx: { justifyContent: 'space-between', p: 2 } },
              React.createElement(
                Box,
                null,
                React.createElement(
                  IconButton,
                  { 
                    color: 'primary', 
                    onClick: () => handleViewItem(sampleLostItem),
                    title: 'View Details'
                  },
                  React.createElement(VisibilityIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'secondary', 
                    onClick: () => handleEditItem(sampleLostItem),
                    title: 'Edit Item'
                  },
                  React.createElement(EditIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'error', 
                    onClick: () => handleDeleteItem(sampleLostItem),
                    title: 'Delete Item'
                  },
                  React.createElement(DeleteIcon)
                )
              )
            )
          )
        )
      );
    }
    
    return React.createElement(
      Grid,
      { container: true, spacing: 3 },
      lostItems.map(item => (
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
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)'
                }
              } 
            },
            // Card Header
            React.createElement(
              Box, 
              { 
                sx: { 
                  p: 2, 
                  background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                  color: 'white'
                }
              },
              React.createElement(
                Typography, 
                { variant: 'h6', fontWeight: 'bold', noWrap: true },
                item.title
              )
            ),
            // Card Media (Image)
            item.image && React.createElement(
              CardMedia,
              {
                component: 'img',
                height: 140,
                image: item.image,
                alt: item.title,
                sx: { objectFit: 'cover' }
              }
            ),
            // Card Content
            React.createElement(
              CardContent,
              { sx: { flexGrow: 1, p: 2 } },
              React.createElement(
                Typography,
                { variant: 'body2', color: 'text.secondary', mb: 2 },
                item.description
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(CategoryIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Category: ${item.category}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(LocationOnIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Location: ${item.location}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(EventIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Date: ${item.date_formatted}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(ContactMailIcon, { sx: { mr: 1, color: '#f44336' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Contact: ${item.contact_info || item.contact || 
                            (item.user && item.user.phone) || 
                            (item.user_details && item.user_details.phone) || 'Not provided'}`
                )
              ),
              React.createElement(
                Box, 
                { sx: { mt: 2 } },
                React.createElement(
                  Chip,
                  {
                    label: item.status === 'resolved' ? 'Found' : 'Lost',
                    color: item.status === 'resolved' ? 'success' : 'error',
                    size: 'small',
                    sx: { borderRadius: '4px' }
                  }
                )
              )
            ),
            // Card Actions
            React.createElement(
              CardActions,
              { sx: { justifyContent: 'space-between', p: 2 } },
              React.createElement(
                Box,
                null,
                React.createElement(
                  IconButton,
                  { 
                    color: 'primary', 
                    onClick: () => handleViewItem(item),
                    title: 'View Details'
                  },
                  React.createElement(VisibilityIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'secondary', 
                    onClick: () => handleEditItem(item),
                    title: 'Edit Item'
                  },
                  React.createElement(EditIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'error', 
                    onClick: () => handleDeleteItem(item),
                    title: 'Delete Item'
                  },
                  React.createElement(DeleteIcon)
                )
              )
            )
          )
        )
      ))
    );
  };

  // Render found items as cards
  const renderFoundItemsCards = () => {
    if (foundItems.length === 0) {
      // Create a sample found item for demonstration
      const sampleFoundItem = {
        id: 'sample-found-1',
        title: 'Found Student ID Card',
        description: 'BRAC University student ID card found near the cafeteria',
        category: 'ID/Documents',
        location: 'University Cafeteria',
        date: new Date(),
        date_formatted: new Date().toLocaleDateString(),
        contact_info: 'jane.smith@example.com',
        image: 'https://images.unsplash.com/photo-1586301913727-ab2b9f552be1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        status: 'active',
        user: { name: 'Jane Smith', email: 'jane.smith@example.com' }
      };
      
      return React.createElement(
        Grid,
        { container: true, spacing: 3 },
        React.createElement(
          Grid,
          { item: true, xs: 12, sm: 6, md: 4 },
          React.createElement(
            Card,
            { 
              sx: { 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)'
                }
              } 
            },
            // Card Header
            React.createElement(
              Box, 
              { 
                sx: { 
                  p: 2, 
                  background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                  color: 'white'
                }
              },
              React.createElement(
                Typography, 
                { variant: 'h6', fontWeight: 'bold', noWrap: true },
                sampleFoundItem.title
              )
            ),
            // Card Media (Image)
            sampleFoundItem.image && React.createElement(
              CardMedia,
              {
                component: 'img',
                height: 140,
                image: sampleFoundItem.image,
                alt: sampleFoundItem.title,
                sx: { objectFit: 'cover' }
              }
            ),
            // Card Content
            React.createElement(
              CardContent,
              { sx: { flexGrow: 1, p: 2 } },
              React.createElement(
                Typography,
                { variant: 'body2', color: 'text.secondary', mb: 2 },
                sampleFoundItem.description
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(CategoryIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Category: ${sampleFoundItem.category}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(LocationOnIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Location: ${sampleFoundItem.location}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(EventIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Date: ${sampleFoundItem.date_formatted}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(ContactMailIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Contact: ${sampleFoundItem.contact_info}`
                )
              ),
              React.createElement(
                Box, 
                { sx: { mt: 2 } },
                React.createElement(
                  Chip,
                  {
                    label: sampleFoundItem.status === 'resolved' ? 'Claimed' : 'Found',
                    color: sampleFoundItem.status === 'resolved' ? 'secondary' : 'success',
                    size: 'small',
                    sx: { borderRadius: '4px' }
                  }
                )
              )
            ),
            // Card Actions
            React.createElement(
              CardActions,
              { sx: { justifyContent: 'space-between', p: 2 } },
              React.createElement(
                Box,
                null,
                React.createElement(
                  IconButton,
                  { 
                    color: 'primary', 
                    onClick: () => handleViewItem(sampleFoundItem),
                    title: 'View Details'
                  },
                  React.createElement(VisibilityIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'secondary', 
                    onClick: () => handleEditItem(sampleFoundItem),
                    title: 'Edit Item'
                  },
                  React.createElement(EditIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'error', 
                    onClick: () => handleDeleteItem(sampleFoundItem),
                    title: 'Delete Item'
                  },
                  React.createElement(DeleteIcon)
                )
              )
            )
          )
        )
      );
    }
    
    return React.createElement(
      Grid,
      { container: true, spacing: 3 },
      foundItems.map(item => (
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
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)'
                }
              } 
            },
            // Card Header
            React.createElement(
              Box, 
              { 
                sx: { 
                  p: 2, 
                  background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                  color: 'white'
                }
              },
              React.createElement(
                Typography, 
                { variant: 'h6', fontWeight: 'bold', noWrap: true },
                item.title
              )
            ),
            // Card Media (Image)
            item.image && React.createElement(
              CardMedia,
              {
                component: 'img',
                height: 140,
                image: item.image,
                alt: item.title,
                sx: { objectFit: 'cover' }
              }
            ),
            // Card Content
            React.createElement(
              CardContent,
              { sx: { flexGrow: 1, p: 2 } },
              React.createElement(
                Typography,
                { variant: 'body2', color: 'text.secondary', mb: 2 },
                item.description
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(CategoryIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Category: ${item.category}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(LocationOnIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Location: ${item.location}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(EventIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Date: ${item.date_formatted}`
                )
              ),
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(ContactMailIcon, { sx: { mr: 1, color: '#4CAF50' } }),
                React.createElement(
                  Typography,
                  { variant: 'body2', color: 'text.secondary' },
                  `Contact: ${item.contact_info || 'Not provided'}`
                )
              ),
              React.createElement(
                Box, 
                { sx: { mt: 2 } },
                React.createElement(
                  Chip,
                  {
                    label: item.status === 'resolved' ? 'Claimed' : 'Found',
                    color: item.status === 'resolved' ? 'secondary' : 'success',
                    size: 'small',
                    sx: { borderRadius: '4px' }
                  }
                )
              )
            ),
            // Card Actions
            React.createElement(
              CardActions,
              { sx: { justifyContent: 'space-between', p: 2 } },
              React.createElement(
                Box,
                null,
                React.createElement(
                  IconButton,
                  { 
                    color: 'primary', 
                    onClick: () => handleViewItem(item),
                    title: 'View Details'
                  },
                  React.createElement(VisibilityIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'secondary', 
                    onClick: () => handleEditItem(item),
                    title: 'Edit Item'
                  },
                  React.createElement(EditIcon)
                ),
                React.createElement(
                  IconButton,
                  { 
                    color: 'error', 
                    onClick: () => handleDeleteItem(item),
                    title: 'Delete Item'
                  },
                  React.createElement(DeleteIcon)
                )
              )
            )
          )
        )
      ))
    );
  };

  // Return the component UI
  React.useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    // Define CSS to fix card floating and blinking
    styleEl.innerHTML = `
      .MuiCard-root {
        height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
        position: relative;
        transform: none !important;
        transition: box-shadow 0.2s ease !important;
        min-height: 450px;
        will-change: auto;
      }
      .MuiCard-root:hover {
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15) !important;
        transform: none !important;
      }
      .MuiGrid-item {
        height: 100%;
        margin-bottom: 20px;
      }
    `;
    // Append the style element to the document head
    document.head.appendChild(styleEl);
    
    // Cleanup function to remove the style element when component unmounts
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []); // Empty dependency array ensures this runs only once

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
          color: '#1565c0', 
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }
      },
      'Lost & Found Management'
    ),
    
    // Loading State
    loading ? 
      React.createElement(
        Box,
        { sx: { display: 'flex', justifyContent: 'center', p: 5 } },
        React.createElement(CircularProgress)
      ) :
      
      // Content when loaded
      React.createElement(
        Box,
        null,
        // Lost Items Section
        React.createElement(
          Paper,
          { 
            elevation: 3, 
            sx: { 
              p: 3, 
              mb: 4,
              borderRadius: '8px',
              background: 'linear-gradient(to right, #f5f7fa, #ffffff)'
            } 
          },
          React.createElement(
            Typography,
            { variant: 'h5', sx: { mb: 2, color: '#d32f2f', fontWeight: 'bold' } },
            'Lost Items'
          ),
          React.createElement(
            Grid,
            { container: true, spacing: 3 },
            lostItems.length > 0 ? 
              renderLostItemsCards() :
              React.createElement(
                Box,
                { sx: { p: 3, width: '100%', textAlign: 'center' } },
                React.createElement(
                  Typography,
                  { variant: 'body1', color: 'text.secondary' },
                  'No lost items found'
                )
              )
          )
        ),
        
        // Found Items Section
        React.createElement(
          Paper,
          { 
            elevation: 3, 
            sx: { 
              p: 3,
              borderRadius: '8px',
              background: 'linear-gradient(to right, #f5f7fa, #ffffff)'
            } 
          },
          React.createElement(
            Typography,
            { variant: 'h5', sx: { mb: 2, color: '#2e7d32', fontWeight: 'bold' } },
            'Found Items'
          ),
          React.createElement(
            Grid,
            { container: true, spacing: 3 },
            foundItems.length > 0 ? 
              renderFoundItemsCards() :
              React.createElement(
                Box,
                { sx: { p: 3, width: '100%', textAlign: 'center' } },
                React.createElement(
                  Typography,
                  { variant: 'body1', color: 'text.secondary' },
                  'No found items found'
                )
              )
          )
        )
      ),
    
    // Item Details Dialog
    React.createElement(
      Dialog,
      { 
        open: itemDetails.open, 
        onClose: handleCloseItemDetails,
        maxWidth: 'md',
        PaperProps: {
          sx: {
            borderRadius: '8px',
            p: 1
          }
        }
      },
      itemDetails.item && React.createElement(
        React.Fragment,
        null,
        React.createElement(
          DialogTitle,
          { sx: { pb: 1 } },
          React.createElement(
            Typography,
            { variant: 'h5', sx: { fontWeight: 'bold' } },
            itemDetails.item.title
          ),
          React.createElement(
            Chip,
            { 
              label: itemDetails.item.type === 'lost' ? 'Lost Item' : 'Found Item', 
              color: itemDetails.item.type === 'lost' ? 'error' : 'success', 
              size: 'small',
              sx: { ml: 1 }
            }
          )
        ),
        React.createElement(
          DialogContent,
          { dividers: true },
          React.createElement(
            Grid,
            { container: true, spacing: 2 },
            React.createElement(
              Grid,
              { item: true, xs: 12 },
              React.createElement(
                Typography,
                { variant: 'subtitle1', sx: { fontWeight: 'bold', mb: 1 } },
                'Description'
              ),
              React.createElement(
                Typography,
                { variant: 'body1', paragraph: true },
                itemDetails.item.description
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, sm: 6 },
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 2 } },
                React.createElement(CategoryIcon, { sx: { mr: 1, color: 'primary.main' } }),
                React.createElement(
                  Typography,
                  { variant: 'body1' },
                  `Category: ${itemDetails.item.category}`
                )
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, sm: 6 },
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 2 } },
                React.createElement(LocationOnIcon, { sx: { mr: 1, color: 'error.main' } }),
                React.createElement(
                  Typography,
                  { variant: 'body1' },
                  `Location: ${itemDetails.item.location}`
                )
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, sm: 6 },
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 2 } },
                React.createElement(EventIcon, { sx: { mr: 1, color: 'info.main' } }),
                React.createElement(
                  Typography,
                  { variant: 'body1' },
                  `Date: ${itemDetails.item.date_formatted}`
                )
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, sm: 6 },
              React.createElement(
                Box,
                { sx: { display: 'flex', alignItems: 'center', mb: 2 } },
                React.createElement(ContactMailIcon, { sx: { mr: 1, color: 'success.main' } }),
                React.createElement(
                  Typography,
                  { variant: 'body1' },
                  `Contact: ${itemDetails.item.contact_info || 'Not provided'}`
                )
              )
            )
          ),
          itemDetails.item.image && React.createElement(
            Box,
            { sx: { mt: 2 } },
            React.createElement('img', { 
              src: itemDetails.item.image, 
              alt: 'Item Image', 
              style: { 
                maxWidth: '100%', 
                maxHeight: '300px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              } 
            })
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
      React.createElement(DialogTitle, null, 'Edit Item'),
      React.createElement(
        DialogContent,
        null,
        editItemData && React.createElement(
          Box,
          { sx: { mt: 1 } },
          React.createElement(
            TextField,
            {
              label: 'Title',
              value: editItemData.title || '',
              onChange: (e) => setEditItemData({ ...editItemData, title: e.target.value }),
              fullWidth: true,
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
          ),
          React.createElement(
            TextField,
            {
              label: 'Category',
              value: editItemData.category || '',
              onChange: (e) => setEditItemData({ ...editItemData, category: e.target.value }),
              fullWidth: true,
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Location',
              value: editItemData.location || '',
              onChange: (e) => setEditItemData({ ...editItemData, location: e.target.value }),
              fullWidth: true,
              sx: { mb: 2 }
            }
          ),
          React.createElement(
            TextField,
            {
              label: 'Contact Info',
              value: editItemData.contact_info || '',
              onChange: (e) => setEditItemData({ ...editItemData, contact_info: e.target.value }),
              fullWidth: true,
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
        React.createElement(Typography, { variant: 'body1' }, 'Are you sure you want to delete this item? This action cannot be undone.')
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

export default LostFoundManagement;
