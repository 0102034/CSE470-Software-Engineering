import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Paper, 
  Button, 
  Avatar, 
  TextField,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import StoreIcon from '@mui/icons-material/Store';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import MessageIcon from '@mui/icons-material/Message';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../AppBackgrounds.css';
import MarketplaceItemDetailsDrawer from '../components/MarketplaceItemDetailsDrawer';
import RideShareList from '../components/RideShareList';
import MarketplaceItemForm from '../components/MarketplaceItemForm';
import MessageCenter from '../components/MessageCenter';
import OrderHistory from '../components/OrderHistory';

const UserProfile = () => {
  // ...existing state hooks...
  // Debounce state for actions
  const [actionDebounce, setActionDebounce] = useState(false);

  // View item details (best practice: open details drawer)
  const handleViewItem = (item) => {
    if (actionDebounce) return;
    setActionDebounce(true);
    setTimeout(() => setActionDebounce(false), 800); // 800ms debounce
    setSelectedItem(item);
    setItemDetailsOpen(true);
  };

  // Edit item (best practice: open edit dialog with item)
  const handleEditItem = (item) => {
    if (actionDebounce) return;
    setActionDebounce(true);
    setTimeout(() => setActionDebounce(false), 800);
    setSelectedItemForEdit(item);
    setEditItemOpen(true);
  };

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [marketplacePosts, setMarketplacePosts] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [updatedUser, setUpdatedUser] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, postId: null, postType: null });
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [newItemOpen, setNewItemOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('user-profile-page');
    return () => {
      document.body.classList.remove('user-profile-page');
    };
  }, []);

  // Check for unread messages
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!user?.id) return;
      
      try {
        const response = await axios.get(`http://localhost:5000/api/messages/unread/${user.id}`);
        setMessageCount(response.data.count);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };
    
    checkUnreadMessages();
    // Set up polling for new messages every minute
    const intervalId = setInterval(checkUnreadMessages, 60000);
    
    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Load user data from localStorage and fetch additional details from API
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        navigate('/login');
        return;
      }
      
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setUpdatedUser(parsedUser);
        
        // Set default headers for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch complete user details
        fetchUserDetails(parsedUser.id);
        
        // Fetch user activity from all sections
        fetchMarketplacePosts(parsedUser.id);
        fetchLostFoundItems(parsedUser.id);
        fetchRideRequests(parsedUser.id);
      } catch (err) {
        console.error('Error parsing user data:', err);
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setUser(prevUser => ({ ...prevUser, ...response.data }));
      setUpdatedUser(prevUser => ({ ...prevUser, ...response.data }));
      
      // Check if user has a profile picture
      if (response.data.profile_picture) {
        setProfileImage(response.data.profile_picture);
      }
      
      // Check if user has an ID card image
      if (response.data.id_card_image) {
        setIdCardImage(response.data.id_card_image);
      } else if (response.data.id_card_photo) {
        // Try alternative field name for ID card photo
        setIdCardImage(response.data.id_card_photo);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setLoading(false);
    }
  };

  const fetchMarketplacePosts = async (userId) => {
    setLoadingPosts(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/marketplace/items/user/${userId}?_=${timestamp}`);
      setMarketplacePosts(response.data || []);
      setLoadingPosts(false);
    } catch (err) {
      console.error('Error fetching marketplace posts:', err);
      setLoadingPosts(false);
    }
  };
  
  const fetchLostFoundItems = async (userId) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/lost-found/user-items/${userId}?_=${timestamp}`);
      setLostFoundItems(response.data || []);
    } catch (err) {
      console.error('Error fetching lost & found items:', err);
    }
  };
  
  const fetchRideRequests = async (userId) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/ride/user-requests/${userId}?_=${timestamp}`);
      setRideRequests(response.data || []);
    } catch (err) {
      console.error('Error fetching ride requests:', err);
    }
  };

  const handleProfileImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setProfileImage(e.target.result);
      };
      
      reader.readAsDataURL(file);
      uploadProfileImage(file);
    }
  };

  const uploadProfileImage = async (file) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const response = await axios.post(`/api/users/${user.id}/profile-picture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.profile_picture) {
        setProfileImage(response.data.profile_picture);
        
        // Update local storage user data
        const userData = JSON.parse(localStorage.getItem('user'));
        userData.profile_picture = response.data.profile_picture;
        localStorage.setItem('user', JSON.stringify(userData));
        
        setSnackbar({
          open: true,
          message: 'Profile picture updated successfully',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setSnackbar({
        open: true,
        message: 'Failed to upload profile picture',
        severity: 'error'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleIdCardImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setIdCardImage(e.target.result);
      };
      
      reader.readAsDataURL(file);
      uploadIdCardImage(file);
    }
  };

  const uploadIdCardImage = async (file) => {
    setUploadingIdCard(true);
    try {
      const formData = new FormData();
      formData.append('id_card_image', file);
      
      const response = await axios.post(`/api/users/${user.id}/id-card-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.id_card_image) {
        setIdCardImage(response.data.id_card_image);
        
        // Update local storage user data
        const userData = JSON.parse(localStorage.getItem('user'));
        userData.id_card_image = response.data.id_card_image;
        localStorage.setItem('user', JSON.stringify(userData));
        
        setSnackbar({
          open: true,
          message: 'ID card image uploaded successfully',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error uploading ID card image:', err);
      setSnackbar({
        open: true,
        message: 'Failed to upload ID card image',
        severity: 'error'
      });
    } finally {
      setUploadingIdCard(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset loading state when changing tabs
    setLoadingPosts(true);
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setUpdatedUser(user);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUpdatedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      const response = await axios.put(`/api/users/${user.id}`, updatedUser);
      
      // Update local state and localStorage
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      setEditMode(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    
    setSnackbar({
      open: true,
      message: 'Logged out successfully',
      severity: 'success'
    });
  };

  // Load user posts based on active tab
  useEffect(() => {
    const fetchTabData = async () => {
      if (!user?._id) return;
      
      setLoadingPosts(true);
      const token = localStorage.getItem('token');
      const timestamp = new Date().getTime();
      
      try {
        let response;
        switch(tabValue) {
          case 0: // Marketplace
            response = await axios.get(`/api/marketplace/items/user/${user._id}?_=${timestamp}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setMarketplacePosts(response.data || []);
            break;
            
          case 1: // Lost & Found
            response = await axios.get(`/api/lost-found/user-items/${user._id}?_=${timestamp}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setLostFoundItems(response.data || []);
            break;
            
          case 2: // Ride Share
            response = await axios.get(`/api/ride/user-requests/${user._id}?_=${timestamp}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setRideRequests(response.data || []);
            break;
            
          case 3: // Orders
            setLoadingPosts(false); // Order history handles its own loading
            return;
            
          default:
            return;
        }
      } catch (error) {
        console.error('Error fetching tab data:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load data. Please try again.',
          severity: 'error'
        });
      } finally {
        setLoadingPosts(false);
      }
    };
    
    fetchTabData();
  }, [user, tabValue]);



  // Handle delete dialog actions
  const handleOpenDeleteDialog = (id, type) => {
    setDeleteDialog({
      open: true,
      postId: id,
      postType: type
    });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      postId: null,
      postType: null
    });
  };

  const handleDeleteItem = () => {
    if (!deleteDialog.postId || !deleteDialog.postType) return;
    
    const endpoint = 
      deleteDialog.postType === 'marketplace' ? `/api/marketplace/items/${deleteDialog.postId}` : 
      deleteDialog.postType === 'lostfound' ? `/api/lost-found/items/${deleteDialog.postId}` : 
      `/api/ride/requests/${deleteDialog.postId}`;
    
    axios.delete(endpoint, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(() => {
        // Remove deleted item from state
        if (deleteDialog.postType === 'marketplace') {
          setMarketplacePosts(prev => prev.filter(item => item._id !== deleteDialog.postId));
          
          // Refresh the marketplace data to keep it in sync with other views
          const userId = user?._id;
          if (userId) {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            axios.get(`/api/marketplace/items/user/${userId}?_=${timestamp}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
          }
        } else if (deleteDialog.postType === 'lostfound') {
          setLostFoundItems(prev => prev.filter(item => item._id !== deleteDialog.postId));
        } else {
          setRideRequests(prev => prev.filter(ride => ride._id !== deleteDialog.postId));
        }
        
        setSnackbar({
          open: true,
          message: `${deleteDialog.postType === 'marketplace' ? 'Item' : deleteDialog.postType === 'lostfound' ? 'Report' : 'Ride'} deleted successfully.`,
          severity: 'success'
        });
      })
      .catch(error => {
        console.error('Error deleting item:', error);
        setSnackbar({
          open: true,
          message: `Failed to delete ${deleteDialog.postType === 'marketplace' ? 'item' : deleteDialog.postType === 'lostfound' ? 'report' : 'ride'}.`,
          severity: 'error'
        });
      })
      .finally(() => {
        handleCloseDeleteDialog();
      });
  };

  const handleCreateNewItem = () => {
    setNewItemOpen(true);
  };

  const handleNewItemSuccess = (newItemData) => {
    // Handle different response data structures
    const newItem = newItemData.item || newItemData;
    
    // Add the new item to the marketplacePosts at the beginning of the array if it's valid
    if (newItem && (newItem._id || newItem.item_id)) {
      // If we need to refresh to get the complete item data
      if (!newItem.title && newItem.item_id) {
        // If only an ID is returned, refresh the list to get the complete item
        handleRefreshMarketplaceItems();
      } else {
        // If we have the complete item data, add it to the list
        setMarketplacePosts(prevItems => [newItem, ...prevItems]);
      }
      
      setSnackbar({
        open: true,
        message: 'Item created successfully',
        severity: 'success'
      });
    } else {
      console.error('Invalid new item data received:', newItemData);
      // Still refresh the list to ensure we have the latest data
      handleRefreshMarketplaceItems();
    }
    setNewItemOpen(false);
  };

  const handleRefreshMarketplaceItems = async () => {
    if (user?._id) {
      setLoadingPosts(true);
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await axios.get(`/api/marketplace/items/user/${user._id}?_=${timestamp}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMarketplacePosts(response.data || []);
        
        setSnackbar({
          open: true,
          message: 'Items refreshed successfully',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error refreshing marketplace items:', err);
      } finally {
        setLoadingPosts(false);
    }
  }
};

// User Activity Tabs Section
const renderUserActivity = () => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mt: 4,
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Your Activity
        </Typography>
      </Box>
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="activity tabs">
        <Tab icon={<StoreIcon />} label="Marketplace" />
        <Tab icon={<HelpOutlineIcon />} label="Lost & Found" />
        <Tab icon={<DirectionsBusIcon />} label="Ride Share" />
        <Tab icon={<ShoppingCartIcon />} label="Orders" />
        <Tab icon={<Badge badgeContent={messageCount} color="error" invisible={messageCount === 0}><MessageIcon /></Badge>} label="Messages" />
      </Tabs>
      <Divider sx={{ my: 2 }} />
      {/* Marketplace Tab */}
      <div role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0">
        {marketplacePosts.length > 0 ? (
          <List>
            {marketplacePosts.map((post) => (
              <ListItem key={post._id} divider sx={{ py: 2 }}>
                <ListItemAvatar>
                  <Avatar src={post.images && post.images.length > 0 ? post.images[0] : ''} variant="rounded" sx={{ width: 60, height: 60 }}>
                    {!post.images || post.images.length === 0 ? post.title.charAt(0) : null}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={post.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        ${post.price} • {post.category}
                      </Typography>
                      <br />
                      {post.description.substring(0, 100)}
                      {post.description.length > 100 ? '...' : ''}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleViewItem(post)}>
                    <PhotoCameraIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleEditItem(post)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleOpenDeleteDialog(post._id, 'marketplace')}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              You haven't posted any items in the marketplace yet.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<StoreIcon />}
              onClick={() => navigate('/marketplace/sell')}
            >
              Create Your First Post
            </Button>
          </Box>
        )}
      </div>
      {/* Lost & Found Tab */}
      <div role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1">
        {lostFoundItems.length > 0 ? (
          <List>
            {lostFoundItems.map((item) => (
              <ListItem key={item._id} divider sx={{ py: 2 }}>
                <ListItemAvatar>
                  <Avatar src={item.images && item.images.length > 0 ? item.images[0] : ''} variant="rounded" sx={{ width: 60, height: 60 }}>
                    {!item.images || item.images.length === 0 ? item.title.charAt(0) : null}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={item.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {item.category}
                      </Typography>
                      <br />
                      {item.description.substring(0, 100)}
                      {item.description.length > 100 ? '...' : ''}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleOpenDeleteDialog(item._id, 'lostfound')}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              You haven't posted any lost & found reports yet.
            </Typography>
          </Box>
        )}
      </div>
      {/* Ride Shares Tab */}
      <div role="tabpanel" hidden={tabValue !== 2} id="tabpanel-2" aria-labelledby="tab-2">
        <RideShareList userId={user?._id || user?.id} />
      </div>
      {/* Orders Tab */}
      <div role="tabpanel" hidden={tabValue !== 3} id="tabpanel-3" aria-labelledby="tab-3">
        <OrderHistory />
      </div>
      {/* Messages Tab */}
      <div role="tabpanel" hidden={tabValue !== 4} id="tabpanel-4" aria-labelledby="tab-4">
        <MessageCenter userId={user?._id || user?.id} />
      </div>
    </Paper>
  );
};




const handleEditItemSuccess = (updatedItemData) => {
  // Update the item in the list
  // Handle different response data structures
  const updatedItem = updatedItemData.item || updatedItemData;
  if (updatedItem && updatedItem._id) {
    setMarketplacePosts(prevItems =>
      prevItems.map(item =>
        item._id === updatedItem._id ? updatedItem : item
      )
    );
    setEditItemOpen(false);
    setSelectedItemForEdit(null);
    setSnackbar({
      open: true,
      message: 'Item updated successfully',
      severity: 'success'
    });
  } else {
    console.error('Invalid update data received:', updatedItemData);
    setSnackbar({
      open: true,
      message: 'Error updating item. Please try again.',
      severity: 'error'
    });
  }
};

const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setDeletingItem(true);
    setDeleteError('');
    
    try {
      const token = localStorage.getItem('token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await axios.delete(`/api/marketplace/items/${itemToDelete._id}`);
      
      // Update local state
      setMarketplacePosts(prevItems => prevItems.filter(item => item._id !== itemToDelete._id));
      
      setConfirmDeleteOpen(false);
      setItemToDelete(null);
      
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      setDeleteError('Failed to delete item. Please try again.');
    } finally {
      setDeletingItem(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    try {
      setUploadingImage(true);
      const response = await axios.delete(`/api/users/${user._id}/delete-profile-picture`);
      
      if (response.data) {
        setProfileImage(null);
        
        // Update local user data
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.profile_picture) {
          delete userData.profile_picture;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        setSnackbar({
          open: true,
          message: 'Profile picture deleted successfully',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error deleting profile picture:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete profile picture',
        severity: 'error'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#f5f5f5', pt: 4, pb: 4 }}>
      <Container maxWidth="xl">
        <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
          {/* Back to Dashboard Button and Logged-in Student Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate('/')}
              sx={{ mr: 2 }}
            >
              Back to Home
            </Button>
            {/* Show logged-in student name */}
            {user && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Logged in as: {user.name}
              </Typography>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ width: '100%', typography: 'body1' }}>
                <Tabs value={tabValue} onChange={handleTabChange} centered>
                  <Tab icon={<StoreIcon />} label="Marketplace" />
                  <Tab icon={<HelpOutlineIcon />} label="Lost & Found" />
                  <Tab icon={<DirectionsBusIcon />} label="Ride Share" />
                  <Tab icon={<ShoppingCartIcon />} label="Orders" />
                  <Tab 
                    icon={
                      <Badge badgeContent={messageCount} color="error" invisible={messageCount === 0}>
                        <MessageIcon />
                      </Badge>
                    } 
                    label="Messages" 
                  />
                </Tabs>

                <Box sx={{ mt: 3 }}>
                  {/* Marketplace Tab */}
                  <div role="tabpanel" hidden={tabValue !== 0}>
                    {loadingPosts ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Grid container spacing={3}>
                        {marketplacePosts.map((post) => (
                          <Grid item xs={12} sm={6} md={4} key={post._id}>
                            <Card>
                              <CardMedia
                                component="img"
                                height="200"
                                image={post.images?.[0] || "https://via.placeholder.com/300x200?text=No+Image"}
                                alt={post.title}
                              />
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  {post.title}
                                </Typography>
                                <Typography variant="h5" color="primary">
                                  ৳{post.price.toLocaleString()}
                                </Typography>
                              </CardContent>
                              <CardActions>
                                <Button size="small" onClick={() => handleViewItem(post)}>
                                  View Details
                                </Button>
                                <Button size="small" onClick={() => handleEditItem(post)}>
                                  Edit
                                </Button>
                                <Button 
                                  size="small" 
                                  color="error"
                                  onClick={() => {
                                    setItemToDelete(post);
                                    setConfirmDeleteOpen(true);
                                  }}
                                >
                                  Delete
                                </Button>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </div>

                  {/* Lost & Found Tab */}
                  <div role="tabpanel" hidden={tabValue !== 1}>
                    {loadingPosts ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Grid container spacing={3}>
                        {lostFoundItems.map((item) => (
                          <Grid item xs={12} sm={6} md={4} key={item._id}>
                            <Card>
                              <CardMedia
                                component="img"
                                height="200"
                                image={item.images?.[0] || "https://via.placeholder.com/300x200?text=No+Image"}
                                alt={item.title}
                              />
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  {item.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {item.description}
                                </Typography>
                              </CardContent>
                              <CardActions>
                                <Button size="small">Edit</Button>
                                <Button size="small" color="error">Delete</Button>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </div>

                  {/* Ride Share Tab */}
                  <div role="tabpanel" hidden={tabValue !== 2}>
                    <RideShareList rides={rideRequests} loading={loadingPosts} />
                  </div>

                  {/* Orders Tab */}
                  <div role="tabpanel" hidden={tabValue !== 3}>
                    <OrderHistory />
                  </div>

                  {/* Messages Tab */}
                  <div role="tabpanel" hidden={tabValue !== 4}>
                    <MessageCenter userId={user?._id} />
                  </div>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default UserProfile;