import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  IconButton,
  FormHelperText,
  styled,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Close, PhotoCamera, AddLocation, Upload, Warning } from '@mui/icons-material';

// Styled components for a colorful UI
const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: 'linear-gradient(45deg, #3f51b5, #2196f3)',
  color: 'white',
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    transition: 'all 0.3s',
    '&:hover': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)'
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.2)'
    }
  }
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    transition: 'all 0.3s',
    '&:hover': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)'
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.2)'
    }
  }
}));

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const ImagePreview = styled('img')({
  width: '100%',
  height: 'auto',
  maxHeight: '200px',
  borderRadius: '8px',
  objectFit: 'cover',
  marginBottom: '10px'
});

const StyledButton = styled(Button)(({ theme, color }) => ({
  borderRadius: '8px',
  padding: theme.spacing(1.2),
  fontWeight: 'bold',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 10px rgba(0,0,0,0.2)'
  }
}));

// Categories for lost & found items
const categories = [
  'Electronics',
  'Clothing',
  'ID/Documents',
  'Keys',
  'Jewelry',
  'Book/Notes',
  'Bag/Luggage',
  'Other'
];

// Locations for the campus
const locations = [
  'Library',
  'Student Center',
  'Science Building',
  'Dining Hall',
  'Dorm A',
  'Dorm B',
  'Sports Complex',
  'Parking Lot',
  'Classroom Building',
  'Admin Building'
];

const LostFoundForm = ({ open, onClose, isLostItem = true, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    contact: '',
    reward: '',
    image: null
  });
  
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        category: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        contact: '',
        reward: '',
        image: null
      });
      setErrors({});
      setImagePreview(null);
      setIsAnonymous(false);
    }
  }, [open]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear validation error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };
  
  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.location) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!isAnonymous && !formData.contact) {
      newErrors.contact = 'Contact information is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      const data = {
        ...formData,
        status: isLostItem ? 'Lost' : 'Found',
        contact: isAnonymous ? 'Anonymous' : formData.contact
      };
      
      onSubmit(data);
      onClose();
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { borderRadius: '16px', overflow: 'hidden' }
      }}
    >
      <StyledDialogTitle>
        {isLostItem ? 'Report Lost Item' : 'Report Found Item'}
        <IconButton 
          onClick={onClose} 
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </StyledDialogTitle>
      
      <DialogContent sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
              Please fill out the details below to report your {isLostItem ? 'lost' : 'found'} item
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledTextField
              fullWidth
              label="Item Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Blue Backpack, iPhone 12, Student ID Card"
              error={!!errors.title}
              helperText={errors.title}
              required
            />
            
            <StyledFormControl fullWidth error={!!errors.category} required>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
            </StyledFormControl>
            
            <StyledFormControl fullWidth error={!!errors.location} required>
              <InputLabel>Location</InputLabel>
              <Select
                name="location"
                value={formData.location}
                onChange={handleChange}
                label="Location"
              >
                {locations.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
              {errors.location && <FormHelperText>{errors.location}</FormHelperText>}
            </StyledFormControl>
            
            <StyledTextField
              fullWidth
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={!!errors.date}
              helperText={errors.date}
              required
            />
            
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={isAnonymous}
                    onChange={() => setIsAnonymous(!isAnonymous)}
                    color="primary"
                  />
                }
                label="Submit Anonymously"
              />
              {!isAnonymous && (
                <StyledTextField
                  fullWidth
                  label="Contact Information"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="Email or Phone Number"
                  error={!!errors.contact}
                  helperText={errors.contact || "How people can contact you"}
                  required
                />
              )}
            </Box>
            
            {isLostItem && (
              <StyledTextField
                fullWidth
                label="Reward (Optional)"
                name="reward"
                value={formData.reward}
                onChange={handleChange}
                placeholder="e.g. $20"
              />
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledTextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details about the item, any identifying features, etc."
              multiline
              rows={4}
              error={!!errors.description}
              helperText={errors.description}
              required
              sx={{ mb: 3 }}
            />
            
            <Box 
              sx={{ 
                border: '2px dashed #ccc', 
                borderRadius: '12px', 
                p: 3, 
                textAlign: 'center',
                mb: 2,
                backgroundColor: '#f8f9fa'
              }}
            >
              {imagePreview ? (
                <Box>
                  <ImagePreview src={imagePreview} alt="Preview" />
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={() => {
                      setImagePreview(null);
                      setFormData({ ...formData, image: null });
                    }}
                  >
                    Remove Image
                  </Button>
                </Box>
              ) : (
                <Box>
                  <PhotoCamera sx={{ fontSize: 40, color: '#9e9e9e', mb: 1 }} />
                  <Typography variant="body1" gutterBottom>
                    Upload an image of the {isLostItem ? 'lost' : 'found'} item
                  </Typography>
                  <Button
                    component="label"
                    variant="contained"
                    startIcon={<Upload />}
                  >
                    Upload Image
                    <VisuallyHiddenInput 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                    />
                  </Button>
                </Box>
              )}
            </Box>
            
            <Box sx={{ 
              p: 2, 
              bgcolor: '#fff8e1', 
              borderRadius: '8px',
              border: '1px solid #ffe082',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Warning color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {isLostItem 
                  ? "Note: Please check the 'Found Items' section before submitting in case your item has already been found."
                  : "Please bring the found item to the nearest Lost & Found location on campus."}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ borderRadius: '8px', px: 3 }}
        >
          Cancel
        </Button>
        <StyledButton 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          sx={{ px: 4 }}
        >
          Submit
        </StyledButton>
      </DialogActions>
    </Dialog>
  );
};

export default LostFoundForm; 