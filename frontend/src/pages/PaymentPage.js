import React, { useState } from 'react';
import { Box, Typography, Button, Paper, TextField, CircularProgress, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Expect item and seller info from location.state
  const { item, seller } = location.state || {};
  const [buyerDetails, setBuyerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!item || !seller) {
    return <Alert severity="error">Missing item or seller information. Please go back and select an item to buy.</Alert>;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBuyerDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    try {
      // Simulate payment with Stripe (replace with real integration)
      // For now, just simulate success
      await new Promise(res => setTimeout(res, 1500));
      setSuccess(true);
      // Optionally, call backend to record purchase
      // await axios.post('/api/marketplace/purchase', { itemId: item._id, buyerDetails });
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Confirm & Pay
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Item: <b>{item.title}</b> <br />
          Seller: {seller.name || 'N/A'} ({seller.email || 'N/A'})
        </Typography>
        {success ? (
          <Alert severity="success" sx={{ my: 2 }}>
            Payment successful! The seller will contact you soon.<br />
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField
              name="name"
              label="Your Name"
              value={buyerDetails.name}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              name="email"
              label="Your Email"
              value={buyerDetails.email}
              onChange={handleChange}
              type="email"
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              name="phone"
              label="Phone Number"
              value={buyerDetails.phone}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              name="address"
              label="Delivery Address"
              value={buyerDetails.address}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={processing}
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              {processing ? <CircularProgress size={24} /> : 'Pay with Stripe'}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default PaymentPage;
