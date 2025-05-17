import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  Select,
  InputLabel
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import CancelIcon from '@mui/icons-material/Cancel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import axios from 'axios';
import '../AppBackgrounds.css';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  
  const [paymentInfo, setPaymentInfo] = useState({
    fullName: '',
    address: '',
    location: '',
    phone: '',
    deliveryOption: 'standard',
    paymentMethod: 'bkash',
    bkashNumber: '',
    nagadNumber: '',
    transactionId: ''
  });
  
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  
  // Get item details from URL parameters or fetch from API
  useEffect(() => {
    const itemId = queryParams.get('itemId');
    const itemPrice = queryParams.get('price');
    const itemTitle = queryParams.get('title');
    const sellerId = queryParams.get('sellerId');
    const sellerName = queryParams.get('sellerName');
    const sellerEmail = queryParams.get('sellerEmail');
    const imageUrl = queryParams.get('image');
    
    if (itemId) {
      // In a real app, you would fetch the complete item details from the API
      // For now, we'll use the data from URL parameters
      setItem({
        _id: itemId,
        title: itemTitle || 'Product',
        price: itemPrice || '0',
        images: [imageUrl || 'https://via.placeholder.com/300x200?text=Product+Image'],
        seller: {
          id: sellerId,
          name: sellerName,
          email: sellerEmail
        }
      });
      setLoading(false);
    } else {
      setError('No item selected for purchase');
      setLoading(false);
    }
    
    document.body.classList.add('payment-page');
    return () => {
      document.body.classList.remove('payment-page');
    };
  }, [queryParams]);
  
  // List of locations in Dhaka
  const dhakaLocations = [
    'Mirpur',
    'Dhanmondi',
    'Gulshan',
    'Banani',
    'Uttara',
    'Mohammadpur',
    'Motijheel',
    'Bashundhara',
    'Khilgaon',
    'Farmgate',
    'Shahbag',
    'Elephant Road',
    'Mohakhali',
    'Badda',
    'Rampura',
    'University Campus',
    'Other'
  ];
  
  const steps = ['Delivery Information', 'Delivery Options', 'Payment'];
  
  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Process payment
      processPayment();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentInfo({
      ...paymentInfo,
      [name]: value
    });
  };
  
  const processPayment = async () => {
    setLoading(true);
    
    try {
      // Create the order
      const orderData = {
        item_id: item._id,
        seller_id: item.seller.id,
        delivery_info: {
          fullName: paymentInfo.fullName,
          address: paymentInfo.address,
          location: paymentInfo.location,
          phone: paymentInfo.phone,
          deliveryOption: paymentInfo.deliveryOption
        },
        payment_info: {
          method: paymentInfo.paymentMethod,
          transactionId: paymentInfo.transactionId,
          [paymentInfo.paymentMethod + 'Number']: paymentInfo[paymentInfo.paymentMethod + 'Number']
        },
        total_amount: parseFloat(item.price) + 
          (paymentInfo.deliveryOption === 'standard' ? 60 : 
           paymentInfo.deliveryOption === 'express' ? 120 : 0)
      };

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/marketplace/orders', orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.order_id) {
        setOrderReference(response.data.order_id);
        setOrderComplete(true);
        
        // Show success message and redirect after a short delay
        setTimeout(() => {
          navigate('/marketplace', { 
            state: { 
              notification: {
                message: 'Order placed successfully! The item has been marked as sold.',
                severity: 'success'
              }
            }
          });
        }, 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReturnToMarketplace = () => {
    navigate('/marketplace');
  };
  
  const handleCancelOrder = () => {
    setOpenCancelDialog(true);
  };
  
  const confirmCancelOrder = () => {
    setOpenCancelDialog(false);
    navigate('/marketplace', { 
      state: { 
        notification: {
          message: 'Your order has been cancelled.',
          severity: 'info'
        }
      }
    });
  };
  
  if (loading && !orderComplete) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <Box sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            onClick={() => navigate('/marketplace')}
          >
            Return to Marketplace
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container>
      <Box sx={{ py: 4 }}>
        {/* Cancel Order Confirmation Dialog */}
        <Dialog
          open={openCancelDialog}
          onClose={() => setOpenCancelDialog(false)}
        >
          <DialogTitle>Cancel Your Order?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCancelDialog(false)}>No, Keep My Order</Button>
            <Button onClick={confirmCancelOrder} color="error" autoFocus>
              Yes, Cancel Order
            </Button>
          </DialogActions>
        </Dialog>
        <Typography variant="h4" gutterBottom>
          {orderComplete ? 'Order Confirmation' : 'Complete Your Purchase'}
        </Typography>
        
        {!orderComplete && (
          <Box sx={{ mb: 4 }}>
            <Stepper activeStep={activeStep}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}
        
        {item && !orderComplete && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, mb: 3 }}>
                {activeStep === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Enter Your Delivery Information
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        label="Full Name"
                        name="fullName"
                        value={paymentInfo.fullName}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        label="Address"
                        name="address"
                        value={paymentInfo.address}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel id="location-label">Location in Dhaka</InputLabel>
                        <Select
                          labelId="location-label"
                          id="location"
                          name="location"
                          value={paymentInfo.location}
                          label="Location in Dhaka"
                          onChange={handleInputChange}
                        >
                          {dhakaLocations.map(location => (
                            <MenuItem key={location} value={location}>{location}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        label="Phone Number"
                        name="phone"
                        value={paymentInfo.phone}
                        onChange={handleInputChange}
                      />
                    </Grid>
                  </Grid>
                )}
                
                {activeStep === 1 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Choose Delivery Option
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl component="fieldset">
                        <RadioGroup
                          name="deliveryOption"
                          value={paymentInfo.deliveryOption}
                          onChange={handleInputChange}
                        >
                          <Paper sx={{ mb: 2, p: 2 }}>
                            <FormControlLabel 
                              value="standard" 
                              control={<Radio />} 
                              label={
                                <Box>
                                  <Typography variant="subtitle1">Standard Delivery</Typography>
                                  <Typography variant="body2" color="text.secondary">3-5 business days</Typography>
                                  <Typography variant="body2" color="primary">৳60</Typography>
                                </Box>
                              } 
                            />
                          </Paper>
                          <Paper sx={{ mb: 2, p: 2 }}>
                            <FormControlLabel 
                              value="express" 
                              control={<Radio />} 
                              label={
                                <Box>
                                  <Typography variant="subtitle1">Express Delivery</Typography>
                                  <Typography variant="body2" color="text.secondary">1-2 business days</Typography>
                                  <Typography variant="body2" color="primary">৳120</Typography>
                                </Box>
                              } 
                            />
                          </Paper>
                          <Paper sx={{ p: 2 }}>
                            <FormControlLabel 
                              value="pickup" 
                              control={<Radio />} 
                              label={
                                <Box>
                                  <Typography variant="subtitle1">University Campus Pickup</Typography>
                                  <Typography variant="body2" color="text.secondary">Arrange with seller</Typography>
                                  <Typography variant="body2" color="primary">Free</Typography>
                                </Box>
                              } 
                            />
                          </Paper>
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  </Grid>
                )}
                
                {activeStep === 2 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Payment Method
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl component="fieldset">
                        <RadioGroup
                          name="paymentMethod"
                          value={paymentInfo.paymentMethod}
                          onChange={handleInputChange}
                        >
                          <Paper sx={{ mb: 2, p: 2 }}>
                            <FormControlLabel 
                              value="bkash" 
                              control={<Radio />} 
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PhoneAndroidIcon color="error" />
                                  <Box>
                                    <Typography variant="subtitle1">bKash</Typography>
                                    <Typography variant="body2" color="text.secondary">Pay using bKash mobile banking</Typography>
                                  </Box>
                                </Box>
                              } 
                            />
                          </Paper>
                          <Paper sx={{ mb: 2, p: 2 }}>
                            <FormControlLabel 
                              value="nagad" 
                              control={<Radio />} 
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PhoneAndroidIcon color="warning" />
                                  <Box>
                                    <Typography variant="subtitle1">Nagad</Typography>
                                    <Typography variant="body2" color="text.secondary">Pay using Nagad mobile banking</Typography>
                                  </Box>
                                </Box>
                              } 
                            />
                          </Paper>
                          <Paper sx={{ p: 2 }}>
                            <FormControlLabel 
                              value="cash" 
                              control={<Radio />} 
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <AccountBalanceIcon color="success" />
                                  <Box>
                                    <Typography variant="subtitle1">Cash on Delivery/Pickup</Typography>
                                    <Typography variant="body2" color="text.secondary">Pay when you receive the item</Typography>
                                  </Box>
                                </Box>
                              } 
                            />
                          </Paper>
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                    
                    {(paymentInfo.paymentMethod === 'bkash' || paymentInfo.paymentMethod === 'nagad') && (
                      <>
                        <Grid item xs={12}>
                          <Typography variant="body1" color="text.secondary" paragraph>
                            Please send the payment to the following {paymentInfo.paymentMethod} number:
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                            {paymentInfo.paymentMethod === 'bkash' ? '01712345678' : '01812345678'}
                          </Typography>
                          <TextField
                            fullWidth
                            required
                            label={`Your ${paymentInfo.paymentMethod} Number`}
                            name={paymentInfo.paymentMethod === 'bkash' ? 'bkashNumber' : 'nagadNumber'}
                            value={paymentInfo.paymentMethod === 'bkash' ? paymentInfo.bkashNumber : paymentInfo.nagadNumber}
                            onChange={handleInputChange}
                            placeholder="e.g., 01XXXXXXXXX"
                            sx={{ mb: 2 }}
                          />
                          <TextField
                            fullWidth
                            required
                            label="Transaction ID"
                            name="transactionId"
                            value={paymentInfo.transactionId}
                            onChange={handleInputChange}
                            placeholder="e.g., TRX123456789"
                            helperText={`Please enter the ${paymentInfo.paymentMethod} Transaction ID after completing payment`}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                )}
              </Paper>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  {activeStep > 0 && (
                    <Button onClick={handleBack} sx={{ mr: 1 }}>
                      Back
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelOrder}
                  >
                    Cancel Order
                  </Button>
                </Box>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {activeStep === steps.length - 1 ? 'Complete Payment' : 'Continue'}
                  {loading && <CircularProgress size={24} sx={{ ml: 1 }} />}
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Order Summary</Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Card sx={{ display: 'flex', mb: 2 }}>
                    <CardMedia
                      component="img"
                      sx={{ width: 100 }}
                      image={item.images?.[0] || "https://via.placeholder.com/100x100?text=Product"}
                      alt={item.title}
                    />
                    <CardContent sx={{ flex: '1 0 auto' }}>
                      <Typography variant="subtitle1">{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ৳{parseInt(item.price).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Item Price:</Typography>
                    <Typography>৳{parseInt(item.price).toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Delivery:</Typography>
                    <Typography>
                      {paymentInfo.deliveryOption === 'standard' ? '৳60' : 
                       paymentInfo.deliveryOption === 'express' ? '৳120' : 'Free'}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <Typography variant="subtitle1">Total:</Typography>
                  <Typography variant="subtitle1">
                    ৳{(parseInt(item.price) + 
                      (paymentInfo.deliveryOption === 'standard' ? 60 : 
                       paymentInfo.deliveryOption === 'express' ? 120 : 0)).toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {orderComplete && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: 'success.light', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto',
              mb: 3
            }}>
              <CheckIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" gutterBottom>Payment Successful!</Typography>
            <Typography variant="body1" paragraph>
              Thank you for your purchase. Your order has been placed successfully.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              A confirmation email has been sent to your email address.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Order reference: #{orderReference}
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleReturnToMarketplace}
              sx={{ mt: 2 }}
            >
              Return to Marketplace
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Payment;
