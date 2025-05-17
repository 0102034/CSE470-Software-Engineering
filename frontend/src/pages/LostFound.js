import React, { useState, useEffect, useRef } from 'react';
import SimpleMessageDialog from '../components/SimpleMessageDialog';
import withNotificationBanner from '../components/withNotificationBanner';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Chip,
  Tabs,
  Tab,
  IconButton,
  InputAdornment
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Category as CategoryIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarTodayIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Add as AddIcon,
  HelpOutline as HelpOutlineIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Import CSS styles
import '../styles/pages/LostFound.css';
import '../AppBackgrounds.css';

// Import our custom components
import LostFoundItem from '../components/LostFoundItem';
import LostFoundFilters from '../components/LostFoundFilters';
import LostFoundForm from '../components/LostFoundForm';

// Styled components for the Lost & Found page
const GradientBox = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #FF5252 0%, #6a11cb 50%, #2575fc 100%)',
  padding: theme.spacing(4, 2),
  marginBottom: theme.spacing(4),
  borderRadius: '16px',
  textAlign: 'center',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: '-50%',
    left: '-10%',
    right: '-10%',
    height: '60%',
    background: 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
    borderRadius: '50%',
    transform: 'scaleX(1.5)',
    animation: `${waveAnimation} 10s infinite linear`
  }
}));

const StyledCard = styled(Card)(({ theme, itemType }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: itemType === 'lost' 
      ? '0 12px 20px rgba(255, 82, 82, 0.2)' 
      : '0 12px 20px rgba(0, 200, 83, 0.2)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '5px',
    background: itemType === 'lost' 
      ? 'linear-gradient(90deg, #FF5252, #FF7676)' 
      : 'linear-gradient(90deg, #00C853, #69F0AE)',
  },
  boxShadow: itemType === 'lost' 
    ? '0 8px 20px rgba(255, 82, 82, 0.15)' 
    : '0 8px 20px rgba(0, 200, 83, 0.15)',
  border: itemType === 'lost'
    ? '1px solid rgba(255, 82, 82, 0.1)'
    : '1px solid rgba(0, 200, 83, 0.1)',
}));

const StyledCardMedia = styled(CardMedia)({
  height: 200,
  backgroundSize: 'cover',
  transition: 'transform 0.5s',
  '&:hover': {
    transform: 'scale(1.05)',
  },
});

const StyledChip = styled(Chip)(({ theme, color }) => ({
  fontWeight: 'bold',
  borderRadius: '16px',
  padding: '0 8px',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
}));

const SearchBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  }
}));

const waveAnimation = keyframes`
  0% {
    transform: translateX(0) translateZ(0) scaleY(1);
  }
  50% {
    transform: translateX(-25%) translateZ(0) scaleY(0.8);
  }
  100% {
    transform: translateX(-50%) translateZ(0) scaleY(1);
  }
`;

// Background container for the page
const PageContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#f8f9fa',
  minHeight: '100vh',
  paddingBottom: theme.spacing(6),
}));

const ColoredTab = styled(Tab)(({ theme, index }) => ({
  minHeight: 60,
  fontSize: '1rem',
  transition: 'all 0.3s',
  '&.Mui-selected': {
    color: index === 0 ? '#FF5252' : '#00C853',
    fontWeight: 'bold',
    background: index === 0 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(0, 200, 83, 0.1)',
    borderRadius: '8px',
  }
}));

const ActionButton = styled(Button)(({ theme, color }) => ({
  borderRadius: '30px',
  padding: theme.spacing(1, 3),
  fontWeight: 'bold',
  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
  },
  ...(color === 'lost' && {
    backgroundColor: '#F44336',
    '&:hover': {
      backgroundColor: '#D32F2F',
    }
  }),
  ...(color === 'found' && {
    backgroundColor: '#4CAF50',
    '&:hover': {
      backgroundColor: '#388E3C',
    }
  })
}));

// Category options
const CATEGORIES = [
  'Electronics',
  'Personal Items',
  'ID Cards',
  'Books & Notes',
  'Clothing',
  'Jewelry',
  'Educational',
  'Other'
];

// Location options for BRAC University's new campus
const LOCATIONS = [
  // Floors
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
  '7th Floor',
  '8th Floor',
  '9th Floor',
  '10th Floor',
  '11th Floor',
  '12th Floor',
  'Top Ground Field',
  'Jogging Track',
  // Specific locations
  'Auditorium',
  'Multipurpose Hall',
  'Football Ground',
  'Cafeteria',
  'Indoor Games Room',
  'Prayer Room',
  'Medical Center',
  'Parking Area',
  'Library',
  'Computer Lab',
  'Science Lab',
  'Faculty Lounge',
  'Student Lounge',
  'Reception Area',
  'Other'
];

const LostFound = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [idCardDialogOpen, setIdCardDialogOpen] = useState(false);
  const [selectedIdCardImage, setSelectedIdCardImage] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedContactItem, setSelectedContactItem] = useState(null);
  const [contactDialog, setContactDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    category: '',
    location: '',
    dateRange: ''
  });
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    address: '',
    date: '',
    status: 'lost',
    contact: '',
    phone: '',
    reward: '',
    image: null,
    idCardImage: null
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [previewIdCardImage, setPreviewIdCardImage] = useState(null);
  
  // Helper function to check if the current user is the creator of an item
  const isItemCreator = (item) => {
    if (!item || !item.user_id || !currentUser || !currentUser._id) return false;
    
    // Use string comparison to handle different ID formats
    return String(item.user_id) === String(currentUser._id);
  };

  // Get current user information
  const getCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Use jwt-decode library to decode the token (more reliable than manual parsing)
        try {
          const decoded = jwtDecode(token);
          
          if (decoded && decoded.sub) {
            // Set user data from token to prevent unnecessary API calls
            setCurrentUser({
              _id: decoded.sub,
              email: decoded.email || '',
              name: decoded.name || 'User'
            });
            setIsAuthenticated(true);
          }
        } catch (decodeError) {
          console.error('Error decoding token:', decodeError);
          
          // Try manual parsing as fallback
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            
            if (payload && payload.sub) {
              setCurrentUser({
                _id: payload.sub,
                email: payload.email || '',
                name: payload.name || 'User'
              });
              setIsAuthenticated(true);
            }
          } catch (manualDecodeError) {
            console.error('Manual token decode failed:', manualDecodeError);
            setIsAuthenticated(true); // Keep user authenticated even if we can't get details
          }
        }
        
        // Only try API calls if token decoding completely failed
        // But we won't rely on these since they're currently failing
        console.log('Token decoding failed, API calls will likely fail too');
        setIsAuthenticated(true); // Keep user authenticated even if we can't get details
      } catch (error) {
        console.error('Error in user authentication flow:', error);
        // Only remove token for authentication errors (401)
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        } else {
          // For other errors, keep the user logged in
          setIsAuthenticated(true);
        }
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    document.body.classList.add('lost-found-page');
    getCurrentUser(); // Get user info when component mounts
    return () => {
      document.body.classList.remove('lost-found-page');
    };
  }, []);

  // Function to fetch lost and found items from the API
  const fetchItems = async () => {
    // Don't check loading state here as it can cause issues
    
    try {
      setLoading(true); // Set loading state just before the API call
      
      // Get all items from the API
      const response = await axios.get('/api/lost-found/items', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Process the data
      const allItems = response.data || [];
      
      // Separate lost and found items
      const lostItems = allItems.filter(item => item.item_type === 'lost');
      const foundItems = allItems.filter(item => item.item_type === 'found');
      
      setLostItems(lostItems);
      setFoundItems(foundItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      // Initialize with empty arrays instead of mock data
      setLostItems([]);
      setFoundItems([]);
      
      setSnackbar({
        open: true,
        message: 'Failed to load items. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false); // Always ensure loading is set to false
    }
  };

  // Fetch items only once when component mounts
  useEffect(() => {
    fetchItems();
    
    // Add a safety timeout to ensure loading state is reset even if fetch fails
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 seconds timeout
    
    // Clean up the timeout when component unmounts
    return () => clearTimeout(safetyTimeout);
  }, []); // Empty dependency array ensures this runs only once

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (itemType) => {
    setNewItem({
      ...newItem,
      status: itemType
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewItem({
      title: '',
      description: '',
      category: '',
      location: '',
      address: '',
      date: '',
      status: 'lost',
      contact: '',
      phone: '',
      reward: '',
      image: null,
      idCardImage: null
    });
    setPreviewImage(null);
    setPreviewIdCardImage(null);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter({
      ...filter,
      [name]: value
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewItem({
      ...newItem,
      [name]: value
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: 'Image is too large. Maximum size is 5MB.',
          severity: 'error'
        });
        return;
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
        // Store base64 data for submission
        setNewItem(prev => ({ ...prev, image: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ID card image handling removed as requested

  const handleOpenIdCardDialog = (idCardImage) => {
    setSelectedIdCardImage(idCardImage);
    setIdCardDialogOpen(true);
  };

  const handleCloseIdCardDialog = () => {
    setIdCardDialogOpen(false);
  };

  // Handle closing the contact dialog
  const handleCloseContactDialog = () => {
    setContactDialog(false);
    setSelectedItem(null);
  };

  // Function to handle editing an item will be defined below
  
  const handleSubmit = async () => {
    if (!newItem.title || !newItem.description || !newItem.category || !newItem.location || !newItem.date) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const endpoint = newItem._id
        ? `/api/lost-found/items/${newItem._id}`
        : '/api/lost-found/items';
      
      const method = newItem._id ? 'put' : 'post';
      
      // Prepare data for API
      const itemData = {
        title: newItem.title,
        description: newItem.description,
        category: newItem.category,
        location: newItem.location,
        date: newItem.date,
        item_type: newItem.status,
        contact: newItem.contact || '',
        phone: newItem.phone || '',
        address: newItem.address || ''
      };
      
      // Add reward for lost items
      if (newItem.status === 'lost' && newItem.reward) {
        itemData.reward = newItem.reward;
      }
      
      // Add image if available
      if (newItem.image) {
        itemData.image = newItem.image;
      }
      
      console.log('Submitting item with data:', itemData);
      
      // Set headers for JSON request
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const response = await axios[method](endpoint, itemData, { headers });
      console.log('Item submission response:', response.data);
      
      setSnackbar({
        open: true,
        message: newItem._id
          ? 'Item updated successfully'
          : `${newItem.status === 'lost' ? 'Lost' : 'Found'} item reported successfully`,
        severity: 'success'
      });
      
      // Close dialog and reset form
      handleCloseDialog();
      
      // Refresh items list once after submission
      fetchItems();
    } catch (error) {
      console.error('Error submitting item:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${newItem._id ? 'update' : 'report'} item. ${error.response?.data?.error || error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter and search items
  const filteredLostItems = lostItems.filter(item => {
    // Text search in title and description
    const matchesSearch = 
      (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = 
      !filter.category || (item.category && item.category.includes(filter.category));
    
    // Location filter
    const matchesLocation = 
      !filter.location || (item.location && item.location.includes(filter.location));
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Filter and search found items
  const filteredFoundItems = foundItems.filter(item => {
    // Text search in title and description
    const matchesSearch = 
      (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = 
      !filter.category || (item.category && item.category.includes(filter.category));
    
    // Location filter
    const matchesLocation = 
      !filter.location || (item.location && item.location.includes(filter.location));
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Get filtered items based on current tab
  const filteredItems = tabValue === 0 
    ? filteredLostItems
    : filteredFoundItems;

  // Handle edit item
  const handleEditItem = (item) => {
    console.log('Editing item:', item); // Debug log
    
    // Format the date for the date input (YYYY-MM-DD)
    let formattedDate = '';
    if (item.date) {
      try {
        // Try to parse the date and format it for the input
        const dateObj = new Date(item.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        } else {
          formattedDate = item.date;
        }
      } catch (e) {
        console.error('Error formatting date:', e);
        formattedDate = item.date;
      }
    }
    
    // Make sure all fields are properly populated for editing
    setNewItem({
      _id: item._id,
      status: item.item_type, // Set status to match item_type for the form
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      location: item.location || '',
      date: formattedDate,
      reward: item.reward || '',
      address: item.address || '',
      contact: item.contact || '',
      phone: item.phone || '',
      image: item.image || ''
    });
    
    // Set preview image if available
    if (item.image) {
      setPreviewImage(`http://localhost:5000${item.image}`);
    } else {
      setPreviewImage(null);
    }
    
    // Open the dialog with the correct item type
    setDialogOpen(true);
  };

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    // Modern delete confirmation dialog using Material UI
    setDeleteConfirmOpen(true);
    setItemToDelete(itemId);
  };
  
  // Confirm delete action
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setLoading(true);
    try {
      await axios.delete(`/api/lost-found/items/${itemToDelete}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Refresh the items list
      fetchItems();
      
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete item. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  // Handle contact button click - open the contact dialog with the selected item
  const handleContactClick = (item) => {
    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (!token) {
      setSnackbar({
        open: true,
        message: 'Please log in to contact the user',
        severity: 'warning'
      });
      return;
    }
    
    // Set the selected item and open the contact dialog
    setSelectedItem(item);
    setContactDialog(true);
  };

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
      minHeight: '100vh', 
      pb: 6,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '200px',
        background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
        opacity: 0.05,
        zIndex: 0
      }
    }}>
      <Container maxWidth="lg" sx={{ pt: 4, pb: 4, position: 'relative', zIndex: 1 }}>
        {/* Header Section with enhanced styling */}
        <GradientBox>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            Lost & Found Center
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: '800px', mx: 'auto', mb: 2, opacity: 0.9 }}>
            Lost something on campus? Found an item? Report it here to help reconnect items with their owners.
          </Typography>
        </GradientBox>
        
        {/* Search and Filter Section */}
      <SearchBox>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search lost and found items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: '12px',
                  '&:hover': {
                    boxShadow: '0 0 0 2px rgba(107, 70, 193, 0.2)'
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 0 0 2px rgba(107, 70, 193, 0.3)'
                  }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={filter.category}
                onChange={handleFilterChange}
                label="Category"
                sx={{
                  borderRadius: '12px',
                  '&:hover': {
                    boxShadow: '0 0 0 2px rgba(107, 70, 193, 0.2)'
                  }
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Location</InputLabel>
              <Select
                name="location"
                value={filter.location}
                onChange={handleFilterChange}
                label="Location"
                sx={{
                  borderRadius: '12px',
                  '&:hover': {
                    boxShadow: '0 0 0 2px rgba(107, 70, 193, 0.2)'
                  }
                }}
              >
                <MenuItem value="">All Locations</MenuItem>
                {LOCATIONS.map(location => (
                  <MenuItem key={location} value={location}>{location}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </SearchBox>

      {/* Tabs and Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ 
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px',
              background: tabValue === 0 ? 'linear-gradient(90deg, #FF5252 0%, #FF7676 100%)' : 'linear-gradient(90deg, #00C853 0%, #69F0AE 100%)'
            },
            '& .MuiTab-root': {
              transition: 'all 0.3s ease',
              fontWeight: 500,
              borderRadius: '8px 8px 0 0',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }
          }}
        >
          <ColoredTab 
            label="Lost Items" 
            icon={<HelpOutlineIcon style={{ color: '#FF5252' }} />} 
            iconPosition="start"
            index={0}
            sx={{ 
              color: tabValue === 0 ? '#FF5252' : 'rgba(0, 0, 0, 0.6)',
              fontWeight: tabValue === 0 ? 'bold' : 'normal',
              padding: '12px 16px',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 82, 82, 0.08)'
              }
            }}
          />
          <ColoredTab 
            label="Found Items" 
            icon={<CheckCircleOutlineIcon style={{ color: '#00C853' }} />} 
            iconPosition="start"
            index={1}
            sx={{ 
              color: tabValue === 1 ? '#00C853' : 'rgba(0, 0, 0, 0.6)',
              fontWeight: tabValue === 1 ? 'bold' : 'normal',
              padding: '12px 16px',
              '&.Mui-selected': {
                backgroundColor: 'rgba(0, 200, 83, 0.08)'
              }
            }}
          />
        </Tabs>
        <Box>
          {tabValue === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('lost')}
              sx={{ 
                borderRadius: '20px', 
                px: 3, 
                py: 1,
                backgroundColor: '#FF5252', 
                color: '#FFFFFF',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(255, 82, 82, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#D50000',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(255, 82, 82, 0.4)'
                }
              }}
            >
              Report Lost Item
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('found')}
              sx={{ 
                borderRadius: '20px', 
                px: 3, 
                py: 1,
                backgroundColor: '#00C853', 
                color: '#FFFFFF',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#00B248',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(0, 200, 83, 0.4)'
                }
              }}
            >
              Report Found Item
            </Button>
          )}
        </Box>
      </Box>

      {/* Items Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Loading items...
          </Typography>
        </Box>
      ) : (
        <Box>
          {tabValue === 0 && (
            <>
              {filteredLostItems.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
                  <Typography variant="h6" color="text.secondary">
                    No lost items match your search
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {filteredLostItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={item._id || `lost-${index}`}>
                      <StyledCard itemType="lost">
                        <StyledCardMedia
                          component="img"
                          image={item.image ? `http://localhost:5000${item.image}` : 'https://via.placeholder.com/400x200?text=No+Image+Available'}
                          alt={item.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/400x200?text=No+Image+Available';
                          }}
                          sx={{ height: 200, objectFit: 'contain', backgroundColor: '#f5f5f5' }}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="div">{item.title}</Typography>
                          {/* Creator information */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, backgroundColor: '#f8f9fa', p: 1, borderRadius: 1 }}>
                            <PersonIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {item.creator_name || 'Anonymous'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.creator_email || 'No email provided'}
                              </Typography>
                              {item.phone && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Phone: {item.phone}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {item.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CategoryIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">{item.category}</Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOnIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">{item.location}</Typography>
                          </Box>
                          
                          {item.address && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <HomeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                              <Typography variant="body2">{item.address}</Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">{new Date(item.date).toLocaleDateString()}</Typography>
                          </Box>
                          
                          {item.reward && (
                            <Box sx={{ mt: 2 }}>
                              <StyledChip 
                                label={`Reward: ${item.reward}`} 
                                color="primary" 
                                variant="outlined"
                              />
                            </Box>
                          )}
                        </CardContent>
                        <CardActions>
                          {/* Use isItemCreator function for proper user verification */}
                          {isItemCreator(item) ? (
                            // Show edit and delete buttons for the creator
                            <>
                              <Button 
                                size="small" 
                                color="primary"
                                startIcon={<EditIcon />}
                                onClick={() => handleEditItem(item)}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="small" 
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeleteItem(item._id)}
                              >
                                Delete
                              </Button>
                            </>
                          ) : (
                            // Show contact button for other users
                            <Button 
                              size="small" 
                              variant="contained"
                              color="primary" 
                              onClick={() => handleContactClick(item)}
                              sx={{ 
                                backgroundColor: '#4a148c',
                                '&:hover': { backgroundColor: '#6a1b9a' }
                              }}
                            >
                              Contact
                            </Button>
                          )}
                          
                          {item.idCardImage && (
                            <Button size="small" color="secondary" onClick={() => handleOpenIdCardDialog(item.idCardImage)}>
                              View ID Card
                            </Button>
                          )}
                        </CardActions>
                      </StyledCard>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {tabValue === 1 && (
            <>
              {filteredFoundItems.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
                  <Typography variant="h6" color="text.secondary">
                    No found items match your search
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {filteredFoundItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={item._id || `found-${index}`}>
                      <StyledCard itemType="found">
                        <StyledCardMedia
                          component="img"
                          image={item.image ? `http://localhost:5000${item.image}` : 'https://via.placeholder.com/400x200?text=No+Image+Available'}
                          alt={item.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/400x200?text=No+Image+Available';
                          }}
                          sx={{ height: 200, objectFit: 'contain', backgroundColor: '#f5f5f5' }}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="div">{item.title}</Typography>
                          {/* Creator information */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, backgroundColor: '#f8f9fa', p: 1, borderRadius: 1 }}>
                            <PersonIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {item.creator_name || 'Anonymous'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.creator_email || 'No email provided'}
                              </Typography>
                              {item.phone && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Phone: {item.phone}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {item.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CategoryIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">{item.category}</Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOnIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">{item.location}</Typography>
                          </Box>
                          
                          {item.address && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <HomeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                              <Typography variant="body2">{item.address}</Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">{new Date(item.date).toLocaleDateString()}</Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="body2">
                              Found by: {item.creator_name || (item.contact ? item.contact.split('@')[0] : 'Anonymous')}
                            </Typography>
                          </Box>
                        </CardContent>
                        <CardActions>
                          {/* Use isItemCreator function for proper user verification */}
                          {isItemCreator(item) ? (
                            // Show edit and delete buttons for the creator
                            <>
                              <Button 
                                size="small" 
                                color="primary"
                                startIcon={<EditIcon />}
                                onClick={() => handleEditItem(item)}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="small" 
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeleteItem(item._id)}
                              >
                                Delete
                              </Button>
                            </>
                          ) : (
                            // Show claim button for other users
                            <Button 
                              size="small" 
                              variant="contained"
                              color="success" 
                              onClick={() => handleContactClick(item)}
                              sx={{ 
                                backgroundColor: '#00C853',
                                '&:hover': { backgroundColor: '#00B248' }
                              }}
                            >
                              Claim Item
                            </Button>
                          )}
                          
                          {item.idCardImage && (
                            <Button size="small" color="secondary" onClick={() => handleOpenIdCardDialog(item.idCardImage)}>
                              View ID Card
                            </Button>
                          )}
                        </CardActions>
                      </StyledCard>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {newItem.status === 'lost' ? 'Report Lost Item' : 'Report Found Item'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                required
                value={newItem.title}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Description"
                name="description"
                required
                value={newItem.description}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={4}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={newItem.category}
                  onChange={handleInputChange}
                  label="Category"
                  required
                >
                  <MenuItem value="">Select a category</MenuItem>
                  {CATEGORIES.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Location</InputLabel>
                <Select
                  name="location"
                  value={newItem.location}
                  onChange={handleInputChange}
                  label="Location"
                  required
                >
                  <MenuItem value="">Select a location</MenuItem>
                  {LOCATIONS.map(location => (
                    <MenuItem key={location} value={location}>{location}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Date"
                name="date"
                type="date"
                required
                value={newItem.date}
                onChange={handleInputChange}
                margin="normal"
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                fullWidth
                label="Contact Email"
                name="contact"
                type="email"
                required
                value={newItem.contact}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                type="tel"
                value={newItem.phone || ''}
                onChange={handleInputChange}
                margin="normal"
                placeholder="e.g. +8801XXXXXXXXX"
              />
              {newItem.status === 'lost' && (
                <TextField
                  fullWidth
                  label="Reward (Optional)"
                  name="reward"
                  value={newItem.reward}
                  onChange={handleInputChange}
                  margin="normal"
                  placeholder="e.g. $20"
                />
              )}
              <TextField
                fullWidth
                label="Specific Address (Optional)"
                name="address"
                value={newItem.address}
                onChange={handleInputChange}
                margin="normal"
                placeholder="e.g. 3rd Floor, Room 305"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Image
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: 250,
                    border: '2px dashed #ccc',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <PhotoCamera sx={{ fontSize: 60, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Click to upload an image
                      </Typography>
                    </>
                  )}
                  <input
                    accept="image/*"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                    type="file"
                    onChange={handleImageChange}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto', textAlign: 'center' }}>
                  Please provide clear images of the item to help with identification.
                  All submissions are reviewed before being publicly listed.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color={newItem.status === 'lost' ? 'error' : 'success'}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ID Card Dialog */}
      <Dialog open={idCardDialogOpen} onClose={handleCloseIdCardDialog} maxWidth="sm" fullWidth>
        <DialogTitle>ID Card Image</DialogTitle>
        <DialogContent>
          {selectedIdCardImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <img 
                src={selectedIdCardImage} 
                alt="ID Card" 
                style={{ maxWidth: '100%', maxHeight: '70vh' }} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIdCardDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            p: 1
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ color: 'error.main', fontWeight: 'bold' }}>
          Delete Item
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this item? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            variant="contained" 
            color="error" 
            autoFocus
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)'
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Simple Message Dialog for messaging */}
      <SimpleMessageDialog
        open={contactDialog}
        onClose={handleCloseContactDialog}
        item={selectedItem}
        itemType={selectedItem?.item_type || 'lost'}
      />
      </Container>
    </Box>
  );
};

export default withNotificationBanner(LostFound, 'lost_found'); 