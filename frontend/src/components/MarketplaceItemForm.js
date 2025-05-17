import React, { useState, useEffect } from 'react';
import {
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Grid, 
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close, CloudUpload, Delete, Image } from '@mui/icons-material';
import axios from 'axios';

const CATEGORIES = [
  'Books',
  'Electronics',
  'Furniture',
  'Clothing',
  'Other'
];

const CONDITIONS = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor'
];

const MarketplaceItemForm = ({ open, onClose, item = null, isEdit = false, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    images: []
  });
  
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize form with item data if editing
  useEffect(() => {
    if (item && isEdit) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        price: item.price || '',
        category: item.category || '',
        condition: item.condition || ''
      });
      
      // Set image previews for existing images
      if (item.images && item.images.length > 0) {
        setImagePreviewUrls(item.images);
      }
    } else {
      // Reset form for new item
      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: ''
      });
      setImageFiles([]);
      setImagePreviewUrls([]);
    }
  }, [item, isEdit, open]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleImageChange = (e) => {
    e.preventDefault();
    
    const files = Array.from(e.target.files);
    
    // Limit to maximum 3 images
    if (imageFiles.length + files.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }
    
    // Check file types and size
    const validFiles = files.filter(file => {
      const isValidType = file.type.match(/^image\/(jpeg|png|jpg|gif)$/);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
      setError('Some files are not valid. Please upload JPEG, PNG, or GIF images under 5MB.');
    }
    
    // Update image files state
    setImageFiles([...imageFiles, ...validFiles]);
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviewUrls([...imagePreviewUrls, ...newPreviews]);
  };
  
  const handleRemoveImage = (index) => {
    // Remove from both states
    setImageFiles(prevFiles => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      return newFiles;
    });
    
    setImagePreviewUrls(prevUrls => {
      const newUrls = [...prevUrls];
      // Revoke object URL to avoid memory leaks
      if (!isEdit || index >= (item?.images?.length || 0)) {
        URL.revokeObjectURL(newUrls[index]);
      }
      newUrls.splice(index, 1);
      return newUrls;
    });
  };
  
  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.price || isNaN(formData.price) || Number(formData.price) <= 0) 
      return 'Price must be a positive number';
    if (!formData.category) return 'Category is required';
    
    // For new items, require at least one image
    if (!isEdit && imageFiles.length === 0) return 'At least one image is required';
    
    return null;
  };
  
  const handleSubmit = async () => {
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // For file uploads, we need to use FormData
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      if (formData.condition) {
        formDataToSend.append('condition', formData.condition);
      }
      
      // Add image files
      imageFiles.forEach(file => {
        formDataToSend.append('images', file);
      });
      
      let response;
      
      if (isEdit) {
        // Update existing item
        response = await axios.put(
          `/api/marketplace/items/${item._id}`, 
          formDataToSend,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        // Create new item
        response = await axios.post(
          '/api/marketplace/items', 
          formDataToSend,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }
      
      // Handle success
      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Failed to save item. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isEdit ? 'Edit Item' : 'Add New Item'}
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              margin="normal"
            />
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Category"
              >
                {CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Condition</InputLabel>
              <Select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                label="Condition"
              >
                {CONDITIONS.map(condition => (
                  <MenuItem key={condition} value={condition}>
                    {condition}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              multiline
              rows={4}
              margin="normal"
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Images (Max 3) {imagePreviewUrls.length > 0 && `- ${imagePreviewUrls.length}/3`}
              </Typography>
              
              <Box 
                sx={{ 
                  border: '2px dashed #ccc', 
                  borderRadius: 2, 
                  p: 2, 
                  textAlign: 'center',
                  mb: 2,
                  display: imagePreviewUrls.length >= 3 ? 'none' : 'block'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  id="image-upload"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                  multiple
                />
                <label htmlFor="image-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    disabled={imagePreviewUrls.length >= 3}
                  >
                    Upload Images
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  JPEG, PNG or GIF (Max. 5MB)
                </Typography>
              </Box>
              
              {imagePreviewUrls.length > 0 && (
                <Grid container spacing={1}>
                  {imagePreviewUrls.map((url, index) => (
                    <Grid item xs={4} key={index}>
                      <Box
                        sx={{
                          position: 'relative',
                          height: 100,
                          borderRadius: 1,
                          overflow: 'hidden',
                          boxShadow: 1
                        }}
                      >
                        <img 
                          src={url} 
                          alt={`Preview ${index + 1}`} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover' 
                          }} 
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255,0,0,0.5)'
                            }
                          }}
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {isEdit ? 'Save Changes' : 'Add Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MarketplaceItemForm; 