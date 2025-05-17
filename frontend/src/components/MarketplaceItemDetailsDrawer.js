import React, { useState } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  Divider, 
  IconButton, 
  Grid, 
  Button,
  Stack,
  Avatar,
  Chip,
  Dialog,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import PersonIcon from '@mui/icons-material/Person';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CategoryIcon from '@mui/icons-material/Category';
import axios from 'axios';
import MarketplaceItemForm from './MarketplaceItemForm';

const MarketplaceItemDetailsDrawer = ({ open, item, onClose, onEditSuccess, onDeleteSuccess, showActions = false }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!item) return null;

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = currentUser.id === item.user_id;
  const isAdmin = localStorage.getItem('adminToken') !== null;
  const canModify = isOwner || isAdmin;

  // Format creation date
  const formattedDate = item.created_at 
    ? new Date(item.created_at).toLocaleDateString() 
    : 'N/A';

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setImageDialogOpen(true);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const response = await axios.delete(`/api/marketplace/items/${item._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (onDeleteSuccess) {
        onDeleteSuccess(item._id);
      }
      
      setDeleteDialogOpen(false);
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.response?.data?.error || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = (updatedItem) => {
    setEditDialogOpen(false);
    if (onEditSuccess) {
      onEditSuccess(updatedItem);
    }
  };

  return (
    <>
      <Drawer 
        anchor="right" 
        open={open} 
        onClose={onClose} 
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 500 }, p: 0 } }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">Item Details</Typography>
            <IconButton onClick={onClose} size="large">
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Main image */}
          {item.images && item.images.length > 0 ? (
            <Box 
              sx={{ 
                height: 300, 
                width: '100%', 
                overflow: 'hidden', 
                mb: 2, 
                borderRadius: 2,
                position: 'relative'
              }}
              onClick={() => handleImageClick(0)}
            >
              <img 
                src={item.images[0]} 
                alt={item.title} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  cursor: 'pointer'
                }} 
              />
            </Box>
          ) : (
            <Box 
              sx={{ 
                height: 300, 
                width: '100%', 
                mb: 2, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f5f5f5'
              }}
            >
              <ImageIcon sx={{ fontSize: 80, color: '#bdbdbd' }} />
            </Box>
          )}
          
          {/* Thumbnail images */}
          {item.images && item.images.length > 1 && (
            <Grid container spacing={1} sx={{ mb: 3 }}>
              {item.images.map((img, idx) => (
                <Grid item xs={4} key={idx}>
                  <Box 
                    sx={{ 
                      height: 80, 
                      borderRadius: 1, 
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: idx === selectedImageIndex ? '2px solid #1976d2' : 'none'
                    }}
                    onClick={() => handleImageClick(idx)}
                  >
                    <img 
                      src={img} 
                      alt={`${item.title} ${idx + 1}`} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Item details */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h5" fontWeight="bold">{item.title}</Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">${item.price}</Typography>
            </Box>
            
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip 
                icon={<CategoryIcon />} 
                label={item.category} 
                variant="outlined" 
                color="primary" 
              />
              {item.condition && (
                <Chip 
                  label={item.condition} 
                  variant="outlined" 
                />
              )}
            </Stack>
            
            <Typography variant="body1" sx={{ mb: 3 }}>{item.description}</Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Seller information */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {item.user?.name || 'Unknown Seller'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Posted on {formattedDate}
                </Typography>
              </Box>
            </Box>
            
            {/* Action buttons */}
            {showActions && canModify && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<EditIcon />} 
                  onClick={handleEditClick}
                  fullWidth
                >
                  Edit
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />} 
                  onClick={handleDeleteClick}
                  fullWidth
                >
                  Delete
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
      
      {/* Image dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setImageDialogOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
          {item.images && item.images.length > 0 && (
            <img
              src={item.images[selectedImageIndex]}
              alt={item.title}
              style={{ maxWidth: '100%', maxHeight: '90vh', display: 'block' }}
            />
          )}
        </Box>
      </Dialog>
      
      {/* Edit dialog */}
      {editDialogOpen && (
        <MarketplaceItemForm
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          item={item}
          isEdit={true}
          onSuccess={handleEditSuccess}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Confirm Deletion</Typography>
          <Typography variant="body1">
            Are you sure you want to delete "{item.title}"? This action cannot be undone.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleDeleteConfirm}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default MarketplaceItemDetailsDrawer;
