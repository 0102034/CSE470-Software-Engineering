import React, { useState, useEffect } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import MessageDisplay from '../components/MessageDisplay';
import {
  Container, Box, Paper, Typography, Avatar, Button, Tabs, Tab, List,
  ListItem, ListItemText, ListItemAvatar, Divider, TextField, Chip,
  CircularProgress, IconButton, Card, CardContent, CardMedia, Dialog, 
  DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, 
  Alert, Badge, ListItemSecondaryAction, CardActions, Grid, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import StoreIcon from '@mui/icons-material/Store';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import MessageIcon from '@mui/icons-material/Message';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import '../AppBackgrounds.css';

// Temporary placeholder components until they are implemented
const MarketplaceItemDetailsDrawer = ({ open, item, onClose }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Item Details</DialogTitle>
    <DialogContent>
      <Typography>{item?.title}</Typography>
      <Typography>{item?.description}</Typography>
      <Typography>Price: ${item?.price}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

const MarketplaceItemForm = ({ open, onClose, item, isEdit, onSuccess }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{isEdit ? 'Edit Item' : 'New Item'}</DialogTitle>
    <DialogContent>
      <Typography>Form placeholder</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={() => onSuccess && onSuccess({})}>Save</Button>
    </DialogActions>
  </Dialog>
);

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [sellItems, setSellItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditForm, setIsEditForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  const navigate = useNavigate();
  const { userId } = useParams();
  const fileInputRef = React.useRef(null);
  
  // Helper function to properly resolve image URLs
  const getImageUrl = (url) => {
    if (!url) return '/images/placeholder.png';
    
    // If the URL is already absolute (starts with http:// or https://), return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If the URL is a relative path starting with /uploads, prepend the API base URL
    if (url.startsWith('/uploads')) {
      // Get the base URL from the current API endpoint
      const apiBaseUrl = process.env.REACT_APP_API_URL || window.location.origin;
      return `${apiBaseUrl}${url}`;
    }
    
    // Otherwise, return the URL as is
    return url;
  };
  
  // Check if the profile belongs to the current user
  const isCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      const decoded = jwt_decode(token);
      return decoded.sub === userId || decoded.user_id === userId;
    } catch (error) {
      console.error('Error checking if current user:', error);
      return false;
    }
  };
  
  // Get the current user's ID
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const decoded = jwt_decode(token);
      return decoded.sub || decoded.user_id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  };
  
  // Fetch user data
  useEffect(() => {
    fetchUserData();
    fetchUserItems();
  }, [userId]);
  
  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      // If userId is not provided, use the current user's ID
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) {
        setLoading(false);
        return;
      }
      
      // Try to get user data from API
      try {
        const response = await axios.get(`/api/users/${targetUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data) {
          setUser(response.data);
          setEditedUser(response.data);
        }
      } catch (error) {
        console.error('Error fetching user data from primary endpoint:', error);
        
        // Try alternative endpoint
        try {
          const meResponse = await axios.get('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (meResponse.data) {
            setUser(meResponse.data);
            setEditedUser(meResponse.data);
          }
        } catch (meError) {
          console.error('Error fetching user data from alternative endpoint:', meError);
          
          // As a last resort, create user data from token
          const decoded = jwt_decode(token);
          const userData = {
            id: decoded.sub || decoded.user_id,
            name: decoded.name || 'User',
            email: decoded.email || '',
            profile_picture: '',
            department: decoded.department || '',
            semester: decoded.semester || ''
          };
          
          setUser(userData);
          setEditedUser(userData);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      showSnackbar('Error loading user data. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch user's marketplace and lost & found items
  const fetchUserItems = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // If userId is not provided, use the current user's ID
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) return;
      
      // Fetch marketplace items
      try {
        // The correct endpoint is /api/marketplace/items/user/:userId
        const marketplaceResponse = await axios.get(`/api/marketplace/items/user/${targetUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (marketplaceResponse.data && Array.isArray(marketplaceResponse.data)) {
          // Set marketplace items (active listings)
          const activeItems = marketplaceResponse.data.filter(item => !item.sold);
          setMarketplaceItems(activeItems);
          
          // Set items for sale section (same as active listings for now)
          setSellItems(activeItems);
        }
      } catch (marketplaceError) {
        console.error('Error fetching marketplace items:', marketplaceError);
      }
      
      // Fetch sold items
      try {
        const soldItemsResponse = await axios.get(`/api/marketplace/users/${targetUserId}/sold`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (soldItemsResponse.data && Array.isArray(soldItemsResponse.data)) {
          console.log('Fetched sold items:', soldItemsResponse.data);
          setSoldItems(soldItemsResponse.data);
        }
      } catch (soldItemsError) {
        console.error('Error fetching sold items:', soldItemsError);
      }
      
      // Fetch purchase records
      try {
        // First try the marketplace API endpoint
        const purchasesResponse = await axios.get(`/api/marketplace/users/${targetUserId}/purchases`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (purchasesResponse.data && Array.isArray(purchasesResponse.data)) {
          console.log('Fetched purchase records:', purchasesResponse.data);
          setPurchaseItems(purchasesResponse.data);
        }
      } catch (purchasesError) {
        console.error('Error fetching purchase records from marketplace API:', purchasesError);
        
        try {
          // Try the users API endpoint as fallback
          const userPurchasesResponse = await axios.get(`/api/users/${targetUserId}/purchases`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (userPurchasesResponse.data && Array.isArray(userPurchasesResponse.data)) {
            console.log('Fetched purchase records from users API:', userPurchasesResponse.data);
            setPurchaseItems(userPurchasesResponse.data);
          }
        } catch (userPurchasesError) {
          console.error('Error fetching purchase records from users API:', userPurchasesError);
          
          // Create some mock purchase data for testing if both APIs fail
          if (isCurrentUser()) {
            console.log('Creating mock purchase data from marketplace items');
            const mockPurchases = marketplaceItems
              .filter(item => item.sold === true)
              .map(item => ({
                _id: item._id + '_purchase',
                item_id: item._id,
                title: item.title,
                price: item.price,
                images: item.images,
                description: item.description,
                purchase_date: new Date().toISOString(),
                payment_method: 'bkash',
                seller: item.seller || { name: 'Unknown Seller' }
              }));
            setPurchaseItems(mockPurchases);
          }
        }
      }
      
      // Fetch lost & found items
      try {
        // The correct endpoint is /api/lost-found/user-items/:userId (note the hyphen and 'user-items')
        const lostFoundResponse = await axios.get(`/api/lost-found/user-items/${targetUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (lostFoundResponse.data && Array.isArray(lostFoundResponse.data)) {
          setLostFoundItems(lostFoundResponse.data);
        }
      } catch (error) {
        console.error('Error fetching lost & found items:', error);
        // Set empty array for better UX
        setLostFoundItems([]);
      }
    } catch (error) {
      console.error('Error in fetchUserItems:', error);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Show snackbar message
  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };
  
  // Handle item details
  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };
  
  // Handle item form
  const handleAddItem = () => {
    setIsEditForm(false);
    setEditItem(null);
    setFormOpen(true);
  };
  
  const handleEditItem = (item) => {
    setIsEditForm(true);
    setEditItem(item);
    setFormOpen(true);
  };
  
  const handleItemFormSuccess = (item) => {
    setFormOpen(false);
    fetchUserItems();
    showSnackbar(isEditForm ? 'Item updated successfully!' : 'Item added successfully!');
  };
  
  // Handle item deletion
  const handleDeleteItem = async (item, itemType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const endpoint = itemType === 'marketplace' 
        ? `/api/marketplace/${item._id}` 
        : `/api/lostfound/${item._id}`;
      
      await axios.delete(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      fetchUserItems();
      showSnackbar('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      showSnackbar('Error deleting item. Please try again later.', 'error');
    }
  };
  
  // Handle profile editing
  const handleEditProfile = () => {
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedUser(user);
    setImageFile(null);
    setImagePreview('');
  };
  
  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const userId = user.id || user._id;
      const updateData = { ...editedUser };
      
      // If we have a new image preview, it's a base64 image that needs to be sent to the server
      if (imagePreview && imageFile) {
        // Send the base64 image data directly in the JSON payload
        updateData.profile_picture_data = imagePreview;
      }
      
      // Delete profile_picture from the update data to avoid sending the URL
      if (updateData.profile_picture && typeof updateData.profile_picture === 'string') {
        delete updateData.profile_picture;
      }
      
      // Send the update request as JSON
      const response = await axios.put(`/api/users/${userId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        setUser(response.data);
        setIsEditing(false);
        showSnackbar('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar('Error updating profile. Please try again later.', 'error');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle deleting profile picture
  const handleDeleteProfilePicture = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const userId = user.id || user._id;
      
      // Call the DELETE endpoint for profile picture
      const response = await axios.delete(`/api/users/${userId}/profile-picture`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // Update local state
        setUser(prev => ({
          ...prev,
          profile_picture: null
        }));
        
        // If in edit mode, update edited user as well
        if (isEditing) {
          setEditedUser(prev => ({
            ...prev,
            profile_picture: null
          }));
          setImagePreview('');
          setImageFile(null);
        }
        
        showSnackbar('Profile picture deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      showSnackbar('Error deleting profile picture. Please try again later.', 'error');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Use replace: true to replace the current entry in history stack
    // This prevents going back to a protected page after logout
    navigate('/login', { replace: true });
  };
  
  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.name || user.email || 'User';
  };
  
  // Render marketplace items
  const renderMarketplaceItems = () => {
    if (marketplaceItems.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No marketplace items found.</Typography>
          {isCurrentUser() && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/marketplace')}
              sx={{ mt: 2 }}
            >
              Go to Marketplace
            </Button>
          )}
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 2 }}>
        {isCurrentUser() && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/marketplace')}
            >
              Go to Marketplace
            </Button>
          </Box>
        )}
        <Grid container spacing={2}>
          {marketplaceItems.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={item.images && item.images.length > 0 ? item.images[0] : '/assets/images/placeholder.jpg'}
                  alt={item.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description?.length > 100 
                      ? `${item.description.substring(0, 100)}...` 
                      : item.description}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                    ৳{item.price}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/marketplace`)}>Go to Marketplace</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };
  
  // Render lost & found items
  const renderLostFoundItems = () => {
    if (lostFoundItems.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No lost & found items found.</Typography>
          {isCurrentUser() && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/lost-found')}
              sx={{ mt: 2 }}
            >
              Go to Lost & Found
            </Button>
          )}
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 2 }}>
        {isCurrentUser() && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/lost-found')}
            >
              Go to Lost & Found
            </Button>
          </Box>
        )}
        <Grid container spacing={2}>
          {lostFoundItems.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={item.images && item.images.length > 0 ? item.images[0] : '/assets/images/placeholder.jpg'}
                  alt={item.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description?.length > 100 
                      ? `${item.description.substring(0, 100)}...` 
                      : item.description}
                  </Typography>
                  <Chip 
                    label={item.status || 'Lost'} 
                    color={item.status === 'Found' ? 'success' : 'error'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate('/lost-found')}>Go to Lost & Found</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };
  
  // Render purchase items
  const renderPurchaseItems = () => {
    if (purchaseItems.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No purchase history found.</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            component={Link}
            to="/marketplace"
            sx={{ mt: 2 }}
          >
            Browse Marketplace
          </Button>
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Your Purchase History
        </Typography>
        <Grid container spacing={2}>
          {purchaseItems.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item._id || item.item_id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative'
              }}>
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bgcolor: 'success.main',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  zIndex: 1,
                  borderBottomLeftRadius: 4
                }}>
                  <Typography variant="caption" fontWeight="bold">
                    Purchased
                  </Typography>
                </Box>
                <CardMedia
                  component="img"
                  height="140"
                  image={item.images && item.images.length > 0 ? item.images[0] : '/assets/images/placeholder.jpg'}
                  alt={item.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description?.length > 100 
                      ? `${item.description.substring(0, 100)}...` 
                      : item.description}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                      Price: ৳{item.price}
                    </Typography>
                    {item.purchase_date && (
                      <Typography variant="body2" color="text.secondary">
                        Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                      </Typography>
                    )}
                    {item.payment_method && (
                      <Typography variant="body2" color="text.secondary">
                        Payment: {item.payment_method.toUpperCase()}
                      </Typography>
                    )}
                    {item.seller && item.seller.name && (
                      <Typography variant="body2" color="text.secondary">
                        Seller: {item.seller.name}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleViewDetails(item)}>View Details</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };
  
  // Render sell items
  const renderSellItems = () => {
    const hasActiveItems = sellItems.length > 0;
    const hasSoldItems = soldItems.length > 0;
    
    if (!hasActiveItems && !hasSoldItems) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No marketplace items found.</Typography>
          {isCurrentUser() && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ mt: 2 }}
            >
              Add Item for Sale
            </Button>
          )}
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 2 }}>
        {isCurrentUser() && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleAddItem}
            >
              Add Item for Sale
            </Button>
          </Box>
        )}
        
        {/* Sold Items Section */}
        {hasSoldItems && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 4, borderBottom: '1px solid #eee', pb: 1 }}>
              Sold Items
            </Typography>
            <Grid container spacing={2}>
              {soldItems.map(item => (
                <Grid item xs={12} sm={6} md={4} key={item._id}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    position: 'relative'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bgcolor: 'success.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      zIndex: 1,
                      borderBottomLeftRadius: 4
                    }}>
                      <Typography variant="caption" fontWeight="bold">
                        Sold
                      </Typography>
                    </Box>
                    <CardMedia
                      component="img"
                      height="140"
                      image={item.images && item.images.length > 0 ? item.images[0] : '/assets/images/placeholder.jpg'}
                      alt={item.title}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div">
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description?.length > 100 
                          ? `${item.description.substring(0, 100)}...` 
                          : item.description}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        ৳{item.price}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {item.sold_date && (
                          <Typography variant="body2" color="text.secondary">
                            Sold: {new Date(item.sold_date).toLocaleDateString()}
                          </Typography>
                        )}
                        {item.buyer_id && (
                          <Typography variant="body2" color="text.secondary">
                            Buyer ID: {item.buyer_id.substring(0, 8)}...
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleViewDetails(item)}>View Details</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Box>
    );
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button 
              component={Link} 
              to="/" 
              startIcon={<ArrowBackIcon />} 
              sx={{ color: 'primary.main' }}
            >
              Back to Home
            </Button>
            <Typography variant="body2" color="text.secondary">
              Logged in as: {getUserDisplayName()}
            </Typography>
          </Box>

          <Paper elevation={3} sx={{ p: 4, borderRadius: '8px', mb: 4, bgcolor: '#fff' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Profile Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: { md: 6 }, mb: { xs: 4, md: 0 } }}>
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <Avatar
                    src={isEditing && imagePreview ? imagePreview : user?.profile_picture || ''}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      bgcolor: 'purple', 
                      fontSize: '3rem',
                      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                  {isEditing && (
                    <Box sx={{ position: 'absolute', bottom: 0, right: 0, display: 'flex' }}>
                      <IconButton
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                          mr: 1
                        }}
                        onClick={() => fileInputRef.current.click()}
                        title="Upload new picture"
                      >
                        <PhotoCameraIcon />
                      </IconButton>
                      
                      {user?.profile_picture && (
                        <IconButton
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                          }}
                          onClick={handleDeleteProfilePicture}
                          color="error"
                          title="Delete profile picture"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </Box>
                
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user?.email || ''}
                </Typography>
                
                {isCurrentUser() && !isEditing && user?.profile_picture && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteProfilePicture}
                    sx={{ mb: 2 }}
                  >
                    Delete Picture
                  </Button>
                )}
                
                {isCurrentUser() && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                    {isEditing ? (
                      <>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<SaveIcon />}
                          onClick={handleSaveProfile}
                          sx={{ mb: 1 }}
                        >
                          Save Profile
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={handleEditProfile}
                          sx={{ mb: 1 }}
                        >
                          Edit Profile
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<LogoutIcon />}
                          onClick={handleLogout}
                        >
                          Logout
                        </Button>
                      </>
                    )}
                  </Box>
                )}
              </Box>
              
              <Box sx={{ flexGrow: 1 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Student ID
                      </Typography>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          name="student_id"
                          value={editedUser.student_id || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <Typography variant="body1">
                          {user?.student_id || ''}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Department
                      </Typography>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          name="department"
                          value={editedUser.department || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <Typography variant="body1">
                          {user?.department || ''}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Semester
                      </Typography>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          name="semester"
                          value={editedUser.semester || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <Typography variant="body1">
                          {user?.semester || ''}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Phone
                      </Typography>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          name="phone"
                          value={editedUser.phone || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <Typography variant="body1">
                          {user?.phone || ''}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Address
                      </Typography>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          name="address"
                          value={editedUser.address || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <Typography variant="body1">
                          {user?.address || 'Not provided'}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Account Status
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        Verified
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Paper>
          
          <Paper elevation={3} sx={{ p: 4, borderRadius: '8px', mb: 4, bgcolor: '#fff' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Your Activity
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="user activity tabs"
                variant="fullWidth"
                sx={{ '& .MuiTab-root': { minWidth: 0 } }}
              >
                <Tab 
                  icon={<StoreIcon />} 
                  label="MARKETPLACE" 
                  id="tab-0" 
                  aria-controls="tabpanel-0" 
                  sx={{ fontSize: '0.75rem' }}
                />
                <Tab 
                  icon={<HelpOutlineIcon />} 
                  label="LOST & FOUND" 
                  id="tab-1" 
                  aria-controls="tabpanel-1" 
                  sx={{ fontSize: '0.75rem' }}
                />
                <Tab 
                  icon={<ShoppingCartIcon />} 
                  label="PURCHASE" 
                  id="tab-2" 
                  aria-controls="tabpanel-2" 
                  sx={{ fontSize: '0.75rem' }}
                />
                <Tab 
                  icon={<SellIcon />} 
                  label="SELL" 
                  id="tab-3" 
                  aria-controls="tabpanel-3" 
                  sx={{ fontSize: '0.75rem' }}
                />
                <Tab 
                  icon={<MessageIcon />} 
                  label="MESSAGES" 
                  id="tab-4" 
                  aria-controls="tabpanel-4" 
                  sx={{ fontSize: '0.75rem' }}
                />
              </Tabs>
            </Box>
            
            {/* Marketplace Tab */}
            <div role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0">
              {tabValue === 0 && renderMarketplaceItems()}
            </div>
            
            {/* Lost & Found Tab */}
            <div role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1">
              {tabValue === 1 && renderLostFoundItems()}
            </div>
            
            {/* Purchase Tab */}
            <div role="tabpanel" hidden={tabValue !== 2} id="tabpanel-2" aria-labelledby="tab-2">
              {tabValue === 2 && renderPurchaseItems()}
            </div>
            
            {/* Sell Tab */}
            <div role="tabpanel" hidden={tabValue !== 3} id="tabpanel-3" aria-labelledby="tab-3">
              {tabValue === 3 && renderSellItems()}
            </div>
            
            {/* Messages Tab */}
            <div role="tabpanel" hidden={tabValue !== 4} id="tabpanel-4" aria-labelledby="tab-4">
              {tabValue === 4 && <MessageDisplay userId={user?.id || user?._id} />}
            </div>
          </Paper>
          
          {/* Item Details Dialog */}
          <MarketplaceItemDetailsDrawer
            open={detailsOpen}
            item={selectedItem}
            onClose={() => setDetailsOpen(false)}
          />
          
          {/* Item Form Dialog */}
          <MarketplaceItemForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            item={editItem}
            isEdit={isEditForm}
            onSuccess={handleItemFormSuccess}
          />
          
          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </>
      )}
    </Container>
  );
}

export default UserProfile;
