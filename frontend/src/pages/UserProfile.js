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
import AddIcon from '@mui/icons-material/Add';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../AppBackgrounds.css';
import MarketplaceItemDetailsDrawer from '../components/MarketplaceItemDetailsDrawer';
import MarketplaceItemForm from '../components/MarketplaceItemForm';
import MessageCenter from '../components/MessageCenter';
import { getItemImage } from '../utils/imageUtils';

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
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [sellingHistory, setSellingHistory] = useState([]);
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  const [loadingSellingHistory, setLoadingSellingHistory] = useState(false);

  useEffect(() => {
    document.body.classList.add('user-profile-page');
    return () => {
      document.body.classList.remove('user-profile-page');
    };
  }, []);

  // Check for unread messages
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!user?.id && !user?._id) return;
      
      try {
        const token = localStorage.getItem('token');
        const userId = user?.id || user?._id;
        
        // Use the marketplace endpoint for messages since that's where our message system is implemented
        const response = await axios.get(`http://localhost:5000/api/marketplace/messages/unread`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setMessageCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
        // Don't show error to user, just set count to 0
        setMessageCount(0);
      }
    };
    
    checkUnreadMessages();
    // Set up polling for new messages every minute
    const intervalId = setInterval(checkUnreadMessages, 60000);
    
    return () => clearInterval(intervalId);
  }, [user?.id, user?._id]);

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
        fetchPurchaseHistory(parsedUser.id);
        fetchSellingHistory(parsedUser.id);
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

  const fetchPurchaseHistory = async (userId) => {
    setLoadingPurchaseHistory(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/marketplace/orders/buyer?_=${timestamp}`);
      setPurchaseHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching purchase history:', err);
    } finally {
      setLoadingPurchaseHistory(false);
    }
  };

  const fetchSellingHistory = async (userId) => {
    setLoadingSellingHistory(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/marketplace/orders/seller?_=${timestamp}`);
      setSellingHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching selling history:', err);
    } finally {
      setLoadingSellingHistory(false);
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

  const handleDeleteProfilePicture = async () => {
    try {
      setUploadingImage(true);
      const response = await axios.delete(`/api/users/${user?._id || user?.id}/profile-picture`);
      
      if (response.data) {
        setProfileImage(null);
        
        // Update local storage user data
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

  // Load user posts based on active tab
  useEffect(() => {
    if (user?._id) {
      setLoadingPosts(true);
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const endpoint = 
        tabValue === 0 ? `/api/marketplace/items/user/${user._id}?_=${timestamp}` : 
        tabValue === 1 ? `/api/lost-found/user-items/${user._id}?_=${timestamp}` : 
        tabValue === 2 ? `/api/marketplace/orders/buyer?_=${timestamp}` : 
        tabValue === 3 ? `/api/marketplace/orders/seller?_=${timestamp}` : 
        `/api/marketplace/messages/conversations`;
      
      axios.get(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(response => {
          if (tabValue === 0) {
            setMarketplacePosts(response.data || []);
          } else if (tabValue === 1) {
            setLostFoundItems(response.data || []);
          } else if (tabValue === 2) {
            setPurchaseHistory(response.data || []);
          } else if (tabValue === 3) {
            setSellingHistory(response.data || []);
          } else {
            // Messages tab
          }
        })
        .catch(error => {
          console.error(`Error fetching user ${tabValue === 0 ? 'marketplace items' : tabValue === 1 ? 'lost & found items' : tabValue === 2 ? 'purchases' : tabValue === 3 ? 'sales' : 'messages'}:`, error);
          // Don't show the error message to the user, just reset the data to empty array
          if (tabValue === 0) {
            setMarketplacePosts([]);
          } else if (tabValue === 1) {
            setLostFoundItems([]);
          } else if (tabValue === 2) {
            setPurchaseHistory([]);
          } else if (tabValue === 3) {
            setSellingHistory([]);
          } else {
            // Messages tab error handling
          }
        })
        .finally(() => {
          setLoadingPosts(false);
        });
    }
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
      `/api/lost-found/items/${deleteDialog.postId}`;
    
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
          <Tab label="Marketplace" />
          <Tab label="Lost & Found" />
          <Tab label="Purchases" />
          <Tab label="Sales" />
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
                    <Avatar 
                      src={getItemImage(post)} 
                      variant="rounded" 
                      sx={{ width: 60, height: 60 }}
                    >
                      {(!post.images || post.images.length === 0) && !post.image ? post.title.charAt(0) : null}
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
                    <Avatar 
                      src={item.images && item.images.length > 0 ? 
                        (item.images[0].startsWith('http') ? item.images[0] : `http://localhost:5000${item.images[0]}`) : 
                        (item.image ? (item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`) : '')} 
                      variant="rounded" 
                      sx={{ width: 60, height: 60 }}
                    >
                      {(!item.images || item.images.length === 0) && !item.image ? item.title.charAt(0) : null}
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
        {/* Ride Shares Tab removed */}
        {/* Purchases Tab */}
        <div role="tabpanel" hidden={tabValue !== 2} id="tabpanel-2" aria-labelledby="tab-2">
          {loadingPurchaseHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : purchaseHistory.length > 0 ? (
            <List>
              {purchaseHistory.map((order) => (
                <ListItem key={order._id} divider sx={{ py: 2 }}>
                  <ListItemAvatar>
                    <Avatar 
                      src={order.item?.image || order.item?.images?.[0] || ''} 
                      variant="rounded" 
                      sx={{ width: 60, height: 60 }}
                    >
                      {!order.item?.image && !order.item?.images?.[0] ? (order.item?.title || '?').charAt(0) : null}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={order.item?.title || 'Untitled Item'}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          ৳{order.total_amount?.toLocaleString() || '0'} • Purchased on {new Date(order.created_at).toLocaleDateString()}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Seller: {order.other_party?.name || 'Unknown'}
                        </Typography>
                        <br />
                        <Chip 
                          size="small" 
                          color="success" 
                          label={order.status || 'Confirmed'} 
                          sx={{ mt: 1 }}
                        />
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary" paragraph>
                You haven't made any purchases yet.
              </Typography>
            </Box>
          )}
        </div>
        {/* Sales Tab */}
        <div role="tabpanel" hidden={tabValue !== 3} id="tabpanel-3" aria-labelledby="tab-3">
          {loadingSellingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : sellingHistory.length > 0 ? (
            <List>
              {sellingHistory.map((order) => (
                <ListItem key={order._id} divider sx={{ py: 2 }}>
                  <ListItemAvatar>
                    <Avatar 
                      src={order.item?.image || order.item?.images?.[0] || ''} 
                      variant="rounded" 
                      sx={{ width: 60, height: 60 }}
                    >
                      {!order.item?.image && !order.item?.images?.[0] ? (order.item?.title || '?').charAt(0) : null}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={order.item?.title || 'Untitled Item'}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          ৳{order.total_amount?.toLocaleString() || '0'} • Sold on {new Date(order.created_at).toLocaleDateString()}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Buyer: {order.other_party?.name || 'Unknown'}
                        </Typography>
                        <br />
                        <Chip 
                          size="small" 
                          color="success" 
                          label={order.status || 'Confirmed'} 
                          sx={{ mt: 1 }}
                        />
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary" paragraph>
                You haven't made any sales yet.
              </Typography>
            </Box>
          )}
        </div>
        {/* Messages Tab */}
        <div role="tabpanel" hidden={tabValue !== 5} id="tabpanel-5" aria-labelledby="tab-5">
          <MessageCenter userId={user?._id || user?.id} />
        </div>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
          {/* User Profile Section */}
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: '16px', 
              mb: 4,
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}
          >
            <Grid container spacing={3}>
              {/* Profile Image Section */}
              <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar 
                    src={profileImage} 
                    alt={user?.name || 'User'} 
                    sx={{ 
                      width: 200, 
                      height: 200, 
                      mb: 2,
                      border: '3px solid #1976d2',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                      bgcolor: 'secondary.main',
                      fontSize: 80
                    }}
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </Avatar>
                  {uploadingImage ? (
                    <CircularProgress 
                      size={30} 
                      sx={{ 
                        position: 'absolute', 
                        bottom: 20, 
                        right: 0 
                      }} 
                    />
                  ) : (
                    <Box sx={{ position: 'absolute', bottom: 20, right: 0, display: 'flex' }}>
                      {profileImage && (
                        <IconButton
                          color="error"
                          aria-label="delete picture"
                          sx={{ 
                            mr: 1,
                            backgroundColor: 'white',
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                          onClick={handleDeleteProfilePicture}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                      <IconButton
                        color="primary"
                        aria-label="upload picture"
                        component="label"
                        sx={{ 
                          backgroundColor: 'white',
                          '&:hover': { backgroundColor: '#f5f5f5' }
                        }}
                      >
                        <input 
                          hidden 
                          accept="image/*" 
                          type="file" 
                          onChange={handleProfileImageChange} 
                        />
                        <PhotoCameraIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {user?.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {user?.email}
                </Typography>
                
                {/* ID Card View Section */}
                <Box sx={{ 
                  mt: 3, 
                  width: '100%', 
                  p: 2, 
                  borderRadius: '8px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
                }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                    ID Card
                  </Typography>
                  
                  {idCardImage ? (
                    <Box sx={{ position: 'relative', mb: 1 }}>
                      <img 
                        src={idCardImage} 
                        alt="ID Card" 
                        style={{ 
                          width: '100%', 
                          borderRadius: '4px',
                          maxHeight: '120px',
                          objectFit: 'contain',
                          border: '1px solid rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: '4px' }}>
                      <Typography variant="body2" color="text.secondary">
                        ID card image not available
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                {!editMode && (
                  <Box sx={{ mt: 3, width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button 
                      variant="contained" 
                      className="gradient-primary"
                      fullWidth
                      onClick={handleEditClick}
                      startIcon={<EditIcon />}
                    >
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error"
                      fullWidth
                      startIcon={<LogoutIcon />}
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </Box>
                )}
              </Grid>
              
              {/* User Details Section */}
              <Grid item xs={12} md={8}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {editMode ? 'Edit Profile' : 'Profile Information'}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                {editMode ? (
                  <>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Name"
                          name="name"
                          variant="outlined"
                          value={updatedUser.name || ''}
                          onChange={handleInputChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          name="email"
                          variant="outlined"
                          value={updatedUser.email || ''}
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Student ID"
                          name="student_id"
                          variant="outlined"
                          value={updatedUser.student_id || ''}
                          onChange={handleInputChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Department"
                          name="department"
                          variant="outlined"
                          value={updatedUser.department || ''}
                          onChange={handleInputChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Semester"
                          name="semester"
                          variant="outlined"
                          value={updatedUser.semester || ''}
                          onChange={handleInputChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          name="phone"
                          variant="outlined"
                          value={updatedUser.phone || ''}
                          onChange={handleInputChange}
                          placeholder="Add your phone number"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Address"
                          name="address"
                          variant="outlined"
                          multiline
                          rows={2}
                          value={updatedUser.address || ''}
                          onChange={handleInputChange}
                        />
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<CancelIcon />} 
                        sx={{ mr: 2 }}
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<SaveIcon />}
                        onClick={handleSaveChanges}
                      >
                        Save Changes
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Student ID
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {user?.student_id || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Department
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {user?.department || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Semester
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {user?.semester || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {user?.phone || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Address
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {user?.address || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Account Status
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: user?.verification_status === 'approved' ? 'green' : 'orange',
                          fontWeight: 600,
                          mb: 2
                        }}
                      >
                        {user?.verification_status === 'approved' ? 'Verified' : 'Pending Verification'}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          {/* User Activity Section with Tabs */}
          {renderUserActivity()}
          
          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialog.open}
            onClose={handleCloseDeleteDialog}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
          >
            <DialogTitle id="delete-dialog-title">
              Confirm Delete
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="delete-dialog-description">
                Are you sure you want to delete this {
                  deleteDialog.postType === 'marketplace' ? 'marketplace item' : 
                  deleteDialog.postType === 'lostfound' ? 'lost & found report' : 
                  'ride request'
                }? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
              <Button onClick={handleDeleteItem} color="error" autoFocus>
                Delete
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Item Details Dialog */}
          {selectedItem && (
            <MarketplaceItemDetailsDrawer
              open={itemDetailsOpen}
              item={selectedItem}
              onClose={() => setItemDetailsOpen(false)}
            />
          )}
          
          {/* Edit Item Dialog */}
          {selectedItemForEdit && (
            <MarketplaceItemForm
              open={editItemOpen}
              onClose={() => setEditItemOpen(false)}
              item={selectedItemForEdit}
              isEdit={true}
            />
          )}
          
          {/* New Item Dialog */}
          <MarketplaceItemForm
            open={newItemOpen}
            onClose={() => setNewItemOpen(false)}
            isEdit={false}
            onSuccess={handleNewItemSuccess}
          />
          
          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={5000}
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
              severity={snackbar.severity} 
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      )}
    </Container>
  );
};

export default UserProfile;