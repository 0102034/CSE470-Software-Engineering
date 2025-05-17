import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const SimpleMessageDialog = ({ open, onClose, item, itemType }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Generate initial message based on item type
  useState(() => {
    if (item) {
      console.log('Generating initial message for item:', item);
      console.log('Item type:', itemType);
      
      let initialMessage = '';
      switch (itemType) {
        case 'marketplace':
          initialMessage = `Hi, I'm interested in your item "${item.title || 'your listing'}". Is it still available?`;
          break;
        case 'ride':
          // Use the correct property for ride destination
          const destination = item.to_location || item.destination || item.to_location_custom || 'your destination';
          initialMessage = `Hi, I'm interested in your ride to ${destination}. Is there still space available?`;
          break;
        case 'lost':
          initialMessage = `Hi, I think I may have found your lost item "${item.title || 'your item'}". Can we connect?`;
          break;
        case 'found':
          initialMessage = `Hi, I think you may have found my item. The "${item.title || 'item'}" you posted looks like mine. Can we connect?`;
          break;
        default:
          initialMessage = `Hi, I'm contacting you about your post "${item.title || 'your listing'}".`;
      }
      setMessage(initialMessage);
      console.log('Generated initial message:', initialMessage);
    }
  }, [item, itemType]);

  const handleSendMessage = async () => {
    if (!message.trim() || !item) {
      console.error('Cannot send message: message is empty or item is null', { message, item });
      return;
    }

    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Cannot send message: no authentication token found');
      setSnackbar({
        open: true,
        message: 'Please log in to contact the user',
        severity: 'warning'
      });
      return;
    }

    setSending(true);
    try {
      // Get user ID from token - handle different token formats
      let userId;
      try {
        const decoded = jwtDecode(token);
        userId = decoded.sub || decoded.user_id || decoded._id || decoded.id;
        console.log('User ID from token:', userId);
      } catch (tokenError) {
        console.error('Error decoding token with jwtDecode:', tokenError);
        
        // Try manual parsing as fallback
        try {
          const base64Url = token.split('.')[1];
          if (!base64Url) {
            throw new Error('Invalid token format - missing payload section');
          }
          
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          userId = payload.sub || payload.user_id || payload._id || payload.id;
          
          if (!userId) {
            throw new Error('Token payload does not contain a user ID');
          }
          
          console.log('User ID from manual token decode:', userId);
        } catch (manualDecodeError) {
          console.error('Manual token decode failed:', manualDecodeError);
          throw new Error('Unable to authenticate. Please log in again.');
        }
      }

      // Ensure we have a valid receiver ID
      const receiverId = item.user_id || (item.seller && item.seller.id) || item.creator_id;
      if (!receiverId) {
        console.error('Cannot send message: no receiver ID found in item', item);
        throw new Error('Cannot determine who to send this message to. Please try again later.');
      }
      
      // Ensure we have a valid item ID
      const itemId = item._id || item.id;
      if (!itemId) {
        console.error('Cannot send message: no item ID found', item);
        // Continue anyway, but log the issue
      }

      console.log('Sending message with data:', {
        sender_id: userId,
        receiver_id: receiverId,
        content: message,
        item_id: itemId,
        item_type: itemType || 'general'
      });
      
      // Create a new message in the database
      let messageSent = false;
      
      // First attempt - standard API endpoint
      try {
        const response = await axios.post('/api/messages', {
          sender_id: userId,
          receiver_id: receiverId,
          content: message,
          item_id: itemId,
          item_type: itemType || 'general',
          item_title: item.title || item.name || (item.from_location && item.to_location ? `${item.from_location} → ${item.to_location}` : undefined)
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Message sent successfully via primary endpoint:', response.data);
        messageSent = true;
      } catch (apiError) {
        console.error('API error when sending message via primary endpoint:', apiError);
        
        // Second attempt - direct socket.io message
        try {
          const response = await axios.post('/api/messages/direct', {
            sender_id: userId,
            receiver_id: receiverId,
            content: message,
            item_id: itemId,
            item_type: itemType || 'general'
          }, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Message sent successfully via alternative route:', response.data);
          messageSent = true;
        } catch (fallbackError) {
          console.error('Fallback endpoint also failed:', fallbackError);
          
          // Third attempt - socket emit directly
          try {
            // If both API calls fail, try to emit a socket event directly
            // This is a last resort fallback mechanism
            const socketResponse = await axios.post('/api/socket/emit', {
              event: 'new_message',
              data: {
                sender_id: userId,
                receiver_id: receiverId,
                content: message,
                item_id: itemId,
                item_type: itemType || 'general',
                timestamp: new Date().toISOString()
              }
            }, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            console.log('Message sent via socket emit:', socketResponse.data);
            messageSent = true;
          } catch (socketError) {
            console.error('All message sending methods failed:', socketError);
            throw new Error('Could not send message through any available channel');
          }
        }
      }

      if (messageSent) {
        setSnackbar({
          open: true,
          message: 'Message sent successfully! Check your profile messages to continue the conversation.',
          severity: 'success'
        });

        // Close dialog after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbar({
        open: true,
        message: `Error sending message: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            bgcolor: itemType === 'lost' ? 'rgba(255, 82, 82, 0.05)' : 'rgba(0, 200, 83, 0.05)',
            '& .MuiTypography-root': {
              display: 'flex',
              alignItems: 'center',
              fontWeight: 'bold'
            }
          }}
        >
          Contact {itemType === 'marketplace' ? 'Seller' : itemType === 'ride' ? 'Driver' : itemType === 'lost' ? 'Owner' : 'Finder'}
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close" sx={{ ml: 'auto' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Re: {item?.title || 'Item'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your message will be sent to {item?.creator_name || 'the user'} and will appear in your messages.
            </Typography>
          </Box>
          
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button 
            onClick={onClose} 
            color="inherit"
            disabled={sending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendMessage} 
            variant="contained" 
            color={itemType === 'lost' ? 'error' : itemType === 'found' ? 'success' : 'primary'}
            disabled={!message.trim() || sending}
            startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SimpleMessageDialog;
