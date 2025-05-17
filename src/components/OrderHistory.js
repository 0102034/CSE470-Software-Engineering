import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { orderService } from '../services/orderService';
import { format } from 'date-fns';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('buyer'); // 'buyer' or 'seller'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab]);

  const fetchOrders = async (type) => {
    try {
      setLoading(true);
      const data = await orderService.getOrders(type);
      setOrders(data);
      setError('');
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Purchases" value="buyer" />
          <Tab label="Sales" value="seller" />
        </Tabs>
      </Box>

      {orders.length === 0 ? (
        <Box textAlign="center" py={3}>
          <Typography color="textSecondary">
            {activeTab === 'buyer' ? 'No purchases yet' : 'No sales yet'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {orders.map((order) => (
            <Grid item xs={12} sm={6} md={4} key={order._id}>
              <Card>
                <CardMedia
                  component="img"
                  height="140"
                  image={order.item?.image || 'https://via.placeholder.com/140?text=No+Image'}
                  alt={order.item?.title}
                />
                <CardContent>
                  <Typography variant="h6" gutterBottom noWrap>
                    {order.item?.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="subtitle1" color="primary">
                      ৳{order.total_amount.toLocaleString()}
                    </Typography>
                    <Chip
                      size="small"
                      label={order.status}
                      color={order.status === 'confirmed' ? 'success' : 'default'}
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => handleViewDetails(order)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Order Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              Order Details
              <Typography variant="subtitle2" color="textSecondary">
                Order ID: {selectedOrder._id}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Item"
                    secondary={selectedOrder.item?.title}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary={activeTab === 'buyer' ? 'Seller' : 'Buyer'}
                    secondary={selectedOrder.other_party?.name}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Delivery Information"
                    secondary={
                      <>
                        <Typography component="span" display="block">
                          Name: {selectedOrder.delivery_info?.fullName}
                        </Typography>
                        <Typography component="span" display="block">
                          Address: {selectedOrder.delivery_info?.address}
                        </Typography>
                        <Typography component="span" display="block">
                          Location: {selectedOrder.delivery_info?.location}
                        </Typography>
                        <Typography component="span" display="block">
                          Phone: {selectedOrder.delivery_info?.phone}
                        </Typography>
                        <Typography component="span" display="block">
                          Delivery Option: {selectedOrder.delivery_info?.deliveryOption}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Payment Information"
                    secondary={
                      <>
                        <Typography component="span" display="block">
                          Method: {selectedOrder.payment_info?.method}
                        </Typography>
                        <Typography component="span" display="block">
                          Transaction ID: {selectedOrder.payment_info?.transactionId}
                        </Typography>
                        <Typography component="span" display="block">
                          Total Amount: ৳{selectedOrder.total_amount.toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default OrderHistory;
