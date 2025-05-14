import React, { useState, useEffect } from 'react';
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
import axios from 'axios';
import '../AppBackgrounds.css';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUserId = localStorage.getItem('userId') || '';
const currentUserEmail = localStorage.getItem('email') || '';
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
    condition: '',
    category: '',
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
  const [chatMessages, setChatMessages] = useState([]);
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

  // State for chat dialog seller info
  const [chatSeller, setChatSeller] = useState(null);

  // Placeholder for sending a message
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    // Here you would send the message to the backend/chat system
    alert(`Message sent to ${chatSeller?.name}: ${chatMessage}`);
    setChatMessage("");
    setOpenChatDialog(false);
  };

  const handleBuyNow = (item) => {
    setSelectedItem(item);
    // Redirect to payment page with all necessary information
    window.location.href = `/payment?itemId=${item._id}&price=${item.price}&title=${encodeURIComponent(item.title)}&sellerId=${item.seller.id}&sellerName=${encodeURIComponent(item.seller.name)}&sellerEmail=${encodeURIComponent(item.seller.email)}&image=${encodeURIComponent(item.images?.[0] || '')}`;
  };



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
    if (showLoading) {
      setLoading(true);
    }
    
    // Try to get items from API first, fallback to localStorage
    axios.get('/api/marketplace/items')
      .then(response => {
        // Ensure each item has a seller and createdAt
        const itemsWithSeller = response.data.map(item => ({
          ...item,
          seller: item.seller || {
            id: item.user_id || '',
            name: item.user?.name || 'Unknown Seller',
            email: item.user?.email || ''
          },
          createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
        }));
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
    React.createElement(Grid, { container: true, spacing: 3 },
      filteredItems.length > 0 ? 
        filteredItems.map((item) => 
          React.createElement(Grid, { item: true, key: item._id, xs: 12, sm: 6, md: 4 },
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
                    label: item.condition, 
                    size: "small",
                    color: "secondary"
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
                React.createElement(Grid, { container: true, spacing: 1 },
                  // Show different buttons based on whether the user is the creator
                  item.seller?.email === currentUserEmail ?
                  [
                    React.createElement(Grid, { item: true, xs: 12, key: 'yourItem' },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        onClick: () => handleViewDetails(item)
                      }, "You Listed This Item - View Details")
                    )
                  ] :
                  [
                    React.createElement(Grid, { item: true, xs: 12, key: 'details' },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        onClick: () => handleViewDetails(item)
                      }, "View Details")
                    ),
                    React.createElement(Grid, { item: true, xs: 6, key: 'buy' },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "contained",
                        onClick: () => handleBuyNow(item)
                      }, "Buy Now")
                    ),
                    React.createElement(Grid, { item: true, xs: 6, key: 'contact' },
                      React.createElement(Button, {
                        size: "small",
                        fullWidth: true,
                        variant: "outlined",
                        onClick: () => {
                          setChatSeller(item.seller);
                          setOpenChatDialog(true);
                        }
                      }, "Contact Seller")
                    )
                  ]
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
  React.createElement('span', { style: { fontWeight: 600, color: '#1976d2' } }, selectedItem.seller?.name || 'Unknown Seller'),
  selectedItem.seller?.email ? ` (${selectedItem.seller.email})` : null
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
              // Only show Buy Now and Contact Seller buttons if the item is not created by the current user (by email)
(selectedItem.seller?.email && selectedItem.seller.email !== currentUserEmail) ?
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
  ) : null
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
          React.createElement(Grid, { item: true, xs: 12, md: 6 },
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
          React.createElement(Grid, { item: true, xs: 12, md: 6 },
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
          React.createElement(Grid, { item: true, xs: 12, md: 6 },
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
          React.createElement(Grid, { item: true, xs: 12 },
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
          React.createElement(Grid, { item: true, xs: 12 },
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
                newItem.images.length > 0 ?
                  newItem.images.map((img, index) => (
                    React.createElement(Box, {
                      key: index,
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
                `${newItem.images.length}/3 photos uploaded`
              )
            )
          )
        )
      ),
      React.createElement(DialogActions, null,
        React.createElement(Button, { onClick: () => setOpenAddDialog(false) }, "Cancel"),
        React.createElement(Button, { onClick: handleAddItem, variant: "contained" }, "Add Item")
      )
    )
  );
};

export default Marketplace;
