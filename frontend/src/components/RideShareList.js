import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, CardActions, Typography, Button, Grid, CircularProgress, Box, Chip
} from '@mui/material';
import axios from 'axios';

const RideShareList = ({ userId, adminView, onEdit, onDelete, onBookNow, onContact, items }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If items are provided directly (from admin panel), use them
    if (items) {
      setRides(items);
      setLoading(false);
      return;
    }
    
    // Otherwise fetch from API
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // Use the correct endpoint based on whether we're fetching for a specific user
    let url = 'http://localhost:5000/api/ride/posts';
    if (userId) {
      url = `http://localhost:5000/api/ride/posts/user/${userId}`;
    }
    
    axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        setRides(res.data || []);
        setError('');
      })
      .catch(err => {
        console.error('Error fetching ride shares:', err);
        setError('Failed to load ride shares.');
      })
      .finally(() => setLoading(false));
  }, [userId, items]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" sx={{ textAlign: 'center', py: 2 }}>{error}</Typography>;
  if (!rides.length) return (
    <Typography sx={{ textAlign: 'center', py: 2 }} color="text.secondary">
      {adminView ? 'No ride shares have been posted yet.' : 'You have not posted any ride shares yet.'}
    </Typography>
  );

  return (
    <Grid container spacing={2}>
      {rides.map((ride) => (
        <Grid item xs={12} md={6} lg={4} key={ride._id || ride.id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {ride.from_location} → {ride.to_location}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {ride.date} &nbsp;|&nbsp; Time: {ride.time}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vehicle: {ride.vehicle_type} &nbsp;|&nbsp; Seats: {ride.seats_available}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Price per Seat: {ride.price_per_seat}
              </Typography>
              {ride.description && <Typography variant="body2">{ride.description}</Typography>}
              {ride.user && (
                <Box sx={{ mt: 1 }}>
                  <Chip label={ride.user.name || ride.user.email || 'Posted by user'} size="small" />
                </Box>
              )}
            </CardContent>
            <CardActions>
              {adminView ? (
                <>
                  <Button size="small" color="primary" onClick={() => onEdit && onEdit(ride)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete && onDelete(ride)}>Delete</Button>
                </>
              ) : ride.is_creator ? (
                <>
                  <Button size="small" color="primary" onClick={() => onEdit && onEdit(ride)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => onDelete && onDelete(ride)}>Delete</Button>
                </>
              ) : (
                <>
                  <Button 
                    size="small" 
                    color="primary" 
                    onClick={() => onBookNow && onBookNow(ride)}
                    disabled={ride.status === 'booked'}
                  >
                    {ride.status === 'booked' ? 'Already Booked' : 'Book Now'}
                  </Button>
                  <Button 
                    size="small" 
                    color="secondary" 
                    onClick={() => onContact && onContact(ride)}
                  >
                    Contact
                  </Button>
                </>
              )}
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default RideShareList;
