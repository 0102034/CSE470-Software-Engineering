import React, { useState, useEffect } from 'react';
import withNotificationBanner from '../components/withNotificationBanner';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import '../AppBackgrounds.css';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const RideBooking = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharedRides, setSharedRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [openBookingDialog, setOpenBookingDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openChatDialog, setOpenChatDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedRideCreator, setSelectedRideCreator] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); // 'success', 'error', 'warning', 'info'
  const [selectedRide, setSelectedRide] = useState(null);
  
  // Search and filter state
  const [searchFilters, setSearchFilters] = useState({
    fromLocation: '',
    toLocation: '',
    date: ''
  });

  // Get current user information
  const isLoggedIn = localStorage.getItem('token') !== null;
  const currentUserEmail = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : null;
  const currentUserId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user'))._id || JSON.parse(localStorage.getItem('user')).id : null;
  const vehicleTypes = ['Car', 'Bike', 'Auto'];
  
  const [newBooking, setNewBooking] = useState({
    ride_id: '',
    date: '',
    time: '',
    pickup_location: '',
    dropoff_location: '',
    seats: 1,
    payment_method: ''
  });
  
  const [newShareRide, setNewShareRide] = useState({
    from_location: '',
    to_location: '',
    date: '',
    time: '',
    vehicle_type: '',
    seats_available: 1,
    price_per_seat: '',
    description: '',
    is_free: false,
    fee_amount: '',
    payment_method: '',
    payment_number: ''
  });

  // Chat dialog state is already declared above
  
  // Payment and cancellation related states
  // openPaymentDialog and openCancelDialog are already declared above
  const [paymentDetails, setPaymentDetails] = useState({
    method: '',
    amount: 0,
    paymentNumber: ''
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  
  // Delete post related states
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [otherDeleteReason, setOtherDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletedPostIds, setDeletedPostIds] = useState([]);
  
  // Snackbar state is already declared above

  useEffect(() => {
    document.body.classList.add('ride-booking-page');
    return () => {
      document.body.classList.remove('ride-booking-page');
    };
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      fetchSharedRides();
    } else if (tabValue === 1 && isLoggedIn) {
      fetchBookings();
    }
  }, [tabValue, isLoggedIn]);
  
  // Listen for ride share deletion events from the admin dashboard
  useEffect(() => {
    // Function to handle storage events (for cross-tab communication)
    const handleStorageChange = () => {
      try {
        const deleteEventJson = localStorage.getItem('rideShareDeleteEvent');
        if (deleteEventJson) {
          const deleteEvent = JSON.parse(deleteEventJson);
          
          // Check if this is a new event (within the last 5 seconds)
          const now = new Date().getTime();
          if (deleteEvent && deleteEvent.type === 'RIDE_SHARE_DELETED' && 
              (now - deleteEvent.timestamp < 5000)) {
            
            console.log('Detected ride share deletion from admin dashboard:', deleteEvent.rideId);
            
            // Add the deleted ride ID to our tracking array
            if (!deletedPostIds.includes(deleteEvent.rideId)) {
              setDeletedPostIds(prev => [...prev, deleteEvent.rideId]);
              
              // Also update the shared rides list immediately
              setSharedRides(prev => prev.filter(ride => ride._id !== deleteEvent.rideId));
              
              // Show notification to user
              setSnackbarMessage('A ride share post was removed by an administrator');
              setSnackbarSeverity('info');
              setOpenSnackbar(true);
              
              // Refresh the data
              fetchSharedRides();
            }
          }
        }
      } catch (err) {
        console.error('Error handling ride share deletion event:', err);
      }
    };
    
    // Add event listener for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Also check for deletion events when component mounts
    handleStorageChange();
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [deletedPostIds]);

  const fetchSharedRides = async () => {
    setLoading(true);
    try {
      // Check for any deleted ride shares from localStorage
      const deletedRideSharesFromStorage = JSON.parse(localStorage.getItem('deletedRideShares') || '[]');
      
      // Merge with our state tracking of deleted posts
      const allDeletedRideIds = [...new Set([...deletedPostIds, ...deletedRideSharesFromStorage])];
      
      // If our state doesn't match localStorage, update it
      if (allDeletedRideIds.length !== deletedPostIds.length) {
        setDeletedPostIds(allDeletedRideIds);
      }
      
      const response = await axios.get('http://localhost:5000/api/ride/share');
      
      // Log the response to understand the data structure
      console.log('Ride share API response:', response.data);
      
      // Filter out expired rides based on date and time
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTimeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      
      const validRides = response.data.filter(ride => {
        // Filter out deleted posts - check both our state and localStorage
        if (allDeletedRideIds.includes(ride._id)) {
          console.log(`Filtering out deleted ride: ${ride._id}`);
          return false;
        }
        
        // Skip rides that are already fully booked
        if (ride.seats_available <= 0 || ride.status === 'booked') {
          return false; // Ride is fully booked
        }
        
        // Parse ride date (could be in multiple formats)
        const rideDate = ride.date || ride.departure_date;
        const rideTime = ride.time || ride.departure_time;
        
        if (!rideDate) return true; // If no date, don't filter out
        
        // Check if ride date is in the future or today
        if (rideDate < currentDateStr) {
          return false; // Ride date is in the past
        } else if (rideDate === currentDateStr) {
          // If it's today, check the time
          if (rideTime && rideTime < currentTimeStr) {
            return false; // Ride time has passed
          }
        }
        
        return true; // Ride is valid (not expired)
      });
      
      console.log(`Filtered ${response.data.length - validRides.length} rides (deleted or expired)`);
      
      // Process rides to ensure each has proper user information
      const processedRides = [];
      
      for (const ride of validRides) {
        // Create a proper user object if it doesn't exist
        if (!ride.user) {
          ride.user = {};
        }
        
        // Check if we have user_name and user_email directly in the ride object
        if (ride.user_name) {
          ride.user.name = ride.user_name;
        }
        
        if (ride.user_email) {
          ride.user.email = ride.user_email;
        }
        
        // Always fetch complete user info to ensure all users can see it
        if ((ride.user_id || ride.created_by)) {
          try {
            const userId = ride.user_id || ride.created_by;
            const token = localStorage.getItem('token');
            const userResponse = await axios.get(
              `http://localhost:5000/api/users/${userId}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            console.log('User API response for ride:', ride._id, userResponse.data);
            
            // Extract user data from response
            const userData = userResponse.data.user || userResponse.data;
            
            // Update the user object with fetched data
            ride.user = {
              ...ride.user,
              _id: userId,
              id: userId,
              name: userData.name || 
                   userData.username || 
                   `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
                   'Unknown User',
              email: userData.email || ride.user.email || 'No Email'
            };
            
            console.log('Updated user info:', ride.user);
          } catch (userErr) {
            console.error('Error fetching user info:', userErr, 'for user ID:', ride.user_id || ride.created_by);
          }
        }
        
        console.log('Processed ride with user info:', ride);
        processedRides.push(ride);
      }
      
      setSharedRides(processedRides);
    } catch (err) {
      setError('Failed to load shared rides. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Get the current user's ID
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user?._id || user?.id;
      
      if (!userId) {
        setError('User information not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(
        'http://localhost:5000/api/ride/bookings',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Filter bookings to show only those belonging to the logged-in user
      const userBookings = response.data.filter(booking => {
        return booking.user_id === userId || booking.booker_id === userId;
      });
      
      console.log('Filtered user bookings:', userBookings);
      
      // Filter out expired bookings based on date and time
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTimeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      
      const validBookings = userBookings.filter(booking => {
        // Get the ride date and time (could be in the booking or in the associated ride)
        const bookingDate = booking.date || (booking.ride && booking.ride.date) || (booking.ride && booking.ride.departure_date);
        const bookingTime = booking.time || (booking.ride && booking.ride.time) || (booking.ride && booking.ride.departure_time);
        
        if (!bookingDate) return true; // If no date, don't filter out
        
        // For completed or cancelled bookings, keep them for a day for reference
        if (booking.status === 'completed' || booking.status === 'cancelled') {
          // Calculate the booking completion date (might be booking.updated_at)
          const completionDate = booking.updated_at ? new Date(booking.updated_at) : null;
          if (completionDate) {
            // Keep completed/cancelled bookings for 24 hours
            const oneDayAgo = new Date(currentDate);
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            if (completionDate < oneDayAgo) {
              return false; // Older than 24 hours, filter out
            }
            return true; // Within 24 hours, keep it
          }
        }
        
        // For active bookings, check if the ride date is in the past
        if (bookingDate < currentDateStr) {
          // If ride date has passed, mark as expired but keep it visible for a day
          const yesterday = new Date(currentDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const bookingDateObj = new Date(bookingDate);
          
          if (bookingDateObj < yesterday) {
            return false; // More than a day old, filter out
          }
          return true; // Less than a day old, keep it
        } else if (bookingDate === currentDateStr && bookingTime) {
          // If it's today, check if the time has passed by more than 2 hours
          const [bookingHour, bookingMinute] = bookingTime.split(':').map(Number);
          const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
          
          const bookingMinutes = bookingHour * 60 + bookingMinute;
          const currentMinutes = currentHour * 60 + currentMinute;
          
          if (currentMinutes - bookingMinutes > 120) { // 2 hours = 120 minutes
            return false; // More than 2 hours old, filter out
          }
        }
        
        return true; // Booking is valid (not expired)
      });
      
      setBookings(validBookings);
    } catch (err) {
      setError('Failed to load bookings. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Refresh data when switching tabs to ensure UI is up-to-date
    if (newValue === 0) { // Available Rides tab
      fetchSharedRides();
    } else if (newValue === 1) { // My Bookings tab
      fetchBookings();
    }
  };

  const handleSearchFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchFilters({
      ...searchFilters,
      [name]: value
    });
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setNewBooking({
      ...newBooking,
      [name]: value
    });
  };

  const handleShareRideChange = (e) => {
    const { name, value } = e.target;
    setNewShareRide({
      ...newShareRide,
      [name]: value
    });
  };

  const handleCreateBooking = async () => {
    try {
      // Validate required fields
      if (!selectedRide || !selectedRide._id) {
        setSnackbarMessage('Please select a ride to book');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        return;
      }
      
      // Calculate total amount based on selected seats
      const perSeatAmount = selectedRide.fee_amount || selectedRide.price || selectedRide.price_per_seat || 0;
      const totalAmount = perSeatAmount * newBooking.seats;
      
      // Check if the ride is free or requires payment
      if (selectedRide.is_free) {
        // For free rides, create booking directly
        await processBooking();
      } else {
        // For paid rides, show payment dialog
        setPaymentDetails({
          method: selectedRide.payment_method || '',
          amount: totalAmount,
          perSeatAmount: perSeatAmount,
          seats: newBooking.seats,
          paymentNumber: selectedRide.payment_number || ''
        });
        setOpenPaymentDialog(true);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setSnackbarMessage('Failed to create booking. ' + (error.response?.data?.error || error.message));
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };
  
  // Process the booking and update UI immediately
  const processBooking = async (paymentMethod = null, transactionId = null) => {
    try {
      const token = localStorage.getItem('token');
      // Create booking data with seats, payment method, and transaction ID
      const bookingData = {
        seats: newBooking.seats,
        payment_method: paymentMethod || newBooking.payment_method,
        transaction_id: transactionId,
        pickup_location: newBooking.pickup_location,
        dropoff_location: newBooking.dropoff_location
      };
      
      // First, immediately update the UI to provide instant feedback
      // Store the ride that's being booked to add to bookings
      const bookedRide = {...selectedRide};
      
      // Remove the ride from available rides if all seats are booked
      if (selectedRide && selectedRide.seats_available <= newBooking.seats) {
        // Remove the ride from the displayed list
        setSharedRides(prevRides => prevRides.filter(ride => ride._id !== selectedRide._id));
      } else if (selectedRide) {
        // Update the available seats count
        setSharedRides(prevRides => prevRides.map(ride => {
          if (ride._id === selectedRide._id) {
            return {
              ...ride,
              seats_available: ride.seats_available - newBooking.seats
            };
          }
          return ride;
        }));
      }
      
      // Close dialogs
      setOpenBookingDialog(false);
      setOpenPaymentDialog(false);
      
      // Reset form
      setNewBooking({
        ride_id: '',
        date: '',
        time: '',
        pickup_location: '',
        dropoff_location: '',
        seats: 1,
        payment_method: ''
      });
      
      // Send API request
      const response = await axios.post(
        `http://localhost:5000/api/ride/book/${selectedRide._id}`, 
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Add the booking to the bookings list immediately
      const newBookingData = response.data.booking || {
        _id: Date.now().toString(), // Temporary ID until refresh
        ride: bookedRide,
        seats_booked: newBooking.seats,
        seats: newBooking.seats,
        date: bookedRide.date,
        time: bookedRide.time,
        from_location: bookedRide.from_location,
        to_location: bookedRide.to_location,
        pickup_location: newBooking.pickup_location,
        dropoff_location: newBooking.dropoff_location,
        status: 'confirmed',
        payment_method: paymentMethod || newBooking.payment_method,
        per_seat_amount: bookedRide.fee_amount || bookedRide.price_per_seat || 0,
        total_fare: (bookedRide.fee_amount || bookedRide.price_per_seat || 0) * newBooking.seats
      };
      
      // Add to bookings list
      setBookings(prev => [newBookingData, ...prev]);
      
      // Switch to My Bookings tab to show the new booking
      setTabValue(1);
      
      // Show modern success message with Snackbar
      setSnackbarMessage('Ride booked successfully!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Refresh bookings list in the background to ensure data consistency
      fetchBookings();
    } catch (error) {
      console.error('Error booking ride:', error);
      setSnackbarMessage('Failed to book ride. ' + (error.response?.data?.error || error.message));
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleCreateShareRide = async () => {
    try {
      // Determine required fields based on whether it's a free or paid ride
      let requiredFields = ['from_location', 'to_location', 'date', 'time', 'vehicle_type', 'seats_available'];
      
      // Add payment-related required fields for paid rides
      if (!newShareRide.is_free) {
        requiredFields.push('fee_amount', 'payment_method');
        
        // If payment method is Bkash or Nagad, payment number is required
        if (['Bkash', 'Nagad'].includes(newShareRide.payment_method)) {
          requiredFields.push('payment_number');
        }
      }
      
      const missingFields = requiredFields.filter(field => !newShareRide[field]);
      
      if (missingFields.length > 0) {
        setSnackbarMessage(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setSnackbarSeverity('warning');
        setOpenSnackbar(true);
        return;
      }
      
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Prepare data for API request
      const rideData = {
        ...newShareRide,
        price: newShareRide.is_free ? 0 : newShareRide.fee_amount, // For backward compatibility
        user_id: user._id || user.id,
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        user_email: user.email
      };
      
      const isEditing = !!newShareRide._id;
      
      // Make a copy of the current form data for potential rollback
      const formCopy = {...newShareRide};
      
      // Close dialog and reset form IMMEDIATELY for instant feedback
      setOpenShareDialog(false);
      
      if (isEditing) {
        // Update the UI IMMEDIATELY before API call
        setSharedRides(prevRides => prevRides.map(ride => {
          if (ride._id === newShareRide._id) {
            return { 
              ...ride, 
              ...rideData,
              user: {
                ...ride.user
              }
            };
          }
          return ride;
        }));
        
        // Show success message IMMEDIATELY
        setSnackbarMessage('Ride share post updated successfully!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        
        // Now start the actual update process in the background
        try {
          await axios.put(
            `http://localhost:5000/api/ride/share/${formCopy._id}`,
            rideData,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
        } catch (error) {
          console.error('Error updating ride share post:', error);
          
          // Revert the UI change if the API call fails
          setSnackbarMessage('Failed to update post: ' + (error.response?.data?.error || error.message));
          setSnackbarSeverity('error');
          setOpenSnackbar(true);
          
          // No need to revert UI as we'll refresh the data
          fetchSharedRides();
        }
      } else {
        // For new posts, we need to generate a temporary ID
        const tempId = 'temp_' + Date.now();
        
        // Create a temporary ride object with the temp ID
        const tempRide = {
          _id: tempId,
          ...rideData,
          user: {
            _id: user._id || user.id,
            name: rideData.user_name,
            email: user.email
          }
        };
        
        // Add the new ride to the UI IMMEDIATELY
        setSharedRides(prevRides => [tempRide, ...prevRides]);
        
        // Show success message IMMEDIATELY
        setSnackbarMessage('Ride share post created successfully!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        
        // Now start the actual creation process in the background
        try {
          const response = await axios.post(
            'http://localhost:5000/api/ride/share',
            rideData,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          // If successful, replace the temp ID with the real one
          if (response.data && response.data.post_id) {
            setSharedRides(prevRides => prevRides.map(ride => {
              if (ride._id === tempId) {
                return { ...ride, _id: response.data.post_id };
              }
              return ride;
            }));
          }
        } catch (error) {
          console.error('Error creating ride share post:', error);
          
          // Remove the temporary ride if the API call fails
          setSharedRides(prevRides => prevRides.filter(ride => ride._id !== tempId));
          
          setSnackbarMessage('Failed to create post: ' + (error.response?.data?.error || error.message));
          setSnackbarSeverity('error');
          setOpenSnackbar(true);
        }
      }
      
      // Reset form
      setNewShareRide({
        from_location: '',
        to_location: '',
        date: '',
        time: '',
        vehicle_type: '',
        seats_available: 1,
        price_per_seat: '',
        description: '',
        is_free: false,
        fee_amount: '',
        payment_method: '',
        payment_number: ''
      });
      
      // Show modern success message with Snackbar
      setSnackbarMessage('Ride share created successfully!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Refresh rides
      fetchSharedRides();
      
    } catch (error) {
      console.error('Error creating ride share:', error);
      setSnackbarMessage('Failed to create ride share. ' + (error.response?.data?.error || error.message));
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleCancelBooking = async (bookingId, reason) => {
    try {
      if (!reason) {
        alert('Please select a cancellation reason');
        return;
      }
      
      const token = localStorage.getItem('token');
      // First, immediately update the UI to provide instant feedback
      // Mark the booking as cancelled in the UI
      setBookings(prevBookings => prevBookings.map(booking => {
        if (booking._id === bookingId) {
          return {
            ...booking,
            status: 'cancelled'
          };
        }
        return booking;
      }));
      
      // Get the ride details from the canceled booking before sending the request
      const canceledRideId = selectedBooking.ride_id;
      const canceledSeats = selectedBooking.seats || selectedBooking.seats_booked || 1;
      
      // Close dialog and reset states immediately for better UX
      setOpenCancelDialog(false);
      setCancellationReason('');
      setOtherReason('');
      
      // Send cancellation request
      const response = await axios.post(
        `http://localhost:5000/api/ride/bookings/cancel/${bookingId}`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Show success message with Snackbar
      setSnackbarMessage('Booking cancelled successfully');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Update the UI to show the ride again in the Available Rides tab
      if (canceledRideId) {
        // Check if the ride exists in the current list
        const rideExists = sharedRides.some(ride => ride._id === canceledRideId);
        
        if (!rideExists) {
          // Fetch the specific ride to add it back to the list
          try {
            const rideResponse = await axios.get(
              `http://localhost:5000/api/ride/share/${canceledRideId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            
            if (rideResponse.data) {
              // Add the ride back to the list with updated seats available
              const updatedRide = {
                ...rideResponse.data,
                seats_available: (rideResponse.data.seats_available || 0) + canceledSeats
              };
              setSharedRides(prevRides => [updatedRide, ...prevRides]);
              
              // Switch to Available Rides tab to show the ride is available again
              setTabValue(0);
            }
          } catch (rideError) {
            console.error('Error fetching canceled ride:', rideError);
          }
        } else {
          // Update the available seats count for the existing ride
          setSharedRides(prevRides => prevRides.map(ride => {
            if (ride._id === canceledRideId) {
              return {
                ...ride,
                seats_available: ride.seats_available + canceledSeats
              };
            }
            return ride;
          }));
        }
      }
      
      // Refresh bookings list
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setSnackbarMessage('Failed to cancel booking. ' + (error.response?.data?.error || error.message));
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };
  
  // Handle opening the delete post dialog
  const handleDeletePost = (post) => {
    setPostToDelete(post);
    setDeleteReason('');
    setOtherDeleteReason('');
    setOpenDeleteDialog(true);
  };
  
  // Handle editing a ride share post
  const handleEditPost = (post) => {
    // Set the form data with the post details
    setNewShareRide({
      _id: post._id,
      from_location: post.from_location,
      to_location: post.to_location,
      date: post.date,
      time: post.time,
      vehicle_type: post.vehicle_type,
      seats_available: post.seats_available,
      description: post.description || '',
      is_free: post.is_free || !post.fee_amount,
      fee_amount: post.fee_amount || post.price_per_seat || '',
      payment_method: post.payment_method || '',
      payment_number: post.payment_number || ''
    });
    
    // Open the share dialog
    setOpenShareDialog(true);
  };
  
  // Handle confirming post deletion
  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    
    // Validate that a reason is provided
    const finalReason = deleteReason === 'Other' ? otherDeleteReason : deleteReason;
    if (!finalReason) {
      setSnackbarMessage('Please provide a reason for deleting this post');
      setSnackbarSeverity('warning');
      setOpenSnackbar(true);
      return;
    }
    
    // Store a copy of the post for potential rollback
    const deletedPost = {...postToDelete};
    
    // Close dialog and reset states IMMEDIATELY for instant feedback
    setOpenDeleteDialog(false);
    setDeleteReason('');
    setOtherDeleteReason('');
    
    // Update UI IMMEDIATELY before API call
    setSharedRides(prevRides => prevRides.filter(ride => ride._id !== postToDelete._id));
    
    // Add the post ID to the list of deleted post IDs
    setDeletedPostIds(prevIds => [...prevIds, postToDelete._id]);
    
    // Show success message IMMEDIATELY
    setSnackbarMessage('Your ride share post has been deleted successfully');
    setSnackbarSeverity('success');
    setOpenSnackbar(true);
    
    // Now start the actual deletion process in the background
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Send delete request to API
      const response = await axios.delete(
        `http://localhost:5000/api/ride/share/${deletedPost._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: { reason: finalReason } // Send reason in request body
        }
      );
      
      // Reset post to delete
      setPostToDelete(null);
      
      // No need to refresh the rides list since we already updated the UI
    } catch (error) {
      console.error('Error deleting ride share post:', error);
      
      // Revert the UI change if the API call fails
      setSharedRides(prevRides => [deletedPost, ...prevRides]);
      
      setSnackbarMessage('Failed to delete post: ' + (error.response?.data?.error || error.message));
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setDeleteLoading(false);
      setPostToDelete(null);
    }
  };
  
  const openCancelDialogForBooking = (booking) => {
    setSelectedBooking(booking);
    setCancellationReason('');
    setOtherReason('');
    setOpenCancelDialog(true);
  };

  const openBookingDialogForRide = (ride) => {
    setSelectedRide(ride);
    setNewBooking({
      ...newBooking,
      ride_id: ride._id,
      pickup_location: ride.from_location,
      dropoff_location: ride.to_location,
      date: ride.date || ride.departure_date,
      time: ride.time || ride.departure_time,
      payment_method: ride.payment_method || ''
    });
    setOpenBookingDialog(true);
  };
  


  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedRideCreator || !selectedRide) {
      setSnackbarMessage('Please enter a message');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }
    
    try {
      setMessageLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Get the user IDs properly
      const senderId = user._id || user.id;
      const receiverId = selectedRideCreator._id || selectedRideCreator.id;
      
      // Prepare message data in the format expected by the backend
      const messageData = {
        sender_id: senderId,
        receiver_id: receiverId,
        content: chatMessage,
        post_id: selectedRide._id,
        post_type: 'ride_share',
        subject: 'Ride Share Inquiry'
      };
      
      console.log('Sending message data:', messageData);
      
      // Send message using the standard messages API endpoint
      const response = await axios.post(
        `http://localhost:5000/api/ride/messages`,
        { 
          receiver_id: receiverId,
          content: chatMessage,
          post_id: selectedRide._id,
          post_type: 'ride_share',
          subject: 'Ride Share Inquiry'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Message sent successfully:', response.data);
      
      // Show success message with Snackbar instead of alert
      setSnackbarMessage(`Message sent to ${selectedRideCreator.name}`);
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Reset and close
      setChatMessage('');
      setOpenChatDialog(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setSnackbarMessage(`Failed to send message: ${err.response?.data?.error || err.message}`);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setMessageLoading(false);
    }
  };

  const openChatDialogForRide = (ride) => {
    // Create a user object from available information
    const creator = {
      _id: ride.user?._id || ride.user_id || ride.created_by,
      name: ride.user?.name || ride.user_name || 'Unknown User',
      email: ride.user?.email || ride.user_email || 'N/A'
    };
    
    if (creator._id) {
      // Set both the creator and the ride for proper message sending
      setSelectedRideCreator(creator);
      setSelectedRide(ride);
      setOpenChatDialog(true);
    } else {
      // Replace alert with Snackbar
      setSnackbarMessage('Cannot contact the ride creator. User information is missing.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  // Filter shared rides based on search criteria
  const filteredRides = sharedRides.filter(ride => {
    const matchesFrom = !searchFilters.fromLocation || 
                        ride.from_location.toLowerCase().includes(searchFilters.fromLocation.toLowerCase());
    const matchesTo = !searchFilters.toLocation || 
                      ride.to_location.toLowerCase().includes(searchFilters.toLocation.toLowerCase());
    const matchesDate = !searchFilters.date || 
                        (ride.date && new Date(ride.date).toISOString().split('T')[0] === searchFilters.date);
    
    return matchesFrom && matchesTo && matchesDate;
  });

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Ride Sharing
      </Typography>
      
      <Box sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="ride booking tabs"
            variant="fullWidth"
          >
            <Tab label="Available Rides" />
            <Tab label="My Bookings" disabled={!isLoggedIn} />
          </Tabs>
        </Box>
        
        {/* Available Rides Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Search and Filter Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Search Rides
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="From Location"
                  name="fromLocation"
                  value={searchFilters.fromLocation}
                  onChange={handleSearchFilterChange}
                  placeholder="e.g. Merul Badda"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="To Location"
                  name="toLocation"
                  value={searchFilters.toLocation}
                  onChange={handleSearchFilterChange}
                  placeholder="e.g. BRAC University"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  name="date"
                  value={searchFilters.date}
                  onChange={handleSearchFilterChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {isLoggedIn && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setOpenShareDialog(true)}
              >
                Offer Ride
              </Button>
            )}
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : filteredRides.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No rides available matching your criteria.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredRides.map((ride) => (
                <Grid item key={ride._id} xs={12} md={6}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {ride.status === 'booked' || ride.seats_available <= 0 ? (
                      <Chip 
                        label="Fully Booked" 
                        color="error" 
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10, 
                          zIndex: 1 
                        }}
                      />
                    ) : null}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {ride.from_location} to {ride.to_location}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      
                      {/* Creator Information */}
                      <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Posted by
                        </Typography>
                        {/* Show creator details to everyone, but mark as 'You' for the creator */}
                        <Typography variant="body2">
                          <strong>Name:</strong> {ride.user?.name || ride.user_name || 'Unknown'}
                          {(currentUserEmail === ride.user?.email || 
                           currentUserEmail === ride.user_email || 
                           currentUserId === ride.user_id || 
                           currentUserId === ride.user?._id) ? ' (You)' : ''}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong> {ride.user?.email || ride.user_email || 'N/A'}
                        </Typography>
                      </Box>
                      
                      {/* Ride Details */}
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Date:</strong> {formatDate(ride.date)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Time:</strong> {ride.time}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Vehicle:</strong> {ride.vehicle_type}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>No. of Seats:</strong> {ride.seats_available}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2">
                            <strong>Per Seat Amount:</strong> {ride.is_free ? 'Free' : `৳${ride.fee_amount || ride.price || ride.price_per_seat || 0}`}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {ride.description && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2">Description</Typography>
                          <Typography variant="body1" color="text.secondary">
                            {ride.description}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      {isLoggedIn && (
                        // Check if the current user is the creator of the post using all possible identifiers
                        (currentUserEmail === ride.user?.email || 
                         currentUserEmail === ride.user_email || 
                         currentUserId === ride.user_id || 
                         currentUserId === ride.user?._id) ? (
                          // If user is the creator, show edit and delete buttons
                          <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              sx={{ flex: 1 }}
                              onClick={() => handleEditPost(ride)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="error"
                              sx={{ flex: 1 }}
                              onClick={() => handleDeletePost(ride)}
                            >
                              Delete
                            </Button>
                          </Box>
                        ) : (
                          // If user is not the creator, show action buttons
                          <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
                            {ride.status === 'booked' || ride.seats_available <= 0 ? (
                              <Button 
                                size="small" 
                                variant="contained" 
                                sx={{ flex: 1 }}
                                disabled
                              >
                                Fully Booked
                              </Button>
                            ) : (
                              <Button 
                                size="small" 
                                variant="contained" 
                                sx={{ flex: 1 }}
                                onClick={() => openBookingDialogForRide(ride)}
                              >
                                {!ride.is_free ? 'Book Now' : 'Book Now'}
                              </Button>
                            )}
                            <Button 
                              size="small" 
                              variant="outlined" 
                              sx={{ flex: 1 }}
                              onClick={() => openChatDialogForRide(ride)}
                            >
                              Contact
                            </Button>
                          </Box>
                        )
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
        
        {/* My Bookings Tab */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : bookings.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                You haven't made any bookings yet.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {bookings.map((booking) => (
                <Grid item key={booking._id} xs={12} md={6}>
                  <Card sx={{ position: 'relative' }}>
                    {booking.status === 'cancelled' && (
                      <Chip 
                        label="Cancelled" 
                        color="error" 
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10, 
                          zIndex: 1 
                        }}
                      />
                    )}
                    {booking.status === 'confirmed' && (
                      <Chip 
                        label="Confirmed" 
                        color="success" 
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10, 
                          zIndex: 1 
                        }}
                      />
                    )}
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {booking.ride?.from_location || booking.from_location || 'Unknown'} to {booking.ride?.to_location || booking.to_location || 'Unknown'}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Date:</strong> {formatDate(booking.date)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Time:</strong> {booking.time}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Pickup:</strong> {booking.pickup_location || booking.from_location || booking.ride?.from_location || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Dropoff:</strong> {booking.dropoff_location || booking.to_location || booking.ride?.to_location || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Seats Booked:</strong> {booking.seats_booked || booking.seats || 1}
                          </Typography>
                        </Grid>
                        {booking.per_seat_amount > 0 && (
                          <>
                            <Grid item xs={6}>
                              <Typography variant="body2">
                                <strong>Per Seat:</strong> ৳{booking.per_seat_amount}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                <strong>Total:</strong> ৳{booking.total_fare}
                              </Typography>
                            </Grid>
                          </>
                        )}
                        {booking.payment_method && (
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              <strong>Payment:</strong> {booking.payment_method}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                    <CardActions>
                      {(booking.status === 'confirmed' || booking.status === 'pending') && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => openCancelDialogForBooking(booking)}
                          fullWidth
                          startIcon={<CloseIcon />}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Box>
      
      {/* Book Ride Dialog */}
      <Dialog open={openBookingDialog} onClose={() => setOpenBookingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Book Ride
          <IconButton
            aria-label="close"
            onClick={() => setOpenBookingDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRide && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6">{selectedRide.from_location} to {selectedRide.to_location}</Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {formatDate(selectedRide.date)} <strong>Time:</strong> {selectedRide.time}
              </Typography>
              <Typography variant="body2">
                <strong>Per Seat Amount:</strong> {selectedRide?.is_free ? 'Free' : `৳${selectedRide?.fee_amount || selectedRide?.price || selectedRide?.price_per_seat || 0}`}
              </Typography>
              {!selectedRide?.is_free && newBooking.seats > 1 && (
                <Typography variant="body2" color="primary">
                  <strong>Total Amount:</strong> ৳{(selectedRide?.fee_amount || selectedRide?.price || selectedRide?.price_per_seat || 0) * newBooking.seats}
                </Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Posted by
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {selectedRide.user?.name || selectedRide.user_name || 'Unknown'}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {selectedRide.user?.email || selectedRide.user_email || 'N/A'}
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Pickup Location"
                name="pickup_location"
                value={newBooking.pickup_location}
                onChange={handleBookingChange}
                placeholder="Enter pickup location"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Dropoff Location"
                name="dropoff_location"
                value={newBooking.dropoff_location}
                onChange={handleBookingChange}
                placeholder="Enter dropoff location"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Number of Seats"
                name="seats"
                type="number"
                value={newBooking.seats}
                onChange={handleBookingChange}
                InputProps={{ inputProps: { min: 1, max: selectedRide?.seats_available || 1 } }}
                helperText={`Maximum available: ${selectedRide?.seats_available || 1}`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBookingDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBooking}>Book Ride</Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Ride Dialog */}
      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Offer Ride Share
          <IconButton
            aria-label="close"
            onClick={() => setOpenShareDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="From Location"
                name="from_location"
                value={newShareRide.from_location}
                onChange={handleShareRideChange}
                placeholder="e.g. Merul Badda"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="To Location"
                name="to_location"
                value={newShareRide.to_location}
                onChange={handleShareRideChange}
                placeholder="e.g. BRAC University"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Date"
                name="date"
                value={newShareRide.date}
                onChange={handleShareRideChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Time"
                name="time"
                type="time"
                value={newShareRide.time}
                onChange={handleShareRideChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  name="vehicle_type"
                  value={newShareRide.vehicle_type}
                  onChange={handleShareRideChange}
                  label="Vehicle Type"
                >
                  {vehicleTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Available Seats"
                name="seats_available"
                type="number"
                value={newShareRide.seats_available}
                onChange={handleShareRideChange}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Ride Type</FormLabel>
                <RadioGroup
                  row
                  name="is_free"
                  value={newShareRide.is_free ? 'free' : 'paid'}
                  onChange={(e) => handleShareRideChange({
                    target: {
                      name: 'is_free',
                      value: e.target.value === 'free'
                    }
                  })}
                >
                  <FormControlLabel value="free" control={<Radio />} label="Free Ride" />
                  <FormControlLabel value="paid" control={<Radio />} label="Paid Ride" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {!newShareRide.is_free && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Fee Amount"
                    name="fee_amount"
                    type="number"
                    value={newShareRide.fee_amount || ''}
                    onChange={handleShareRideChange}
                    InputProps={{ 
                      inputProps: { min: 0 },
                      startAdornment: <InputAdornment position="start">৳</InputAdornment>
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      name="payment_method"
                      value={newShareRide.payment_method || ''}
                      onChange={handleShareRideChange}
                      label="Payment Method"
                    >
                      <MenuItem value="Bkash">Bkash</MenuItem>
                      <MenuItem value="Nagad">Nagad</MenuItem>
                      <MenuItem value="In Person">In Person</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {(newShareRide.payment_method === 'Bkash' || newShareRide.payment_method === 'Nagad') && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Payment Number"
                      name="payment_number"
                      value={newShareRide.payment_number || ''}
                      onChange={handleShareRideChange}
                      placeholder="Enter your payment number"
                    />
                  </Grid>
                )}
              </>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={newShareRide.description}
                onChange={handleShareRideChange}
                multiline
                rows={3}
                placeholder="Additional details about the ride..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShareDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateShareRide}>Offer Ride</Button>
        </DialogActions>
      </Dialog>
      
      {/* Chat Dialog - Modern Design */}
      <Dialog open={openChatDialog} onClose={() => setOpenChatDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Chat with {selectedRideCreator?.name}
          <IconButton
            aria-label="close"
            onClick={() => setOpenChatDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pb: 0 }}>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Recipient Information
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {selectedRideCreator?.name || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {selectedRideCreator?.email || 'N/A'}
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Type your message..."
            variant="outlined"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenChatDialog(false)} variant="outlined">Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSendMessage} 
            disabled={messageLoading || !chatMessage.trim()}
            startIcon={messageLoading ? <CircularProgress size={20} /> : null}
          >
            {messageLoading ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Payment Details
          <IconButton
            aria-label="close"
            onClick={() => setOpenPaymentDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom color="primary">
              Payment Summary
            </Typography>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Per Seat Amount:</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  ৳{paymentDetails.perSeatAmount}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Number of Seats:</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  {paymentDetails.seats}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body1" fontWeight="bold">
                  <strong>Total Amount:</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" fontWeight="bold" color="primary">
                  ৳{paymentDetails.amount}
                </Typography>
              </Grid>
            </Grid>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            Payment Method: <strong>{paymentDetails.method || 'Select a method'}</strong>
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentDetails.method || ''}
              onChange={(e) => setPaymentDetails({...paymentDetails, method: e.target.value})}
              label="Payment Method"
            >
              <MenuItem value="Bkash">Bkash</MenuItem>
              <MenuItem value="Nagad">Nagad</MenuItem>
              <MenuItem value="In Person">In Person</MenuItem>
            </Select>
          </FormControl>
          
          {paymentDetails.method !== 'In Person' && paymentDetails.paymentNumber && (
            <Typography variant="body1" gutterBottom>
              Payment Number: <strong>{paymentDetails.paymentNumber}</strong>
            </Typography>
          )}
          
          {/* Add transaction ID field */}
          {paymentDetails.method !== 'In Person' && (
            <TextField
              fullWidth
              required
              label="Transaction ID"
              value={paymentDetails.transactionId || ''}
              onChange={(e) => setPaymentDetails({...paymentDetails, transactionId: e.target.value})}
              placeholder="Enter the transaction ID after payment"
              sx={{ mt: 2, mb: 2 }}
            />
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Please complete the payment using the provided details, enter the transaction ID, and click "Confirm Payment" to proceed with your booking.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => processBooking(paymentDetails.method, paymentDetails.transactionId)}
            disabled={paymentDetails.method !== 'In Person' && !paymentDetails.transactionId}
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cancellation Dialog */}
      <Dialog open={openCancelDialog} onClose={() => setOpenCancelDialog(false)} maxWidth="sm" fullWidth>
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
        <DialogContent dividers>
          <Typography variant="body1" gutterBottom>
            Please select a reason for cancellation:
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Cancellation Reason</InputLabel>
            <Select
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              label="Cancellation Reason"
            >
              <MenuItem value="Changed plans">Changed plans</MenuItem>
              <MenuItem value="Found another ride">Found another ride</MenuItem>
              <MenuItem value="Emergency">Emergency</MenuItem>
              <MenuItem value="Weather conditions">Weather conditions</MenuItem>
              <MenuItem value="Vehicle issues">Vehicle issues</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          
          {cancellationReason === 'Other' && (
            <TextField
              fullWidth
              label="Specify reason"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelDialog(false)}>Back</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => {
              const finalReason = cancellationReason === 'Other' ? `Other: ${otherReason}` : cancellationReason;
              handleCancelBooking(selectedBooking._id, finalReason);
            }}
          >
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Post Dialog - Modern Design */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          Delete Ride Share Post
          <IconButton
            aria-label="close"
            onClick={() => setOpenDeleteDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {postToDelete && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                {postToDelete.from_location} → {postToDelete.to_location}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {formatDate(postToDelete.date)} <strong>Time:</strong> {postToDelete.time}
              </Typography>
              <Typography variant="body2">
                <strong>Seats:</strong> {postToDelete.seats_available}
              </Typography>
              {!postToDelete.is_free && (
                <Typography variant="body2">
                  <strong>Price per Seat:</strong> ৳{postToDelete.fee_amount || postToDelete.price_per_seat}
                </Typography>
              )}
            </Box>
          )}
          
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
            Please provide a reason for deleting this post:
          </Typography>
          
          <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
            <RadioGroup
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            >
              <FormControlLabel value="Ride cancelled" control={<Radio />} label="Ride cancelled" />
              <FormControlLabel value="Found passengers elsewhere" control={<Radio />} label="Found passengers elsewhere" />
              <FormControlLabel value="Change of plans" control={<Radio />} label="Change of plans" />
              <FormControlLabel value="Duplicate post" control={<Radio />} label="Duplicate post" />
              <FormControlLabel value="Other" control={<Radio />} label="Other" />
            </RadioGroup>
          </FormControl>
          
          {deleteReason === 'Other' && (
            <TextField
              fullWidth
              label="Please specify"
              value={otherDeleteReason}
              onChange={(e) => setOtherDeleteReason(e.target.value)}
              multiline
              rows={2}
              required
              sx={{ mb: 2 }}
            />
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Note: This action cannot be undone. Once deleted, the post will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteConfirm}
            disabled={deleteLoading || (!deleteReason || (deleteReason === 'Other' && !otherDeleteReason))}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Post'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          elevation={6} 
          variant="filled" 
          onClose={() => setOpenSnackbar(false)} 
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default withNotificationBanner(RideBooking, 'ride_share');