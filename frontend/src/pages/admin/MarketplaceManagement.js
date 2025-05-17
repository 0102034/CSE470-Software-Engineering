// MarketplaceManagement.js
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
import StoreIcon from '@mui/icons-material/Store';
import CategoryIcon from '@mui/icons-material/Category';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import axios from 'axios';

const MarketplaceManagement = () => {
  // State for marketplace items
  const [marketplaceItems, setMarketplaceItems] = useState([]);
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

  // Fetch marketplace items
  const fetchMarketplaceItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/marketplace-items');
      setMarketplaceItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch marketplace items',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchMarketplaceItems();
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
      await axios.put(`/api/marketplace-items/${editItemData.id}`, editItemData);
      
      // Update local state
      setMarketplaceItems(prevItems => 
        prevItems.map(item => item.id === editItemData.id ? editItemData : item)
      );
      
      setSnackbar({
        open: true,
        message: 'Item updated successfully',
        severity: 'success'
      });
      
      handleCloseEdit();
    } catch (error) {
      console.error('Error updating item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update item',
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
      await axios.delete(`/api/marketplace-items/${deleteItemId}`);
      
      // Update local state
      setMarketplaceItems(prevItems => prevItems.filter(item => item.id !== deleteItemId));
      
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
      
      handleCloseDelete();
    } catch (error) {
      console.error('Error deleting item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete item',
        severity: 'error'
      });
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Helper function to get gradient color based on category
  const getGradientByCategory = (category) => {
    switch (category ? category.toLowerCase() : '') {
      case 'electronics':
        return 'linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)';
      case 'books':
        return 'linear-gradient(135deg, #4caf50 0%, #1b5e20 100%)';
      case 'clothing':
        return 'linear-gradient(135deg, #9c27b0 0%, #4a148c 100%)';
      case 'furniture':
        return 'linear-gradient(135deg, #ff9800 0%, #e65100 100%)';
      case 'vehicles':
        return 'linear-gradient(135deg, #f44336 0%, #b71c1c 100%)';
      default:
        return 'linear-gradient(135deg, #607d8b 0%, #263238 100%)';
    }
  };
  
  // Helper function to get color based on category
  const getCategoryColor = (category) => {
    switch (category ? category.toLowerCase() : '') {
      case 'electronics':
        return '#2196f3';
      case 'books':
        return '#4caf50';
      case 'clothing':
        return '#9c27b0';
      case 'furniture':
        return '#ff9800';
      case 'vehicles':
        return '#f44336';
      default:
        return '#607d8b';
    }
  };

  // Render marketplace items as cards
  const renderMarketplaceItemsCards = () => {
    return React.createElement(
      Grid, 
      { container: true, spacing: 3 },
      marketplaceItems.map(item => 
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
            // Card Header with gradient based on category
            React.createElement(
              Box, 
              { 
                sx: { 
                  p: 2, 
                  background: getGradientByCategory(item.category),
                  color: 'white'
                }
              },
              React.createElement(
                Typography, 
                { variant: 'h6', fontWeight: 'bold', noWrap: true },
                item.title
              )
            ),
            // Card Media
            item.image_url ? 
              React.createElement(
                CardMedia,
                {
                  component: 'img',
                  height: 140,
                  image: item.image_url,
                  alt: item.title
                }
              ) :
              React.createElement(
                Box,
                {
                  sx: {
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f5f5f5'
                  }
                },
                React.createElement(StoreIcon, { sx: { fontSize: 60, color: '#bdbdbd' } })
              ),
            // Card Content
            React.createElement(
              CardContent, 
              { sx: { flexGrow: 1, p: 2 } },
              React.createElement(
                Box, 
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(CategoryIcon, { sx: { mr: 1, color: getCategoryColor(item.category) } }),
                React.createElement(
                  Typography, 
                  { variant: 'body2', color: 'text.secondary' },
                  item.category || 'Uncategorized'
                )
              ),
              React.createElement(
                Box, 
                { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
                React.createElement(AttachMoneyIcon, { sx: { mr: 1, color: 'success.main' } }),
                React.createElement(
                  Typography, 
                  { variant: 'body1', fontWeight: 'bold', color: 'success.main' },
                  `$${item.price}`
                )
              ),
              React.createElement(
                Box, 
                { sx: { display: 'flex', alignItems: 'flex-start', mb: 1 } },
                React.createElement(DescriptionIcon, { sx: { mr: 1, mt: 0.5, color: 'text.secondary' } }),
                React.createElement(
                  Typography, 
                  { variant: 'body2', color: 'text.secondary' },
                  item.description ? 
                    (item.description.length > 100 ? 
                      `${item.description.substring(0, 100)}...` : 
                      item.description) : 
                    'No description provided'
                )
              ),
              React.createElement(
                Box, 
                { sx: { mt: 2 } },
                React.createElement(
                  Chip,
                  {
                    label: item.status || 'Available',
                    color: item.status === 'Sold' ? 'error' : 'success',
                    size: 'small',
                    sx: { borderRadius: '4px' }
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
                    startIcon: React.createElement(ShoppingCartIcon),
                    color: 'primary',
                    sx: { mr: 1 },
                    key: 'buy'
                  },
                  'Buy Now'
                ),
                React.createElement(
                  Button,
                  {
                    size: 'small',
                    startIcon: React.createElement(ContactMailIcon),
                    color: 'secondary',
                    key: 'contact'
                  },
                  'Contact Seller'
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
          color: '#1565c0', 
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }
      },
      'Marketplace Management'
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
        // Marketplace Items Section
        React.createElement(
          Paper,
          { 
            sx: { 
              p: 3, 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }
          },
          React.createElement(
            Box,
            { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 } },
            React.createElement(
              Typography,
              { variant: 'h6', sx: { color: '#424242', fontWeight: 'bold' } },
              React.createElement(StoreIcon, { sx: { mr: 1, verticalAlign: 'middle' } }),
              `Marketplace Items (${marketplaceItems.length})`
            ),
            React.createElement(
              Button,
              { 
                variant: 'contained', 
                color: 'primary', 
                onClick: () => fetchMarketplaceItems(),
                sx: { 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)'
                  }
                }
              },
              'Refresh'
            )
          ),
          marketplaceItems.length > 0 ? renderMarketplaceItemsCards() : 
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
              React.createElement(StoreIcon, { sx: { fontSize: 48, mb: 2, color: '#757575', opacity: 0.6 } }),
              React.createElement(
                Typography,
                { variant: 'subtitle1', sx: { fontWeight: 'medium', color: '#424242' } },
                'No marketplace items found'
              ),
              React.createElement(
                Typography,
                { variant: 'body2', sx: { mt: 0.5, color: '#616161', opacity: 0.7 } },
                'Add items to the marketplace to see them here'
              )
            )
        )
      ),
    
    // Item Details Dialog
    React.createElement(
      Dialog,
      { open: itemDetails.open, onClose: handleCloseItemDetails, maxWidth: 'md' },
      React.createElement(DialogTitle, null, 'Item Details'),
      React.createElement(
        DialogContent,
        null,
        itemDetails.item && React.createElement(
          Box,
          null,
          React.createElement(Typography, { variant: 'h6', gutterBottom: true }, itemDetails.item.title),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(CategoryIcon, { sx: { mr: 1, color: getCategoryColor(itemDetails.item.category) } }),
            React.createElement(Typography, { variant: 'body1' }, itemDetails.item.category || 'Uncategorized')
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(AttachMoneyIcon, { sx: { mr: 1, color: 'success.main' } }),
            React.createElement(Typography, { variant: 'body1', fontWeight: 'bold', color: 'success.main' }, `$${itemDetails.item.price}`)
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'flex-start', mb: 1 } },
            React.createElement(DescriptionIcon, { sx: { mr: 1, mt: 0.5 } }),
            React.createElement(Typography, { variant: 'body1' }, itemDetails.item.description || 'No description provided')
          ),
          React.createElement(
            Box,
            { sx: { display: 'flex', alignItems: 'center', mb: 1 } },
            React.createElement(PersonIcon, { sx: { mr: 1 } }),
            React.createElement(Typography, { variant: 'body1' }, `Seller: ${itemDetails.item.seller_name || 'Unknown'}`)
          ),
          itemDetails.item.image_url && React.createElement(
            Box,
            { sx: { mt: 2 } },
            React.createElement('img', { 
              src: itemDetails.item.image_url, 
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
              label: 'Category',
              value: editItemData.category || '',
              onChange: (e) => setEditItemData({ ...editItemData, category: e.target.value }),
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

export default MarketplaceManagement;
