import React, { useState, useEffect } from 'react';
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
  MenuItem
} from '@mui/material';
import { Close as CloseIcon, DirectionsBus, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import '../AppBackgrounds.css';

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
  const [routes, setRoutes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sharedRides, setSharedRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openBookingDialog, setOpenBookingDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  const [newBooking, setNewBooking] = useState({
    route_id: '',
    date: '',
    time: '',
    pickup_location: '',
    dropoff_location: '',
    seats: 1
  });
  
  const [newShareRide, setNewShareRide] = useState({
    from_location: '',
    to_location: '',
    date: '',
    time: '',
    vehicle_type: '',
    seats_available: 1,
    price_per_seat: '',
    description: ''
  });
  
  const isLoggedIn = localStorage.getItem('token') !== null;
  const vehicleTypes = ['Car', 'Bike', 'Auto'];

  useEffect(() => {
    document.body.classList.add('ride-booking-page');
    return () => {
      document.body.classList.remove('ride-booking-page');
    };
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      fetchRoutes();
    } else if (tabValue === 1 && isLoggedIn) {
      fetchBookings();
    } else if (tabValue === 2) {
      fetchSharedRides();
    }
  }, [tabValue, isLoggedIn]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/ride/routes');
      setRoutes(response.data);
    } catch (err) {
      setError('Failed to load routes. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/ride/bookings',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setBookings(response.data);
    } catch (err) {
      setError('Failed to load bookings. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedRides = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/ride/share');
      setSharedRides(response.data);
    } catch (err) {
      setError('Failed to load shared rides. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/ride/bookings', 
        newBooking, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Close dialog and reset form
      setOpenBookingDialog(false);
      setNewBooking({
        route_id: '',
        date: '',
        time: '',
        pickup_location: '',
        dropoff_location: '',
        seats: 1
      });
      // Switch to bookings tab
      setTabValue(1);
      // Refresh bookings
      fetchBookings();
    } catch (err) {
      console.error('Error creating booking:', err);
    }
  };

  const handleCreateShareRide = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/ride/share', 
        newShareRide, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Close dialog and reset form
      setOpenShareDialog(false);
      setNewShareRide({
        from_location: '',
        to_location: '',
        date: '',
        time: '',
        vehicle_type: '',
        seats_available: 1,
        price_per_seat: '',
        description: ''
      });
      // Refresh shared rides
      fetchSharedRides();
    } catch (err) {
      console.error('Error creating shared ride:', err);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/ride/bookings/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Refresh bookings
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
    }
  };

  const openBookingDialogForRoute = (route) => {
    setSelectedRoute(route);
    setNewBooking({
      ...newBooking,
      route_id: route._id
    });
    setOpenBookingDialog(true);
  };

  const formatSchedule = (schedule) => {
    if (!schedule) return '';
    if (typeof schedule === 'string') return schedule;
    
    return Object.entries(schedule)
      .map(([day, times]) => `${day}: ${times.join(', ')}`)
      .join(' | ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Ride Booking
      </Typography>
      
      <Box sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="ride booking tabs"
            variant="fullWidth"
          >
            <Tab label="Bus Routes" />
            <Tab label="My Bookings" disabled={!isLoggedIn} />
            <Tab label="Share Rides" />
          </Tabs>
        </Box>
        
        {/* Bus Routes Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {isLoggedIn && (
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={() => setOpenShareDialog(true)}
              >
                Offer Ride Share
              </Button>
            )}
          </Box>
          
          {loading ? (
            <Typography>Loading routes...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : routes.length === 0 ? (
            <Typography>No routes available.</Typography>
          ) : (
            <Grid container spacing={3}>
              {routes.map((route) => (
                <Grid item key={route._id} xs={12}>
                  <Card>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={1}>
                          <DirectionsBus color="primary" sx={{ fontSize: 40 }} />
                        </Grid>
                        <Grid item xs={12} md={5}>
                          <Typography variant="h6">{route.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>From:</strong> {route.start_location}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>To:</strong> {route.end_location}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2">
                            <strong>Schedule:</strong> {formatSchedule(route.schedule)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Fare:</strong> ${route.fare}
                          </Typography>
                          {route.stops && route.stops.length > 0 && (
                            <Typography variant="body2">
                              <strong>Stops:</strong> {route.stops.join(', ')}
                            </Typography>
                          )}
                        </Grid>
                        <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isLoggedIn && (
                            <Button 
                              variant="contained" 
                              onClick={() => openBookingDialogForRoute(route)}
                            >
                              Book
                            </Button>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
        
        {/* My Bookings Tab */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Typography>Loading bookings...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : bookings.length === 0 ? (
            <Typography>No bookings found.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Pickup</TableCell>
                    <TableCell>Dropoff</TableCell>
                    <TableCell>Seats</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell>{booking.route?.name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(booking.date)}</TableCell>
                      <TableCell>{booking.time}</TableCell>
                      <TableCell>{booking.pickup_location}</TableCell>
                      <TableCell>{booking.dropoff_location}</TableCell>
                      <TableCell>{booking.seats}</TableCell>
                      <TableCell>
                        <Chip 
                          label={booking.status} 
                          color={
                            booking.status === 'confirmed' ? 'success' :
                            booking.status === 'cancelled' ? 'error' : 'primary'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {booking.status === 'pending' && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleCancelBooking(booking._id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
        
        {/* Share Rides Tab */}
        <TabPanel value={tabValue} index={2}>
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
            <Typography>Loading shared rides...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : sharedRides.length === 0 ? (
            <Typography>No shared rides available.</Typography>
          ) : (
            <Grid container spacing={3}>
              {sharedRides.map((ride) => (
                <Grid item key={ride._id} xs={12} sm={6} md={4}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {ride.from_location} to {ride.to_location}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        <strong>Date:</strong> {formatDate(ride.date)}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Time:</strong> {ride.time}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Vehicle:</strong> {ride.vehicle_type}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Available Seats:</strong> {ride.seats_available}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Price per Seat:</strong> ${ride.price_per_seat}
                      </Typography>
                      {ride.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {ride.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      {isLoggedIn && (
                        <Button size="small" variant="contained" fullWidth>
                          Contact
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
          {selectedRoute && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6">{selectedRoute.name}</Typography>
              <Typography variant="body2">
                <strong>From:</strong> {selectedRoute.start_location} <strong>To:</strong> {selectedRoute.end_location}
              </Typography>
              <Typography variant="body2">
                <strong>Fare:</strong> ${selectedRoute.fare}
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Date"
                name="date"
                value={newBooking.date}
                onChange={handleBookingChange}
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
                value={newBooking.time}
                onChange={handleBookingChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
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
                InputProps={{ inputProps: { min: 1 } }}
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
                placeholder="Starting location"
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
                placeholder="Destination"
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
                  {vehicleTypes.map(type => (
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
              <TextField
                fullWidth
                required
                label="Price per Seat"
                name="price_per_seat"
                type="number"
                value={newShareRide.price_per_seat}
                onChange={handleShareRideChange}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={3}
                value={newShareRide.description}
                onChange={handleShareRideChange}
                placeholder="Additional details about the ride"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShareDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateShareRide}>Offer Ride</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RideBooking; 