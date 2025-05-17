import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import withNotificationBanner from '../components/withNotificationBanner';
import SimpleMessageDialog from '../components/SimpleMessageDialog';
import {
  Container, Typography, Grid, Card, CardContent, CardActions,
  Button, Box, Tabs, Tab, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Divider, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Snackbar, Stack, FormControlLabel, Switch,
  OutlinedInput, Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  DirectionsCar as CarIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  TwoWheeler as TwoWheelerIcon,
  AttachMoney as AttachMoneyIcon,
  EventSeat as EventSeatIcon,
  Cancel as CancelIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import axios from 'axios';
import '../AppBackgrounds.css';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const RideShare = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [availableRides, setAvailableRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Current user info
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  // Post ride dialog
  const [openPostDialog, setOpenPostDialog] = useState(false);
  const [newRide, setNewRide] = useState({
    from_location: '',
    from_location_custom: '',
    to_location: '',
    to_location_custom: '',
    date: '',
    time: '',
    vehicle_type: 'car',
    phone_number: '',
    seats_available: 1,
    is_paid: false,
    fee_per_seat: 0,
    payment_method: 'cash',
    description: ''
  });
  
  // Major locations in Dhaka for suggestions
  const majorLocations = [
    'Merul Badda',
    'BRAC University',
    'Gulshan',
    'Banani',
    'Uttara',
    'Mohakhali',
    'Dhanmondi',
    'Mirpur',
    'Bashundhara',
    'Airport',
    'Motijheel',
    'Shahbag',
    'Farmgate',
    'Mohammadpur',
    'Tejgaon',
    'Rampura',
    'Malibagh',
    'Khilgaon',
    'Jatrabari',
    'New Market'
  ];
  
  // Book ride dialog
  const [openBookDialog, setOpenBookDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  
  // Cancel booking dialog
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Delete ride dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [rideToDelete, setRideToDelete] = useState(null);
  
  // Edit ride dialog
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [rideToEdit, setRideToEdit] = useState(null);
  
  // Contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedContactRide, setSelectedContactRide] = useState(null);

  // Get current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        let userId = null;
        let userEmail = null;
        
        // Decode the JWT token to get user information without making an API call
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Token payload:', payload);
            if (payload.sub) {
              userId = payload.sub;
              setCurrentUserId(userId);
              // If email is in the token, set it
              if (payload.email) {
                userEmail = payload.email;
                setCurrentUserEmail(userEmail);
              }
            } else if (payload.identity) {
              // Alternative JWT format
              userId = payload.identity;
              setCurrentUserId(userId);
            }
          } catch (e) {
            console.error('Error decoding token:', e);
          }
        }
        
        // Also try the API endpoint as a backup
        try {
          const response = await axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data && response.data._id) {
            userId = response.data._id;
            setCurrentUserId(userId);
          }
          if (response.data && response.data.email) {
            userEmail = response.data.email;
            setCurrentUserEmail(userEmail);
          }
        } catch (apiError) {
          console.log('API endpoint for current user not available, using token data');
          
          // If we still don't have a userId, try to get it from localStorage as a last resort
          if (!userId) {
            const userData = localStorage.getItem('user');
            if (userData) {
              try {
                const parsedUser = JSON.parse(userData);
                if (parsedUser._id) {
                  userId = parsedUser._id;
                  setCurrentUserId(userId);
                }
                if (parsedUser.email) {
                  userEmail = parsedUser.email;
                  setCurrentUserEmail(userEmail);
                }
              } catch (e) {
                console.error('Error parsing user data from localStorage:', e);
              }
            }
          }
        }
        
        // Log the final result for debugging
        console.log('Final currentUserId:', userId);
        
        // If we still don't have a userId, show an error
        if (!userId) {
          console.error('Failed to retrieve user ID from all available sources');
          setError('Authentication issue: Unable to retrieve your user information. Please try logging in again.');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        if (error.response && error.response.status === 401) {
          navigate('/login');
        }
      }
    };
    
    fetchCurrentUser();
  }, [navigate]);

  // Fetch rides and bookings when tab changes or after actions
  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (tabValue === 0) {
          // Fetch available rides
          const response = await axios.get('/api/ride/share');
          
          // Filter out rides with no seats available
          const availableRidesWithSeats = response.data.filter(ride => 
            ride.seats_available > 0 && ride.status !== 'booked'
          );
          
          console.log('Available rides with seats:', availableRidesWithSeats.length, 'out of', response.data.length);
          setAvailableRides(availableRidesWithSeats);
        } else {
          // Fetch user's bookings
          const response = await axios.get('/api/ride/bookings');
          setMyBookings(response.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRides();
  }, [tabValue]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format time to 12-hour format
  const formatTime = (timeString) => {
    // Parse the time string (expected format: HH:MM)
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    
    // Convert to 12-hour format
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${period}`;
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle input change for new ride form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for location fields
    if (name === 'from_location' && value === 'other') {
      // When 'other' is selected, initialize the custom field if not already set
      setNewRide(prev => ({
        ...prev,
        [name]: value,
        from_location_custom: prev.from_location_custom || ''
      }));
    } else if (name === 'to_location' && value === 'other') {
      // When 'other' is selected, initialize the custom field if not already set
      setNewRide(prev => ({
        ...prev,
        [name]: value,
        to_location_custom: prev.to_location_custom || ''
      }));
    } else {
      // Standard handling for all other fields
      setNewRide(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Post or update a ride
  const handlePostRide = async () => {
    try {
      // Check if custom locations need to be processed
      let formData = {...newRide};
      
      // Handle custom 'from' location
      if (formData.from_location === 'other') {
        if (!formData.from_location_custom) {
          setError('Please enter a custom pickup location');
          return;
        }
        formData.from_location = formData.from_location_custom;
      }
      
      // Handle custom 'to' location
      if (formData.to_location === 'other') {
        if (!formData.to_location_custom) {
          setError('Please enter a custom destination location');
          return;
        }
        formData.to_location = formData.to_location_custom;
      }
      
      // Validate required fields
      if (!formData.from_location || !formData.to_location || !formData.date || !formData.time || !formData.phone_number) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate paid ride fields
      if (formData.is_paid && (!formData.fee_per_seat || !formData.payment_method)) {
        setError('Please specify fee per seat and payment method for paid rides');
        return;
      }

      setLoading(true);
      
      // Prepare data for API - remove custom fields that shouldn't be sent to the backend
      const rideData = {
        ...formData,
        from_location_custom: undefined,
        to_location_custom: undefined,
        seats_available: parseInt(formData.seats_available),
        fee_per_seat: formData.is_paid ? parseInt(formData.fee_per_seat) : 0
      };
      
      // Remove undefined fields
      Object.keys(rideData).forEach(key => {
        if (rideData[key] === undefined) {
          delete rideData[key];
        }
      });
      
      // Determine if this is an edit or a new post
      const isEditing = !!rideData._id;
      console.log('Operation:', isEditing ? 'Editing ride' : 'Creating new ride', rideData);
      
      // Make the API call
      const response = await axios.post('/api/ride/share', rideData);
      
      // Fetch updated rides to refresh the list
      const updatedRidesResponse = await axios.get('/api/ride/share');
      setAvailableRides(updatedRidesResponse.data);
      
      // Reset the form
      setOpenPostDialog(false);
      setRideToEdit(null);
      setNewRide({
        from_location: '',
        from_location_custom: '',
        to_location: '',
        to_location_custom: '',
        date: '',
        time: '',
        vehicle_type: 'car',
        phone_number: '',
        seats_available: 1,
        is_paid: false,
        fee_per_seat: 0,
        payment_method: 'in_person',
        description: ''
      });
      
      // Show appropriate success message
      setSuccessMessage(isEditing ? 'Ride updated successfully!' : 'Ride posted successfully!');
    } catch (error) {
      console.error('Error posting ride:', error);
      setError(error.response?.data?.error || 'Failed to post ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open book dialog
  const handleBookClick = (ride) => {
    setSelectedRide(ride);
    setBookingSeats(1);
    setOpenBookDialog(true);
  };

  // Book a ride
  const handleBookRide = async () => {
    try {
      if (!selectedRide) {
        setError('No ride selected');
        return;
      }
      
      if (bookingSeats < 1 || bookingSeats > selectedRide.seats_available) {
        setError(`Please select between 1 and ${selectedRide.seats_available} seats`);
        return;
      }
      
      setLoading(true);
      
      // Prepare booking data
      const bookingData = {
        ride_id: selectedRide._id,
        seats: bookingSeats,
        pickup_location: selectedRide.from_location,
        dropoff_location: selectedRide.to_location
      };
      
      await axios.post('/api/ride/bookings', bookingData);
      
      // Update available rides
      setAvailableRides(prev => 
        prev.map(ride => 
          ride._id === selectedRide._id 
            ? { ...ride, seats_available: ride.seats_available - bookingSeats } 
            : ride
        )
      );
      
      setOpenBookDialog(false);
      setSuccessMessage('Ride booked successfully!');
      
      // Refresh the bookings tab
      if (tabValue === 1) {
        const response = await axios.get('/api/ride/bookings');
        setMyBookings(response.data);
      }
    } catch (error) {
      console.error('Error booking ride:', error);
      setError(error.response?.data?.error || 'Failed to book ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open cancel dialog
  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setOpenCancelDialog(true);
  };

  // Cancel a booking
  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      await axios.post(`/api/ride/bookings/${selectedBooking._id}/cancel`, {
        reason: cancelReason
      });
      
      // Remove from bookings list
      setMyBookings(prev => prev.filter(booking => booking._id !== selectedBooking._id));
      
      // Refresh available rides since the seats might be available again
      const updatedRidesResponse = await axios.get('/api/ride/share');
      setAvailableRides(updatedRidesResponse.data);
      
      setOpenCancelDialog(false);
      setSuccessMessage('Booking cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      
      // Show specific error message if provided by the server
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to cancel booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Open delete dialog
  const handleDeleteClick = (ride) => {
    setRideToDelete(ride);
    setOpenDeleteDialog(true);
  };
  
  // Open edit dialog
  const handleEditClick = (ride) => {
    setRideToEdit(ride);
    setOpenPostDialog(true);
    // Populate the form with the ride data, including the _id for updates
    setNewRide({
      _id: ride._id, // Include the ID for editing
      from_location: ride.from_location,
      to_location: ride.to_location,
      date: ride.date,
      time: ride.time,
      vehicle_type: ride.vehicle_type || 'car',
      phone_number: ride.phone_number || '',
      seats_available: ride.seats_available,
      is_paid: ride.is_paid || false,
      fee_per_seat: ride.fee_per_seat || 0,
      payment_method: ride.payment_method || 'in_person',
      description: ride.description || ''
    });
  };

  // Delete a ride
  const handleDeleteRide = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/ride/share/${rideToDelete._id}`);
      
      // Remove from rides list
      setAvailableRides(prev => prev.filter(ride => ride._id !== rideToDelete._id));
      
      setOpenDeleteDialog(false);
      setSuccessMessage('Ride deleted successfully!');
    } catch (error) {
      console.error('Error deleting ride:', error);
      setError('Failed to delete ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle contact click
  const handleContactClick = (ride) => {
    // Set the selected ride for the contact dialog
    setSelectedContactRide(ride);
    // Open the contact dialog which will use the ContactDialog component
    setContactDialogOpen(true);
  };

  // Render post ride dialog
  const renderPostRideDialog = () => (
    <Dialog open={openPostDialog} onClose={() => setOpenPostDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        Post a Ride
        <IconButton
          aria-label="close"
          onClick={() => setOpenPostDialog(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="from-location-label">From</InputLabel>
                <Select
                  labelId="from-location-label"
                  name="from_location"
                  value={newRide.from_location}
                  onChange={handleInputChange}
                  input={<OutlinedInput label="From" />}
                  displayEmpty
                  required
                  renderValue={(selected) => {
                    if (!selected) {
                      return <em>Select pickup location</em>;
                    }
                    return selected;
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select pickup location</em>
                  </MenuItem>
                  {majorLocations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                  <MenuItem value="other">
                    <em>Other (Type your own)</em>
                  </MenuItem>
                </Select>
              </FormControl>
              {newRide.from_location === 'other' && (
                <TextField
                  sx={{ mt: 1 }}
                  name="from_location_custom"
                  label="Custom Pickup Location"
                  fullWidth
                  required
                  value={newRide.from_location_custom || ''}
                  onChange={(e) => setNewRide({...newRide, from_location_custom: e.target.value})}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setNewRide({...newRide, from_location: e.target.value, from_location_custom: ''});
                    }
                  }}
                  placeholder="Enter your custom pickup location"
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="to-location-label">To</InputLabel>
                <Select
                  labelId="to-location-label"
                  name="to_location"
                  value={newRide.to_location}
                  onChange={handleInputChange}
                  input={<OutlinedInput label="To" />}
                  displayEmpty
                  required
                  renderValue={(selected) => {
                    if (!selected) {
                      return <em>Select destination location</em>;
                    }
                    return selected;
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select destination location</em>
                  </MenuItem>
                  {majorLocations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                  <MenuItem value="other">
                    <em>Other (Type your own)</em>
                  </MenuItem>
                </Select>
              </FormControl>
              {newRide.to_location === 'other' && (
                <TextField
                  sx={{ mt: 1 }}
                  name="to_location_custom"
                  label="Custom Destination Location"
                  fullWidth
                  required
                  value={newRide.to_location_custom || ''}
                  onChange={(e) => setNewRide({...newRide, to_location_custom: e.target.value})}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setNewRide({...newRide, to_location: e.target.value, to_location_custom: ''});
                    }
                  }}
                  placeholder="Enter your custom destination location"
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="date"
                label="Date"
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={newRide.date}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="time"
                label="Time"
                type="time"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={newRide.time}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                <Select
                  labelId="vehicle-type-label"
                  name="vehicle_type"
                  value={newRide.vehicle_type}
                  onChange={handleInputChange}
                  label="Vehicle Type"
                >
                  <MenuItem value="car">Car</MenuItem>
                  <MenuItem value="bike">Bike</MenuItem>
                  <MenuItem value="auto">Auto-rickshaw</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="phone_number"
                label="Phone Number"
                fullWidth
                required
                value={newRide.phone_number}
                onChange={handleInputChange}
                placeholder="e.g., 01XXXXXXXXX"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="seats_available"
                label="Available Seats"
                type="number"
                fullWidth
                required
                inputProps={{ min: 1 }}
                value={newRide.seats_available}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newRide.is_paid}
                    onChange={handleInputChange}
                    name="is_paid"
                    color="primary"
                  />
                }
                label="Paid Ride"
              />
            </Grid>
            {newRide.is_paid && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="fee_per_seat"
                    label="Fee per Seat (BDT)"
                    type="number"
                    fullWidth
                    required
                    inputProps={{ min: 0 }}
                    value={newRide.fee_per_seat}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="payment-method-label">Payment Method</InputLabel>
                    <Select
                      labelId="payment-method-label"
                      name="payment_method"
                      value={newRide.payment_method}
                      onChange={handleInputChange}
                      label="Payment Method"
                    >
                      <MenuItem value="in_person">In Person</MenuItem>
                      <MenuItem value="bkash">bKash</MenuItem>
                      <MenuItem value="nagad">Nagad</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                multiline
                rows={4}
                fullWidth
                value={newRide.description}
                onChange={handleInputChange}
                placeholder="Add any additional details about your ride here..."
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenPostDialog(false)}>Cancel</Button>
        <Button 
          onClick={handlePostRide} 
          variant="contained" 
          disabled={!newRide.from_location || !newRide.to_location || !newRide.date || !newRide.time}
        >
          Post
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render book dialog
  const renderBookDialog = () => (
    <Dialog open={openBookDialog} onClose={() => setOpenBookDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Book a Ride
        <IconButton
          aria-label="close"
          onClick={() => setOpenBookDialog(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {selectedRide && (
          <>
            {/* Ride summary card */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, mt: 1, borderRadius: 2 }}>
              {/* Header with route */}
              <Box sx={{ 
                p: 2, 
                mb: 2, 
                background: 'linear-gradient(120deg, #2196f3 0%, #1976d2 100%)',
                color: 'white',
                borderRadius: 1
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {selectedRide.from_location} → {selectedRide.to_location}
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedRide.date)} at {formatTime(selectedRide.time)}
                </Typography>
              </Box>
              
              {/* Ride details */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: '#1976d2', mr: 1, width: 32, height: 32 }}>
                      {selectedRide.user_name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {selectedRide.user_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedRide.user_email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Chip 
                      label={selectedRide.vehicle_type || 'Car'} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      icon={selectedRide.vehicle_type === 'bike' ? <TwoWheelerIcon /> : <CarIcon />}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Available:</strong> {selectedRide.seats_available} seats
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Payment details if paid ride */}
              {selectedRide.is_paid && (
                <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    Payment Details
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2">
                      Fee per seat:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {selectedRide.fee_per_seat} BDT
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      Payment method:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {selectedRide.payment_method === 'in_person' ? 'In Person' : selectedRide.payment_method}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
            
            {/* Booking form */}
            <Typography variant="h6" gutterBottom>
              Booking Details
            </Typography>
            <TextField
              label="Number of Seats"
              type="number"
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: selectedRide.seats_available }}
              value={bookingSeats}
              onChange={(e) => setBookingSeats(parseInt(e.target.value) || 1)}
              helperText={`You can book up to ${selectedRide.seats_available} seats`}
            />
            
            {/* Total cost calculation */}
            {selectedRide.is_paid && (
              <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">
                    Total Cost:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {(bookingSeats * selectedRide.fee_per_seat).toFixed(0)} BDT
                  </Typography>
                </Box>
              </Paper>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={() => setOpenBookDialog(false)} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleBookRide} 
          variant="contained"
          disabled={!selectedRide || bookingSeats < 1 || bookingSeats > selectedRide.seats_available}
          startIcon={<CheckCircleIcon />}
        >
          Confirm Booking
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render cancel dialog
  const renderCancelDialog = () => (
    <Dialog open={openCancelDialog} onClose={() => setOpenCancelDialog(false)} maxWidth="xs" fullWidth>
      <DialogTitle>
        Cancel Booking
        <IconButton
          aria-label="close"
          onClick={() => setOpenCancelDialog(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {selectedBooking && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="h6" gutterBottom>
              {selectedBooking.ride.from_location} → {selectedBooking.ride.to_location}
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              {formatDate(selectedBooking.ride.date)} at {selectedBooking.ride.time}
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Reason for Cancellation</InputLabel>
              <Select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                label="Reason for Cancellation"
                required
              >
                <MenuItem value="change_of_plans">Change of Plans</MenuItem>
                <MenuItem value="found_alternative">Found Alternative Transport</MenuItem>
                <MenuItem value="schedule_conflict">Schedule Conflict</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenCancelDialog(false)}>Back</Button>
        <Button 
          onClick={handleCancelBooking} 
          color="error"
          disabled={!cancelReason}
        >
          Cancel Booking
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render delete dialog
  const renderDeleteDialog = () => (
    <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs">
      <DialogTitle>Delete Ride</DialogTitle>
      <DialogContent>
        <Typography>Are you sure you want to delete this ride? This action cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
        <Button onClick={handleDeleteRide} color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header with gradient background */}
      <Box
        sx={{
          background: 'linear-gradient(120deg, #2196f3 0%, #1976d2 100%)',
          color: 'white',
          py: 4,
          mb: 4,
          borderRadius: 2,
          boxShadow: 3
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, textAlign: 'center' }}>
          Ride Sharing
        </Typography>
        <Typography variant="subtitle1" sx={{ textAlign: 'center', opacity: 0.9 }}>
          Find and share rides with your community
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#1976d2'
            },
            '& .MuiTab-root': {
              color: '#666',
              '&.Mui-selected': {
                color: '#1976d2'
              }
            }
          }}
        >
          <Tab label="Available Rides" icon={<CarIcon />} iconPosition="start" />
          <Tab label="My Bookings" icon={<CheckCircleIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Main content area */}
      <Box sx={{ width: '100%' }}>
        {/* Available Rides Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Action buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => setOpenPostDialog(true)}
                startIcon={<AddIcon />}
                sx={{
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#1565c0'
                  }
                }}
              >
                Post a Ride
              </Button>
            </Box>
            
            {/* Rides grid */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : availableRides.length === 0 ? (
              <Alert severity="info">No rides available</Alert>
            ) : (
              <Grid container spacing={3}>
                {availableRides.map(ride => (
                  <Grid item xs={12} sm={6} md={4} key={ride._id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s',
                        overflow: 'visible',
                        position: 'relative',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: 4
                        }
                      }}
                    >
                      {/* Vehicle type badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -15,
                          right: 20,
                          backgroundColor: '#1976d2',
                          color: 'white',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 2,
                          zIndex: 1
                        }}
                      >
                        {ride.vehicle_type === 'car' ? (
                          <CarIcon />
                        ) : ride.vehicle_type === 'bike' ? (
                          <TwoWheelerIcon />
                        ) : (
                          <CarIcon />
                        )}
                      </Box>
                      
                      {/* Card header with route */}
                      <Box
                        sx={{
                          p: 2,
                          background: 'linear-gradient(120deg, #2196f3 0%, #1976d2 100%)',
                          color: 'white',
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4
                        }}
                      >
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {ride.from_location} → {ride.to_location}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {formatDate(ride.date)} at {formatTime(ride.time)}
                          </Typography>
                          <Chip 
                            label={ride.seats_available > 0 ? `${ride.seats_available} seats` : 'Full'} 
                            color={ride.seats_available > 0 ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                            sx={{ color: 'white', borderColor: 'white' }}
                          />
                        </Box>
                      </Box>
                      
                      <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                        {/* User info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ bgcolor: '#1976d2', mr: 1, width: 32, height: 32 }}>
                            {ride.user_name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {ride.user_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ride.user_email}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Ride details */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {ride.is_paid && (
                            <Chip 
                              icon={<AttachMoneyIcon />} 
                              label={`${ride.fee_per_seat} BDT/seat`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                          {!ride.is_paid ? (
                            <Chip 
                              label="Free" 
                              size="small" 
                              color="success" 
                              variant="outlined"
                            />
                          ) : ride.payment_method && (
                            <Chip 
                              label={ride.payment_method === 'in_person' ? 'Pay in person' : ride.payment_method} 
                              size="small" 
                              color="default" 
                              variant="outlined"
                            />
                          )}
                          {/* Phone number is hidden until booking is confirmed */}
                        </Box>
                        
                        {/* Description */}
                        {ride.description && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ 
                              mt: 1, 
                              p: 1, 
                              backgroundColor: '#f5f5f5', 
                              borderRadius: 1,
                              fontSize: '0.875rem'
                            }}
                          >
                            {ride.description}
                          </Typography>
                        )}
                      </CardContent>
                      
                      {/* Action buttons */}
                      <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                        {/* Compare user IDs safely */}
                        {(ride.user_id && currentUserId) ? 
                          (String(ride.user_id) !== String(currentUserId) ? (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleBookClick(ride)}
                              disabled={ride.seats_available < 1}
                              startIcon={<CheckCircleIcon />}
                              sx={{ flex: 1, mr: 1 }}
                            >
                              Book Now
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleContactClick(ride)}
                              startIcon={<PhoneIcon />}
                              sx={{ flex: 1 }}
                            >
                              Contact
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="small"
                              color="primary"
                              variant="outlined"
                              onClick={() => handleEditClick(ride)}
                              startIcon={<EditIcon />}
                              sx={{ flex: 1, mr: 1 }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => handleDeleteClick(ride)}
                              startIcon={<DeleteIcon />}
                              sx={{ flex: 1 }}
                            >
                              Delete
                            </Button>
                          </>
                        )) : (
                          // Fallback when user IDs are not available
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleBookClick(ride)}
                            disabled={ride.seats_available < 1}
                            startIcon={<CheckCircleIcon />}
                            sx={{ flex: 1 }}
                          >
                            Book Now
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* My Bookings Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : myBookings.length === 0 ? (
              <Alert severity="info">You have no active bookings</Alert>
            ) : (
              <Grid container spacing={3}>
                {myBookings.map(booking => (
                  <Grid item xs={12} sm={6} md={4} key={booking._id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {booking.ride.from_location} → {booking.ride.to_location}
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                          {formatDate(booking.ride.date)} at {booking.ride.time}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ bgcolor: '#1976d2', mr: 1, width: 32, height: 32 }}>
                            {booking.ride.user_name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {booking.ride.user_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.ride.user_email}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Chip 
                            icon={<EventSeatIcon fontSize="small" />}
                            label={`${booking.seats} seats booked`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                          {booking.ride.vehicle_type && (
                            <Chip 
                              icon={booking.ride.vehicle_type === 'bike' ? <TwoWheelerIcon /> : <CarIcon />}
                              label={booking.ride.vehicle_type} 
                              size="small" 
                              color="default" 
                              variant="outlined"
                            />
                          )}
                          {booking.ride.is_paid && (
                            <Chip 
                              icon={<AttachMoneyIcon />} 
                              label={`${(booking.seats * booking.ride.fee_per_seat).toFixed(0)} BDT total`} 
                              size="small" 
                              color="success" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        {/* Show phone number for booked rides */}
                        {booking.ride.phone_number && (
                          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, mb: 1 }}>
                            <PhoneIcon fontSize="small" sx={{ mr: 1, color: '#1976d2' }} />
                            <Typography variant="body2">
                              <strong>Contact:</strong> {booking.ride.phone_number}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                      <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleCancelClick(booking)}
                          startIcon={<CancelIcon />}
                          sx={{ flex: 1, mr: 1 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleContactClick(booking.ride)}
                          startIcon={<ChatIcon />}
                          sx={{ flex: 1 }}
                        >
                          Chat
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>
      </Box>

      {/* Dialogs */}
      {renderPostRideDialog()}
      {renderBookDialog()}
      {renderCancelDialog()}
      {renderDeleteDialog()}
      
      {/* Simple Message Dialog for one-time messaging */}
      <SimpleMessageDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        item={selectedContactRide}
        itemType="ride"
      />
    </Container>
  );
};

export default withNotificationBanner(RideShare, 'ride_share');
