import axios from 'axios';

const getOrders = async (type = 'buyer') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`/api/marketplace/orders/${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

const createOrder = async (orderData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post('/api/marketplace/orders', orderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const orderService = {
  getOrders,
  createOrder
};
