import React, { useState, useEffect } from 'react';
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
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import HomeIcon from '@mui/icons-material/Home';
import axios from 'axios';

// Import CSS styles
import '../styles/pages/LostFound.css';
import '../AppBackgrounds.css';

// Import our custom components
import LostFoundItem from '../components/LostFoundItem';
import LostFoundFilters from '../components/LostFoundFilters';
import LostFoundForm from '../components/LostFoundForm';

// Styled components for a more colorful UI
const StyledCard = styled(Card)(({ theme, itemType }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[10],
  },
  borderTop: `5px solid ${itemType === 'lost' ? theme.palette.error.main : theme.palette.success.main}`,
}));

const StyledCardMedia = styled(CardMedia)({
  height: 200,
  objectFit: 'cover',
});

const StyledChip = styled(Chip)(({ theme, color = 'primary' }) => ({
  margin: theme.spacing(0.5),
  borderRadius: '16px',
  fontWeight: 500,
}));

const GradientBox = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #673AB7 0%, #3F51B5 50%, #2196F3 100%)',
  padding: theme.spacing(6, 0),
  borderRadius: '0 0 50% 50% / 20px',
  marginBottom: theme.spacing(4),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
  }
}));

const ColoredTab = styled(Tab)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.7)',
  fontWeight: 'bold',
  fontSize: '1rem',
  transition: 'all 0.3s',
  '&.Mui-selected': {
    color: '#FFFFFF',
    fontWeight: 'bold',
    background: 'rgba(255, 255, 255, 0.1)',
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

// Mock data for lost and found items
const MOCK_LOST_ITEMS = [
  {
    id: 1,
    title: 'Lost Laptop',
    description: 'Dell XPS 13, Silver color with stickers',
    category: 'Electronics',
    location: 'UB8 Building, 2nd Floor',
    address: 'Room 205, Near the water dispenser',
    date: '2023-09-15',
    status: 'lost',
    contact: 'john@example.com',
    reward: '$50',
    image: 'https://via.placeholder.com/300x200?text=Laptop',
    idCardImage: 'https://via.placeholder.com/300x200?text=ID+Card'
  },
  {
    id: 2,
    title: 'Lost Water Bottle',
    description: 'Blue Hydro Flask with university logo',
    category: 'Personal Items',
    location: 'Library, Study Area',
    address: 'West Wing, Table #23',
    date: '2023-09-18',
    status: 'lost',
    contact: 'alice@example.com',
    reward: '',
    image: 'https://via.placeholder.com/300x200?text=Water+Bottle'
  },
  {
    id: 3,
    title: 'Lost Calculator',
    description: 'Texas Instruments TI-84 Plus',
    category: 'Educational',
    location: 'UB3 Building, Room 305',
    address: 'Back row, seat 12',
    date: '2023-09-20',
    status: 'lost',
    contact: 'mike@example.com',
    reward: '$20',
    image: 'https://via.placeholder.com/300x200?text=Calculator',
    idCardImage: 'https://via.placeholder.com/300x200?text=ID+Card'
  }
];

const MOCK_FOUND_ITEMS = [
  {
    id: 4,
    title: 'Found Student ID Card',
    description: 'BRACU Student ID for "James Smith"',
    category: 'ID Cards',
    location: 'Cafeteria',
    address: 'Table near the entrance',
    date: '2023-09-16',
    status: 'found',
    contact: 'sarah@example.com',
    image: 'https://via.placeholder.com/300x200?text=Student+ID',
    idCardImage: 'https://via.placeholder.com/300x200?text=ID+Card'
  },
  {
    id: 5,
    title: 'Found USB Drive',
    description: 'Black Samsung 32GB USB',
    category: 'Electronics',
    location: 'Computer Lab, UB7 Building',
    address: 'Workstation #14',
    date: '2023-09-19',
    status: 'found',
    contact: 'david@example.com',
    image: 'https://via.placeholder.com/300x200?text=USB+Drive'
  },
  {
    id: 6,
    title: 'Found Glasses',
    description: 'Black rectangular reading glasses',
    category: 'Personal Items',
    location: 'Library, 1st Floor',
    address: 'Study carrel #8',
    date: '2023-09-21',
    status: 'found',
    contact: 'emma@example.com',
    image: 'https://via.placeholder.com/300x200?text=Glasses',
    idCardImage: 'https://via.placeholder.com/300x200?text=ID+Card'
  }
];

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

// Building/location options
const LOCATIONS = [
  'UB1 Building',
  'UB2 Building',
  'UB3 Building',
  'UB7 Building',
  'UB8 Building',
  'UB9 Building',
  'Library',
  'Cafeteria',
  'Student Center',
  'Auditorium',
  'Sports Complex',
  'Other'
];

const LostFound = () => {
  const [tabValue, setTabValue] = useState(0);
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
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
  const [idCardDialogOpen, setIdCardDialogOpen] = useState(false);
  const [currentIdCardImage, setCurrentIdCardImage] = useState(null);
  const [formDialog, setFormDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    document.body.classList.add('lost-found-page');
    return () => {
      document.body.classList.remove('lost-found-page');
    };
  }, []);

  useEffect(() => {
    // Fetch lost and found items from API
    const fetchItems = async () => {
      try {
        // Uncomment these lines when API is ready
        // const lostResponse = await axios.get('/api/lost-found/lost');
        // const foundResponse = await axios.get('/api/lost-found/found');
        // setLostItems(lostResponse.data);
        // setFoundItems(foundResponse.data);
        
        // Using mock data for now
        setLostItems(MOCK_LOST_ITEMS);
        setFoundItems(MOCK_FOUND_ITEMS);
      } catch (error) {
        console.log('Using mock data for items');
        setLostItems(MOCK_LOST_ITEMS);
        setFoundItems(MOCK_FOUND_ITEMS);
      }
      setLoading(false);
    };

    fetchItems();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (itemType) => {
    setNewItem({
      ...newItem,
      status: itemType
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewItem({
      title: '',
      description: '',
      category: '',
      location: '',
      address: '',
      date: '',
      status: 'lost',
      contact: '',
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
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewItem({
        ...newItem,
        image: file
      });
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdCardImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewItem({
        ...newItem,
        idCardImage: file
      });
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewIdCardImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenIdCardDialog = (imageUrl) => {
    setCurrentIdCardImage(imageUrl);
    setIdCardDialogOpen(true);
  };

  const handleCloseIdCardDialog = () => {
    setIdCardDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!newItem.title || !newItem.description || !newItem.category || !newItem.location || !newItem.date) {
      setSnackbar({
        open: true,
        message: 'Please fill out all required fields',
        severity: 'error'
      });
      return;
    }

    setLoading(true);

    // Create form data for submitting with image
    const formData = new FormData();
    for (const key in newItem) {
      formData.append(key, newItem[key]);
    }

    try {
      // Uncomment when API is ready
      // const endpoint = newItem.status === 'lost' ? '/api/lost-found/lost' : '/api/lost-found/found';
      // const response = await axios.post(endpoint, formData, {
      //   headers: { 
      //     'Content-Type': 'multipart/form-data',
      //     Authorization: `Bearer ${localStorage.getItem('token')}` 
      //   }
      // });
      
      // Mock success for now
      setTimeout(() => {
        // Add the new item to the appropriate list with a mock ID
        const newItemWithId = {
          ...newItem,
          id: Math.floor(Math.random() * 1000) + 10,
          image: previewImage || 'https://via.placeholder.com/300x200?text=Item',
          idCardImage: previewIdCardImage
        };
        
        if (newItem.status === 'lost') {
          setLostItems([newItemWithId, ...lostItems]);
        } else {
          setFoundItems([newItemWithId, ...foundItems]);
        }
        
        setSnackbar({
          open: true,
          message: `Item ${newItem.status === 'lost' ? 'reported as lost' : 'reported as found'} successfully!`,
          severity: 'success'
        });
        
        handleCloseDialog();
        setLoading(false);
      }, 1000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error submitting item. Please try again.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter and search items
  const filteredLostItems = lostItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filter.category || item.category === filter.category;
    const matchesLocation = !filter.location || item.location.includes(filter.location);
    // Add date range filter if needed
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const filteredFoundItems = foundItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filter.category || item.category === filter.category;
    const matchesLocation = !filter.location || item.location.includes(filter.location);
    // Add date range filter if needed
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Filter items based on search and filters
  const getFilteredItems = (items) => {
    return items.filter(item => {
      // Text search
      const matchesSearch = searchTerm === '' || 
        Object.values(item).some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      // Category filter
      const matchesCategory = 
        filter.category === 'All Categories' || 
        item.category === filter.category;
      
      // Location filter
      const matchesLocation = 
        filter.location === 'All Locations' || 
        item.location === filter.location;
      
      // Date range filter
      const itemDate = new Date(item.date);
      const matchesStartDate = !filter.dateRange || itemDate >= new Date(filter.dateRange.split(' - ')[0]);
      const matchesEndDate = !filter.dateRange || itemDate <= new Date(filter.dateRange.split(' - ')[1]);
      
      return matchesSearch && 
             matchesCategory && 
             matchesLocation && 
             matchesStartDate && 
             matchesEndDate;
    });
  };

  // Get filtered items based on current tab
  const filteredItems = tabValue === 0 
    ? getFilteredItems(lostItems)
    : getFilteredItems(foundItems);

  // Handle contact button click
  const handleContactClick = (item) => {
    setSelectedItem(item);
    setContactDialog(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <GradientBox>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Lost & Found Center
        </Typography>
        <Typography variant="body1">
          Lost something on campus? Found an item? Report it here to help reconnect items with their owners.
        </Typography>
      </GradientBox>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: '12px', boxShadow: 3 }}>
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
                    <SearchIcon />
                  </InputAdornment>
                ),
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
              >
                <MenuItem value="">All Locations</MenuItem>
                {LOCATIONS.map(location => (
                  <MenuItem key={location} value={location}>{location}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs and Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ 
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px'
            }
          }}
        >
          <ColoredTab 
            label="Lost Items" 
            icon={<HelpOutlineIcon />} 
            iconPosition="start"
          />
          <ColoredTab 
            label="Found Items" 
            icon={<CheckCircleIcon />} 
            iconPosition="start" 
          />
        </Tabs>
        <Box>
          {tabValue === 0 ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('lost')}
              sx={{ borderRadius: '20px', px: 3 }}
            >
              Report Lost Item
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('found')}
              sx={{ borderRadius: '20px', px: 3 }}
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
                  {filteredLostItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                      <StyledCard itemType="lost">
                        <StyledCardMedia
                          component="img"
                          image={item.image}
                          alt={item.title}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="div">{item.title}</Typography>
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
                          <Button size="small" color="primary" onClick={() => handleContactClick(item)}>
                            Contact
                          </Button>
                          {item.idCardImage && (
                            <Button size="small" color="secondary" onClick={() => handleOpenIdCardDialog(item.idCardImage)}>
                              View ID Card
                            </Button>
                          )}
                          <Button size="small" color="info">
                            Share
                          </Button>
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
                  {filteredFoundItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                      <StyledCard itemType="found">
                        <StyledCardMedia
                          component="img"
                          image={item.image}
                          alt={item.title}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="div">{item.title}</Typography>
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
                            <Typography variant="body2">Found by: {item.contact.split('@')[0]}</Typography>
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button size="small" color="primary" onClick={() => handleContactClick(item)}>
                            Claim Item
                          </Button>
                          {item.idCardImage && (
                            <Button size="small" color="secondary" onClick={() => handleOpenIdCardDialog(item.idCardImage)}>
                              View ID Card
                            </Button>
                          )}
                          <Button size="small" color="info">
                            Share
                          </Button>
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
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
                
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    ID Card Image (Optional, for verification)
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 150,
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
                    {previewIdCardImage ? (
                      <img
                        src={previewIdCardImage}
                        alt="ID Card Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <>
                        <PhotoCamera sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Upload ID Card Image
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
                      onChange={handleIdCardImageChange}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
                    ID card images are kept private and only used for verification.
                  </Typography>
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
          {currentIdCardImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <img 
                src={currentIdCardImage} 
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

      {/* Contact Dialog */}
      <Dialog 
        open={contactDialog} 
        onClose={() => setContactDialog(false)}
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #FF9800, #FF5722)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <PersonIcon /> Contact Information
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedItem && (
            <>
              <DialogContentText paragraph>
                To get in touch about <strong>{selectedItem.title}</strong>, use the contact information below:
              </DialogContentText>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: '8px',
                mb: 2
              }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Contact:</strong> {selectedItem.contact}
                </Typography>
                {selectedItem.status === 'lost' && selectedItem.reward && (
                  <Typography variant="body1" color="primary">
                    <strong>Reward:</strong> {selectedItem.reward}
                  </Typography>
                )}
              </Box>
              <DialogContentText variant="body2" color="text.secondary">
                Please be respectful and honest when contacting the {selectedItem.status === 'lost' ? 'owner' : 'finder'}.
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setContactDialog(false)} variant="contained">
            Close
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
    </Container>
  );
};

export default withNotificationBanner(LostFound, 'lost_found');