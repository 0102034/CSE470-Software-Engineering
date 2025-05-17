import React, { useState, useEffect } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Box, 
  TextField, 
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Divider,
  Snackbar,
  Alert,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SendIcon from '@mui/icons-material/Send';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckIcon from '@mui/icons-material/Check';
import PhoneIcon from '@mui/icons-material/Phone';
import axios from 'axios';
import '../AppBackgrounds.css';

// Import the SimpleMessageDialog component for one-time messaging
import SimpleMessageDialog from '../components/SimpleMessageDialog';
import withNotificationBanner from '../components/withNotificationBanner';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedContactItem, setSelectedContactItem] = useState(null);
  // State for current user information
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  // Handle URL query parameters for success messages (from Payment.js)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const message = urlParams.get('message');
    
    if (success === 'true' && message) {
      setNotification({
        open: true,
        message: decodeURIComponent(message),
        severity: 'success'
      });
      
      // Refresh items to show updated sold status
      fetchItems();
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  // Get current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // If no token, user is not logged in
          return;
        }
        
        // Decode the JWT token to get user information
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.sub) {
              setCurrentUserId(payload.sub);
              // If email is in the token, set it
              if (payload.email) {
                setCurrentUserEmail(payload.email);
                // If we got all needed info from token, don't make API call
                return;
              }
            }
          } catch (e) {
            console.error('Error decoding token:', e);
          }
        }
        
        // Only make API call if we couldn't get email from token
        try {
          // First try the auth endpoint
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data && response.data.authenticated) {
            const userData = response.data.user;
            setCurrentUserId(userData._id || userData.id);
            setCurrentUserEmail(userData.email);
          }
        } catch (authError) {
          console.log('Auth endpoint failed, trying users endpoint');
          try {
            // Fallback to users endpoint if auth endpoint fails
            const usersResponse = await axios.get('/api/users/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (usersResponse.data) {
              setCurrentUserId(usersResponse.data._id || usersResponse.data.id);
              setCurrentUserEmail(usersResponse.data.email);
            }
          } catch (usersError) {
            console.log('Using token data only for user authentication');
            // We already have basic user info from token, so continue with that
          }
        }
      } catch (error) {
        // Don't log the error since we already have basic user info from token
        console.log('Using token data for user authentication');
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // Function to check if current user is the creator of an item
  const isItemCreator = (item) => {
    // Safety check for undefined or null values
    if (!item) return false;
    if (!item.user_id) return false;
    if (!currentUserId) return false;
    
    try {
      // Use string comparison to handle different ID formats
      return String(item.user_id) === String(currentUserId);
    } catch (error) {
      // If any error occurs during comparison, return false
      return false;
    }
  };
  
  // Debug user information
  useEffect(() => {
    // Only run this effect if we have valid data
    if (!items || !Array.isArray(items)) return;
    
    // Log user information if available
    if (currentUserId) {
      console.log('Current user information:', {
        userId: currentUserId,
        email: currentUserEmail || 'Not available',
        type: typeof currentUserId
      });
    }
    
    // Log all items when loaded to understand structure
    if (items.length > 0) {
      // Log each item's user_id for debugging (safely)
      items.forEach((item, index) => {
        if (item && item.user_id) {
          // Debug the comparison for each item
          const isCreator = isItemCreator(item);
        }
      });
    }
  }, [currentUserId, currentUserEmail, items]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    priceRange: { min: '', max: '' }
  });
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'New',
    contact: '',
    images: [],
    imageFiles: []
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // New state variables for product details, chat, and payment
  const [selectedItem, setSelectedItem] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openChatDialog, setOpenChatDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatSeller, setChatSeller] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [paymentStep, setPaymentStep] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    deliveryOption: 'standard',
    paymentMethod: 'card'
  });
  
  const isLoggedIn = localStorage.getItem('token') !== null;
  
  const categories = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Other'];
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
  
  // Define handler functions before they're used in the JSX
  const handleViewDetails = (item) => {
    // Ensure item has a seller property and createdAt to prevent errors
    const itemWithSeller = {
      ...item,
      seller: item.seller || {
        id: item.user_id || '',
        name: item.user?.name || 'Unknown Seller',
        email: item.user?.email || ''
      },
      createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
    };
    setSelectedItem(itemWithSeller);
    setOpenDetailsDialog(true);
  };

  // Handle contact seller button click
  const handleContactClick = (item) => {
    setSelectedItem(item);
    setContactDialogOpen(true);
  };

  // Function to handle buying an item
  const handleBuyNow = (item) => {
    // Get the first image URL from the item
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 
                    (item.image_url ? item.image_url : '/assets/images/placeholder.jpg');
    
    // Redirect to the payment page with item details including image
    window.location.href = `/payment?item_id=${item._id}&title=${encodeURIComponent(item.title)}&price=${item.price}&image=${encodeURIComponent(imageUrl)}`;
  };

  // Function to handle editing an item
  const handleEditItem = (item) => {
    // Create a clean copy of the item data with all required fields
    const editData = {
      _id: item._id,
      title: item.title || '',
      description: item.description || '',
      price: item.price || '',
      category: item.category || '',
      condition: item.condition || 'New',
      images: Array.isArray(item.images) ? [...item.images] : [],
      imageFiles: []
    };
    
    // First set the newItem state
    setNewItem(editData);
    // Then set itemToEdit and open dialog
    setItemToEdit(editData);
    setOpenEditDialog(true);
  };

  // Function to handle deleting an item
  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setOpenDeleteDialog(true);
  };

  // Function to confirm item deletion
  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    
    // Show loading notification
    setNotification({
      open: true,
      message: 'Deleting item...',
      severity: 'info'
    });
    
    axios.delete(`/api/marketplace/items/${itemToDelete._id}`)
      .then(response => {
        // Remove the item from the local state immediately
        setItems(prevItems => prevItems.filter(item => item._id !== itemToDelete._id));
        
        // Clear the item from localStorage
        localStorage.removeItem('marketplaceItems');
        
        // Show success notification
        setNotification({
          open: true,
          message: 'Item deleted successfully!',
          severity: 'success'
        });
        
        // Force a fresh fetch from the server
        fetchItems();
      })
      .catch(error => {
        console.error('Error deleting item:', error);
        setNotification({
          open: true,
          message: 'Failed to delete item. Please try again.',
          severity: 'error'
        });
      })
      .finally(() => {
        setOpenDeleteDialog(false);
        setItemToDelete(null);
      });
  };

  // Function to reset the form
  const resetForm = () => {
    setNewItem({
      title: '',
      description: '',
      price: '',
      category: '',
      condition: 'New',
      image: null,
      contact: ''
    });
    setImagePreview(null);
  };

  // Function to handle image change
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewItem({ ...newItem, image: file });
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to update an item
  const handleUpdateItem = () => {
    if (!itemToEdit) return;
    
    // Validate form data
    if (!newItem.title || !newItem.price || !newItem.category) {
      setNotification({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    // Show loading notification
    setNotification({
      open: true,
      message: 'Updating item...',
      severity: 'info'
    });
    
    // Prepare form data for API call
    const formData = new FormData();
    formData.append('title', newItem.title);
    formData.append('description', newItem.description);
    formData.append('price', newItem.price);
    formData.append('category', newItem.category);
    formData.append('condition', newItem.condition || 'New');
    
    // Handle images properly
    if (newItem.imageFiles && newItem.imageFiles.length > 0) {
      // If we have new image files, append them
      newItem.imageFiles.forEach((file, index) => {
        formData.append(`images`, file);
      });
    } else if (newItem.images && newItem.images.length > 0) {
      // If we have existing image URLs, append them as strings
      formData.append('existingImages', JSON.stringify(newItem.images));
    }
    
    // Make API call to update the item with retry logic for 429 errors
    const updateWithRetry = (retryCount = 0) => {
      // Add condition to form data explicitly again to ensure it's included
      if (newItem.condition) {
        formData.set('condition', newItem.condition);
      }
      
      // Log what we're sending to the server
      console.log('Sending update with condition:', newItem.condition);
      
      axios.put(`/api/marketplace/items/${itemToEdit._id}`, formData)
        .then(response => {
          // Create a complete item object with all required fields
          const updatedItem = {
            ...response.data,
            // IMPORTANT: Explicitly ensure condition is set
            condition: newItem.condition || response.data.condition || 'New',
            // Ensure we have the seller info
            seller: response.data.seller || {
              id: response.data.user_id || '',
              name: response.data.user?.name || 'Unknown Seller',
              email: response.data.user?.email || ''
            }
          };
          
          console.log('Updated item with condition:', updatedItem);
          
          // Close the dialog and reset form first
          setOpenEditDialog(false);
          setItemToEdit(null);
          resetForm();
          
          // Clear localStorage to force a fresh fetch next time
          localStorage.removeItem('marketplaceItems');
          
          // Show success notification
          setNotification({
            open: true,
            message: 'Item updated successfully!',
            severity: 'success'
          });
          
          // IMPORTANT: Update the local state without triggering a refresh
          setItems(prevItems => {
            const updatedItems = prevItems.map(item => {
              if (String(item._id) === String(updatedItem._id)) {
                // Create a complete merged object with all fields
                const mergedItem = {
                  ...item,
                  ...updatedItem,
                  // Explicitly preserve these fields to prevent them from disappearing
                  condition: newItem.condition || updatedItem.condition || item.condition || 'New',
                  category: updatedItem.category || item.category,
                  description: updatedItem.description || item.description,
                  price: updatedItem.price || item.price,
                  title: updatedItem.title || item.title,
                  images: updatedItem.images || item.images
                };
                console.log('Merged item with condition:', mergedItem.condition);
                return mergedItem;
              }
              return item;
            });
            
            // Save to localStorage for persistence
            localStorage.setItem('marketplaceItems', JSON.stringify(updatedItems));
            
            return updatedItems;
          });
        })
        .catch(error => {
          console.error('Error updating item:', error);
          
          // If we get a 429 error (too many requests), retry after a delay
          if (error.response && error.response.status === 429 && retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            setNotification({
              open: true,
              message: `Rate limit exceeded. Retrying in ${delay/1000} seconds...`,
              severity: 'warning'
            });
            
            setTimeout(() => updateWithRetry(retryCount + 1), delay);
          } else {
            setNotification({
              open: true,
              message: 'Failed to update item. Please try again later.',
              severity: 'error'
            });
          }
        });
    };
    
    // Start the update process
    updateWithRetry();
  };

  // Placeholder for sending a message
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    // Here you would send the message to the backend/chat system
    alert(`Message sent to ${chatSeller?.name}: ${chatMessage}`);
    setChatMessage("");
    setOpenChatDialog(false);
  };

  // This function is already defined above



  const handlePaymentComplete = () => {
    setOpenPaymentDialog(false);
    setPaymentStep(0);
    setNotification({
      open: true,
      message: 'Payment completed successfully!',
      severity: 'success'
    });
  };

  useEffect(() => {
    // Set a mock user ID if not present (for demo purposes)
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', '101'); // This matches our mock data for the first item
    }
    
    fetchItems();
    
    // Add a class to the body for styling
    document.body.classList.add('marketplace-page');
    
    // Refresh items periodically (every 10 seconds)
    const intervalId = setInterval(() => {
      fetchItems(false); // Pass false to avoid showing loading state
    }, 10000);
    
    return () => {
      document.body.classList.remove('marketplace-page');
      clearInterval(intervalId);
    };
  }, []);

  const fetchItems = (showLoading = true) => {
    // Log the current user ID before fetching items
    console.log('Fetching items with currentUserId:', currentUserId);
    if (showLoading) {
      setLoading(true);
    }
    
    // Try to get items from API first, fallback to localStorage
    axios.get('/api/marketplace/items', {
      // Add cache-busting parameter to prevent caching
      params: { _t: new Date().getTime() }
    })
      .then(response => {
        // Ensure each item has a seller and createdAt and sold status
        const itemsWithSeller = response.data.map(item => ({
          ...item,
          seller: item.seller || {
            id: item.user_id || '',
            name: item.user?.name || 'Unknown Seller',
            email: item.user?.email || ''
          },
          // Ensure condition is always set
          condition: item.condition || 'New',
          createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
          // Make sure sold status is a boolean
          sold: item.sold === true || item.is_sold === true
        }));
        console.log('Fetched items with sold status:', itemsWithSeller);
        setItems(itemsWithSeller);
        // Also update localStorage for offline access
        localStorage.setItem('marketplaceItems', JSON.stringify(itemsWithSeller));
        setLoading(false);
        setError('');
      })
      .catch(err => {
        console.error('Error fetching items from API:', err);
        // Fallback to localStorage
        const savedItems = JSON.parse(localStorage.getItem('marketplaceItems') || '[]');
        setItems(savedItems);
        setLoading(false);
        setError('Could not connect to server. Showing locally saved items.');
      });
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriceRangeChange = (type, value) => {
    // Only allow numbers
    if (value && !/^[0-9]*$/.test(value)) {
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: value
      }
    }));
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'price' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleAddItem = () => {
    // Validate form
    if (!newItem.title || !newItem.description || !newItem.price || !newItem.category || !newItem.condition) {
      setNotification({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    // Ensure price is always a number
    const safePrice = typeof newItem.price === 'number' ? newItem.price : Number(newItem.price) || 0;
    
    // Create FormData for API request with images
    const formData = new FormData();
    formData.append('title', newItem.title);
    formData.append('description', newItem.description);
    formData.append('price', safePrice);
    formData.append('category', newItem.category);
    formData.append('condition', newItem.condition);
    
    // Add images to form data
    if (newItem.imageFiles && newItem.imageFiles.length > 0) {
      newItem.imageFiles.forEach(file => {
        formData.append('images', file);
      });
    }
    
    // Show loading notification
    setNotification({
      open: true,
      message: 'Adding item...',
      severity: 'info'
    });
    
    // Send to API
    const token = localStorage.getItem('token');
    axios.post('/api/marketplace/items', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(response => {
      // Add the new item to the list
      const newItemData = response.data;
      // Ensure price is always present
      if (typeof newItemData.price === 'undefined') newItemData.price = safePrice;
      
      // Update local state
      setItems(prev => [newItemData, ...prev]);
      
      // Also update localStorage
      const existingItems = JSON.parse(localStorage.getItem('marketplaceItems') || '[]');
      localStorage.setItem('marketplaceItems', JSON.stringify([newItemData, ...existingItems]));
      
      // Reset the form and close the dialog
      setNewItem({
        title: '',
        description: '',
        price: '',
        condition: '',
        category: '',
        images: [],
        imageFiles: []
      });
      
      setOpenAddDialog(false);
      
      setNotification({
        open: true,
        message: 'Item added successfully!',
        severity: 'success'
      });
      
      // Refresh items to ensure consistency with backend
      fetchItems(false);
    })
    .catch(error => {
      console.error('Error adding item:', error);
      
      // Fallback to local storage if API fails
      const newItemData = {
        _id: Math.random().toString(36).substring(2, 10),
        ...newItem,
        price: safePrice,
        images: newItem.images.length > 0 ? newItem.images : ['https://via.placeholder.com/300x200?text=No+Image'],
        seller: {
          id: localStorage.getItem('userId') || '101',
          name: 'Current User',
          email: 'user@example.com'
        },
        createdAt: new Date().toISOString()
      };
      
      // Add to local state
      setItems(prev => [newItemData, ...prev]);
      
      // Save to localStorage
      const existingItems = JSON.parse(localStorage.getItem('marketplaceItems') || '[]');
      localStorage.setItem('marketplaceItems', JSON.stringify([newItemData, ...existingItems]));
      
      setNotification({
        open: true,
        message: 'Item added locally (offline mode)',
        severity: 'warning'
      });
      
      // Reset form and close dialog
      setNewItem({
        title: '',
        description: '',
        price: '',
        condition: '',
        category: '',
        images: [],
        imageFiles: []
      });
      
      setOpenAddDialog(false);
    });
  };

  const filteredItems = items.filter(item => {
    // Skip invalid items
    if (!item || typeof item !== 'object') return false;
    // Ensure price is always a number
    const itemPrice = typeof item.price === 'number' ? item.price : Number(item.price) || 0;
    
    // Search query filter
    const itemTitle = item.title || '';
    const itemDescription = item.description || '';
    const matchesSearch = !searchQuery || 
                        itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        itemDescription.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category filter
    const matchesCategory = !filters.category || item.category === filters.category;
    
    // Condition filter
    const matchesCondition = !filters.condition || item.condition === filters.condition;
    
    // Price range filter
    const matchesPriceRange = (
      (!filters.priceRange.min || itemPrice >= Number(filters.priceRange.min)) &&
      (!filters.priceRange.max || itemPrice <= Number(filters.priceRange.max))
    );
    
    return matchesSearch && matchesCategory && matchesCondition && matchesPriceRange;
  });

  return React.createElement(Container, { maxWidth: "lg", sx: { py: 4 } },
    React.createElement(Snackbar, {
      open: notification.open,
      autoHideDuration: 6000,
      onClose: () => setNotification(prev => ({ ...prev, open: false })),
      anchorOrigin: { vertical: 'top', horizontal: 'center' }
    },
      React.createElement(Alert, {
        onClose: () => setNotification(prev => ({ ...prev, open: false })),
        severity: notification.severity,
        sx: { width: '100%' }
      }, notification.message)
    ),
    
    React.createElement(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 } },
      React.createElement(Typography, { variant: "h4", gutterBottom: true }, "Marketplace"),
      React.createElement(Button, { variant: "contained", onClick: () => setOpenAddDialog(true) }, "Add New Item")
    ),
    
    /* Search and filter section */
    React.createElement(Box, { sx: { mb: 4 } },
      React.createElement(Grid, { container: true, spacing: 2 },
        React.createElement(Grid, { item: true, xs: 12, md: 6 },
          React.createElement(TextField, {
            fullWidth: true,
            placeholder: "Search items...",
            value: searchQuery,
            onChange: handleSearchChange,
            InputProps: {
              startAdornment: React.createElement(
                InputAdornment, { position: "start" },
                React.createElement(SearchIcon)
              )
            }
          })
        ),
        React.createElement(Grid, { item: true, xs: 12, md: 6 },
          React.createElement(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' } },
            React.createElement(FormControl, { sx: { minWidth: 120 }, size: "small" },
              React.createElement(InputLabel, null, "Category"),
              React.createElement(Select, {
                value: filters.category,
                onChange: (e) => handleFilterChange('category', e.target.value),
                label: "Category"
              },
                React.createElement(MenuItem, { value: "" }, "All"),
                categories.map(category => (
                  React.createElement(MenuItem, { key: category, value: category }, category)
                ))
              )
            ),
            React.createElement(FormControl, { sx: { minWidth: 120 }, size: "small" },
              React.createElement(InputLabel, null, "Condition"),
              React.createElement(Select, {
                value: filters.condition,
                onChange: (e) => handleFilterChange('condition', e.target.value),
                label: "Condition"
              },
                React.createElement(MenuItem, { value: "" }, "All"),
                conditions.map(condition => (
                  React.createElement(MenuItem, { key: condition, value: condition }, condition)
                ))
              )
            ),
            React.createElement(TextField, {
              sx: { width: 120 },
              size: "small",
              label: "Min Price",
              type: "number",
              value: filters.priceRange.min,
              onChange: (e) => handlePriceRangeChange('min', e.target.value),
              InputProps: {
                startAdornment: React.createElement(InputAdornment, { position: "start" }, "৳")
              }
            }),
            React.createElement(TextField, {
              sx: { width: 120 },
              size: "small",
              label: "Max Price",
              type: "number",
              value: filters.priceRange.max,
              onChange: (e) => handlePriceRangeChange('max', e.target.value),
              InputProps: {
                startAdornment: React.createElement(InputAdornment, { position: "start" }, "৳")
              }
            })
          )
        )
      )
    ),
    
    /* Items display */
    React.createElement(Grid, { container: true, spacing: 3, key: 'marketplace-grid' },
      filteredItems.length > 0 ? 
        filteredItems.map((item) => 
          React.createElement(Grid, { item: true, key: `item-${item._id}`, xs: 12, sm: 6, md: 4 },
            React.createElement(Card, { sx: { height: '100%', display: 'flex', flexDirection: 'column' } },
              React.createElement(CardMedia, {
                component: "img",
                height: "200",
                image: item.images?.[0] || "https://via.placeholder.com/300x200?text=No+Image",
                alt: item.title
              }),
              React.createElement(CardContent, { sx: { flexGrow: 1 } },
                React.createElement(Typography, { variant: "h6", component: "div", gutterBottom: true, noWrap: true },
                  item.title
                ),
                React.createElement(Typography, { variant: "h5", color: "primary", gutterBottom: true },
                  "৳" + item.price.toLocaleString()
                ),
                React.createElement(Box, { sx: { display: 'flex', mb: 1 } },
                  React.createElement(Chip, { 
                    label: item.category, 
                    size: "small", 
                    sx: { mr: 1 } 
                  }),
                  React.createElement(Chip, { 
                    label: item.condition || 'New', 
                    size: "small",
                    color: "secondary",
                    sx: { display: 'inline-flex' }
                  })
                ),
                React.createElement(Typography, { 
                  variant: "body2", 
                  color: "text.secondary",
                  sx: {
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }
                }, item.description)
              ),
              React.createElement(Box, { sx: { p: 2, pt: 0, mt: 'auto' } },
                React.createElement(Grid, { container: true, spacing: 1, key: `grid-${item._id}` },
                  // First check if the item is sold
                  item.sold ? 
                  // If item is sold, show a message and only View Details button
                  React.createElement(React.Fragment, { key: `fragment-${item._id}` },
                    React.createElement(Grid, { item: true, xs: 12, key: `sold-message-${item._id}` },
                      React.createElement(Typography, {
                        variant: "body2",
                        color: "error",
                        align: "center",
                        sx: { fontWeight: 'bold', py: 1 }
                      }, "This Item Has Been Sold")
                    ),
                    // Add View Details button for sold items
                    React.createElement(Grid, { item: true, xs: 12, key: `details-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        onClick: () => handleViewDetails(item)
                      }, "View Details")
                    )
                  ) :
                  // If item is not sold, check if current user is the creator
                  isItemCreator(item) ?
                  // If current user is the creator, show edit/delete options
                  React.createElement(React.Fragment, null,
                    React.createElement(Grid, { item: true, xs: 12, key: `your-item-${item._id}` },
                      React.createElement(Typography, {
                        variant: "body2",
                        color: "primary",
                        align: "center",
                        sx: { fontWeight: 'medium', py: 1 }
                      }, "You Listed This Item")
                    ),
                    // Add View Details button for the creator
                    React.createElement(Grid, { item: true, xs: 12, key: `details-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        onClick: () => handleViewDetails(item)
                      }, "View Details")
                    ),
                    // Add Edit button for the creator
                    React.createElement(Grid, { item: true, xs: 6, key: `edit-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "contained",
                        color: "primary",
                        onClick: () => handleEditItem(item),
                        startIcon: React.createElement('span', null, '✏️')
                      }, "Edit Item")
                    ),
                    // Add Delete button for the creator
                    React.createElement(Grid, { item: true, xs: 6, key: `delete-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "contained",
                        color: "error",
                        onClick: () => handleDeleteItem(item),
                        startIcon: React.createElement('span', null, '🗑️')
                      }, "Delete")
                    )
                  ) :
                  // If current user is not the creator and item is not sold, show all action buttons
                  React.createElement(React.Fragment, null,
                    React.createElement(Grid, { item: true, xs: 12, key: `details-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        onClick: () => handleViewDetails(item)
                      }, "View Details")
                    ),
                    React.createElement(Grid, { item: true, xs: 6, key: `buy-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "contained",
                        onClick: () => handleBuyNow(item)
                      }, "Buy Now")
                    ),
                    React.createElement(Grid, { item: true, xs: 6, key: `contact-${item._id}` },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        startIcon: React.createElement(PhoneIcon),
                        onClick: () => {
                          // Set the selected item for the contact dialog
                          setSelectedContactItem(item);
                          // Open the contact dialog
                          setContactDialogOpen(true);
                        }
                      }, "Contact Seller")
                    )
                  )
                )
              )
            )
          )
        ) : (
          React.createElement(Grid, { item: true, xs: 12 },
            React.createElement(Paper, { sx: { p: 3, textAlign: 'center' } },
              React.createElement(Typography, { variant: "h6", color: "text.secondary" },
                loading ? "Loading items..." : "No items found matching your criteria"
              )
            )
          )
        )
    ),
    
    /* Details Dialog */
    React.createElement(Dialog, {
      open: openDetailsDialog,
      onClose: () => setOpenDetailsDialog(false),
      maxWidth: "md",
      fullWidth: true
    },
      selectedItem && React.createElement(React.Fragment, null,
        React.createElement(DialogTitle, null,
          selectedItem.title,
          React.createElement(IconButton, {
            onClick: () => setOpenDetailsDialog(false),
            sx: { position: 'absolute', right: 8, top: 8 }
          }, React.createElement(CloseIcon))
        ),
        React.createElement(DialogContent, { dividers: true },
          React.createElement(Grid, { container: true, spacing: 3 },
            React.createElement(Grid, { item: true, xs: 12, md: 6 },
              React.createElement(Box, { sx: { position: 'relative', width: '100%', height: 300 } },
                selectedItem.images && selectedItem.images.length > 0 ?
                  React.createElement('img', {
                    src: selectedItem.images[0],
                    alt: selectedItem.title,
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }
                  }) :
                  React.createElement(Box, {
                    sx: {
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#f5f5f5'
                    }
                  }, "No Image Available")
              ),
              selectedItem.images && selectedItem.images.length > 1 && 
                React.createElement(Box, { sx: { display: 'flex', mt: 2, gap: 1 } },
                  selectedItem.images.map((img, index) => (
                    React.createElement(Box, {
                      key: index,
                      sx: {
                        width: 60,
                        height: 60,
                        border: '1px solid #ddd',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 }
                      }
                    },
                      React.createElement('img', {
                        src: img,
                        alt: `Product image ${index + 1}`,
                        style: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }
                      })
                    )
                  ))
                )
            ),
            React.createElement(Grid, { item: true, xs: 12, md: 6 },
              React.createElement(Typography, { variant: "h4", color: "primary", gutterBottom: true },
                "৳" + selectedItem.price.toLocaleString()
              ),
              React.createElement(Box, { sx: { display: 'flex', mb: 2 } },
                React.createElement(Chip, { 
                  label: selectedItem.category, 
                  size: "small", 
                  sx: { mr: 1 } 
                }),
                React.createElement(Chip, { 
                  label: selectedItem.condition, 
                  size: "small",
                  color: "secondary"
                })
              ),
              React.createElement(Typography, { variant: "body1", paragraph: true },
                selectedItem.description
              ),
              React.createElement(Divider, { sx: { my: 2 } }),
              React.createElement(Box, { sx: { mb: 2 } },
                React.createElement(Typography, { variant: "subtitle2", gutterBottom: true },
                  "Seller: ",
                  React.createElement('span', { style: { fontWeight: 600, color: '#1976d2' } }, selectedItem.seller?.name || 'Unknown Seller')
                ),
                React.createElement(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true },
                  "Posted on: ",
                  React.createElement('span', { style: { fontWeight: 500, color: '#333' } },
                    selectedItem.createdAt ?
                      new Date(selectedItem.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) :
                      'Unknown Date'
                  )
                )
              ),
              // First check if the item is sold
              selectedItem.sold ? 
              // If item is sold, show a sold message
              React.createElement(Box, { sx: { mt: 3, p: 2, bgcolor: '#ffebee', borderRadius: 1 } },
                React.createElement(Typography, {
                  variant: "body1",
                  color: "error",
                  align: "center",
                  sx: { fontWeight: 'bold' }
                }, "This Item Has Been Sold")
              ) :
              // If item is not sold, check if current user is the creator
              isItemCreator(selectedItem) ?
              // If current user is the creator, show a message
              React.createElement(Box, { sx: { mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 } },
                React.createElement(Typography, {
                  variant: "body1",
                  color: "primary",
                  align: "center",
                  sx: { fontWeight: 'medium' }
                }, "You Listed This Item")
              ) :
              // If current user is not the creator and item is not sold, show buy and contact buttons
              React.createElement(React.Fragment, null,
                React.createElement(Box, { sx: { mt: 3 } },
                  React.createElement(Button, {
                    variant: "contained",
                    size: "large",
                    fullWidth: true,
                    startIcon: React.createElement(ShoppingCartIcon),
                    onClick: () => handleBuyNow(selectedItem)
                  }, "Buy Now")
                ),
                React.createElement(Button, {
                  variant: "outlined",
                  size: "large",
                  fullWidth: true,
                  sx: { mt: 2 },
                  startIcon: React.createElement(ChatIcon),
                  onClick: () => {
                    setOpenDetailsDialog(false);
                    setChatSeller(selectedItem.seller);
                    setOpenChatDialog(true);
                  }
                }, "Contact Seller")
              )
            )
          )
        )
      )
    ),
    
    /* Chat Dialog */
    React.createElement(Dialog, {
      open: openChatDialog,
      onClose: () => setOpenChatDialog(false),
      maxWidth: "xs",
      fullWidth: true
    },
      React.createElement(DialogTitle, null, `Chat with ${chatSeller?.name || 'Seller'}`),
      React.createElement(DialogContent, null,
        React.createElement(Box, { sx: { mb: 2 } },
          React.createElement(Typography, { variant: "body2", color: "text.secondary" },
            chatSeller?.email ? `Email: ${chatSeller.email}` : null
          )
        ),
        React.createElement(TextField, {
          fullWidth: true,
          label: "Type your message",
          value: chatMessage,
          onChange: (e) => setChatMessage(e.target.value),
          multiline: true,
          rows: 3,
          autoFocus: true,
          sx: { mb: 2 }
        })
      ),
      React.createElement(DialogActions, null,
        React.createElement(Button, { onClick: () => setOpenChatDialog(false) }, "Cancel"),
        React.createElement(Button, {
          onClick: handleSendMessage,
          variant: "contained",
          endIcon: React.createElement(SendIcon)
        }, "Send")
      )
    ),

    /* Payment Dialog */
    React.createElement(Dialog, {
      open: openPaymentDialog,
      onClose: () => setOpenPaymentDialog(false),
      maxWidth: "sm",
      fullWidth: true
    },
      React.createElement(DialogTitle, null,
        "Complete Your Purchase",
        React.createElement(IconButton, {
          onClick: () => setOpenPaymentDialog(false),
          sx: { position: 'absolute', right: 8, top: 8 }
        }, React.createElement(CloseIcon))
      ),
      React.createElement(DialogContent, null,
        selectedItem && React.createElement(Typography, { variant: "body1" }, 
          "Payment processing for item: " + (selectedItem ? selectedItem.title : "")
        )
      )
    ),
    
    /* Delete Confirmation Dialog */
    React.createElement(Dialog, {
      open: openDeleteDialog,
      onClose: () => setOpenDeleteDialog(false),
      PaperProps: {
        sx: {
          borderRadius: '16px',
          padding: '8px',
          maxWidth: '400px',
          width: '100%'
        }
      }
    },
      React.createElement(Box, { 
        sx: { 
          p: 3, 
          textAlign: 'center',
          background: 'linear-gradient(to right, #ff5252, #ff1744)',
          borderRadius: '8px 8px 0 0',
          color: 'white'
        }
      },
        React.createElement('span', { style: { fontSize: '50px', marginBottom: '8px', display: 'block' } }, '🗑️'),
        React.createElement(Typography, { variant: "h5", sx: { fontWeight: 'bold', mb: 1 } },
          "Delete Item"
        )
      ),
      
      React.createElement(DialogContent, { sx: { p: 3, textAlign: 'center' } },
        React.createElement(Typography, { variant: "body1", sx: { mb: 2 } },
          "Are you sure you want to delete ",
          React.createElement(Typography, { component: "span", sx: { fontWeight: 'bold', color: '#ff1744' } },
            itemToDelete?.title || 'this item'
          ),
          "?"
        ),
        
        React.createElement(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 } },
          "This action cannot be undone. The item will be permanently removed from the marketplace."
        ),
        
        React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', gap: 2, mt: 2 } },
          React.createElement(Button, { 
            variant: "outlined", 
            onClick: () => setOpenDeleteDialog(false),
            sx: { 
              borderRadius: '20px', 
              px: 3,
              borderColor: '#9e9e9e',
              color: '#9e9e9e',
              '&:hover': {
                borderColor: '#757575',
                backgroundColor: 'rgba(0,0,0,0.04)'
              }
            }
          }, "Cancel"),
          React.createElement(Button, { 
            variant: "contained", 
            color: "error", 
            onClick: confirmDeleteItem,
            sx: { 
              borderRadius: '20px', 
              px: 3,
              background: 'linear-gradient(45deg, #ff5252, #ff1744)',
              boxShadow: '0 4px 8px rgba(255, 23, 68, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #ff1744, #d50000)',
                boxShadow: '0 6px 10px rgba(255, 23, 68, 0.4)'
              }
            }
          }, "Delete Item")
        )
      )
    ),
    
    /* Simple Edit Item Dialog */
    React.createElement(Dialog, {
      open: openEditDialog,
      onClose: () => setOpenEditDialog(false),
      maxWidth: "sm",
      fullWidth: true
    },
      React.createElement(DialogTitle, null,
        "Edit Item",
        React.createElement(IconButton, {
          onClick: () => setOpenEditDialog(false),
          sx: { position: 'absolute', right: 8, top: 8 }
        }, React.createElement(CloseIcon))
      ),
      React.createElement(DialogContent, null,
        React.createElement(Box, { component: "form", sx: { mt: 2 } },
          React.createElement(Grid, { container: true, spacing: 2, key: 'edit-form-grid' },
            React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'title-field' },
              React.createElement(TextField, {
                fullWidth: true,
                label: "Title",
                value: newItem.title,
                onChange: (e) => setNewItem({ ...newItem, title: e.target.value }),
                required: true,
                margin: "normal"
              })
            ),
            React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'price-field' },
              React.createElement(TextField, {
                fullWidth: true,
                label: "Price",
                type: "number",
                value: newItem.price,
                onChange: (e) => setNewItem({ ...newItem, price: e.target.value }),
                InputProps: {
                  startAdornment: React.createElement(InputAdornment, { position: "start" }, "৳")
                },
                required: true,
                margin: "normal"
              })
            ),
            React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'category-field' },
              React.createElement(FormControl, { fullWidth: true, margin: "normal", required: true },
                React.createElement(InputLabel, null, "Category"),
                React.createElement(Select, {
                  value: newItem.category,
                  onChange: (e) => setNewItem({ ...newItem, category: e.target.value }),
                  label: "Category"
                },
                  categories.map(category => (
                    React.createElement(MenuItem, { key: category, value: category }, category)
                  ))
                )
              )
            ),
            React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'condition-field' },
              React.createElement(FormControl, { fullWidth: true, margin: "normal" },
                React.createElement(InputLabel, null, "Condition"),
                React.createElement(Select, {
                  value: newItem.condition,
                  onChange: (e) => setNewItem({ ...newItem, condition: e.target.value }),
                  label: "Condition"
                },
                  conditions.map(condition => (
                    React.createElement(MenuItem, { key: condition, value: condition }, condition)
                  ))
                )
              )
            ),
            React.createElement(Grid, { item: true, xs: 12, key: 'description-field' },
              React.createElement(TextField, {
                fullWidth: true,
                label: "Description",
                value: newItem.description,
                onChange: (e) => setNewItem({ ...newItem, description: e.target.value }),
                multiline: true,
                rows: 3,
                margin: "normal"
              })
            )
          )
        )
      ),
      React.createElement(DialogActions, null,
        React.createElement(Button, { onClick: () => setOpenEditDialog(false) }, "Cancel"),
        React.createElement(Button, { onClick: handleUpdateItem, variant: "contained", color: "primary" }, "Update Item")
      )
    ),
    
    /* Add Item Dialog */
    React.createElement(Dialog, {
      open: openAddDialog,
      onClose: () => setOpenAddDialog(false),
      maxWidth: "md",
      fullWidth: true
    },
      React.createElement(DialogTitle, null, 
        "Add New Item",
        React.createElement(IconButton, {
          onClick: () => setOpenAddDialog(false),
          sx: { position: 'absolute', right: 8, top: 8 }
        }, React.createElement(CloseIcon))
      ),
      React.createElement(DialogContent, { dividers: true },
        React.createElement(Grid, { container: true, spacing: 2 },
          React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'title-field' },
            React.createElement(TextField, {
              fullWidth: true,
              label: "Title",
              name: "title",
              value: newItem.title,
              onChange: handleNewItemChange,
              margin: "normal",
              required: true
            })
          ),
          React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'price-field' },
            React.createElement(TextField, {
              fullWidth: true,
              label: "Price (৳)",
              name: "price",
              type: "number",
              value: newItem.price,
              onChange: handleNewItemChange,
              margin: "normal",
              required: true,
              InputProps: {
                startAdornment: React.createElement(InputAdornment, { position: "start" }, "৳")
              }
            })
          ),
          React.createElement(Grid, { item: true, xs: 12, md: 6, key: 'category-field' },
            React.createElement(FormControl, { fullWidth: true, margin: "normal", required: true },
              React.createElement(InputLabel, null, "Category"),
              React.createElement(Select, {
                name: "category",
                value: newItem.category,
                onChange: handleNewItemChange,
                label: "Category"
              },
                categories.map(category => (
                  React.createElement(MenuItem, { key: category, value: category }, category)
                ))
              )
            )
          ),
          React.createElement(Grid, { item: true, xs: 12, md: 6 },
            React.createElement(FormControl, { fullWidth: true, margin: "normal", required: true },
              React.createElement(InputLabel, null, "Condition"),
              React.createElement(Select, {
                name: "condition",
                value: newItem.condition,
                onChange: handleNewItemChange,
                label: "Condition"
              },
                conditions.map(condition => (
                  React.createElement(MenuItem, { key: condition, value: condition }, condition)
                ))
              )
            )
          ),
          React.createElement(Grid, { item: true, xs: 12, key: 'description-field' },
            React.createElement(TextField, {
              fullWidth: true,
              label: "Description",
              name: "description",
              value: newItem.description,
              onChange: handleNewItemChange,
              margin: "normal",
              required: true,
              multiline: true,
              rows: 4
            })
          ),
          React.createElement(Grid, { item: true, xs: 12, key: 'photos-upload' },
            React.createElement(Box, { sx: { mt: 2 } },
              React.createElement(Typography, { variant: "subtitle1", gutterBottom: true }, "Upload Photos (Max 3)"),
              React.createElement('input', {
                type: "file",
                accept: "image/*",
                multiple: true,
                onChange: (e) => {
                  const files = Array.from(e.target.files).slice(0, 3);
                  const fileUrls = files.map(file => URL.createObjectURL(file));
                  setNewItem(prev => ({
                    ...prev,
                    imageFiles: files,
                    images: fileUrls
                  }));
                },
                style: { display: 'none' },
                id: "photo-upload-input"
              }),
              React.createElement('label', { htmlFor: "photo-upload-input" },
                React.createElement(Button, {
                  variant: "contained",
                  component: "span",
                  sx: { mt: 1, mb: 2 }
                }, "Choose Photos")
              ),
              React.createElement(Box, { sx: { display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' } },
                (newItem.images || []).length > 0 ?
                  (newItem.images || []).map((img, index) => (
                    React.createElement(Box, {
                      key: `image-${index}`,
                      sx: {
                        width: 100,
                        height: 100,
                        position: 'relative',
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }
                    },
                      React.createElement('img', {
                        src: img,
                        alt: `Upload preview ${index + 1}`,
                        style: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }
                      }),
                      React.createElement(IconButton, {
                        size: "small",
                        sx: {
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bgcolor: 'rgba(255,255,255,0.7)'
                        },
                        onClick: () => {
                          const newImages = [...newItem.images];
                          const newImageFiles = [...newItem.imageFiles];
                          newImages.splice(index, 1);
                          newImageFiles.splice(index, 1);
                          setNewItem(prev => ({
                            ...prev,
                            images: newImages,
                            imageFiles: newImageFiles
                          }));
                        }
                      }, React.createElement(CloseIcon, { fontSize: "small" }))
                    )
                  )) :
                  React.createElement(Typography, { variant: "body2", color: "text.secondary" }, "No photos selected")
              ),
              React.createElement(Typography, { variant: "caption", color: "text.secondary" },
                `${(newItem.images || []).length}/3 photos uploaded`
              )
            )
          )
        )
      ),
      React.createElement(DialogActions, null,
        React.createElement(Button, { onClick: () => setOpenAddDialog(false) }, "Cancel"),
        React.createElement(Button, { onClick: handleAddItem, variant: "contained" }, "Add Item")
      )
    ),
    // Add SimpleMessageDialog component at the end of your return statement
    React.createElement(SimpleMessageDialog, {
      open: contactDialogOpen,
      onClose: () => setContactDialogOpen(false),
      item: selectedContactItem,
      itemType: 'marketplace'
    })
  );
};

export default withNotificationBanner(Marketplace, 'marketplace');