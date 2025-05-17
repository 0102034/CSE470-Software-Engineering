import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EnhancedMessageCenter from './EnhancedMessageCenter';
import { jwtDecode } from 'jwt-decode';

const ContactDialog = ({ open, onClose, item, itemType }) => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userId = decoded.sub || decoded.user_id;
        setCurrentUserId(userId);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    // Generate initial message based on item type
    if (item) {
      let message = '';
      switch (itemType) {
        case 'marketplace':
          message = `Hi, I'm interested in your item "${item.title}". Is it still available?`;
          break;
        case 'ride':
          message = `Hi, I'm interested in your ride to ${item.destination}. Is there still space available?`;
          break;
        case 'lost':
          message = `Hi, I think I may have found your lost item "${item.title}". Can we connect?`;
          break;
        case 'found':
          message = `Hi, I think you may have found my item. The "${item.title}" you posted looks like mine. Can we connect?`;
          break;
        default:
          message = `Hi, I'm contacting you about your post "${item.title}".`;
      }
      setInitialMessage(message);
    }

    // Reset message sent state when dialog opens
    if (open) {
      setMessageSent(false);
      setError(null);
    }
  }, [item, itemType, open]);

  // Determine dialog title based on item type
  const getDialogTitle = () => {
    switch (itemType) {
      case 'marketplace':
        return 'Contact Seller';
      case 'ride':
        return 'Contact Ride Provider';
      case 'lost':
        return 'Contact Item Owner';
      case 'found':
        return 'Contact Finder';
      default:
        return 'Contact User';
    }
  };

  // Get receiver ID from the item
  const getReceiverId = () => {
    if (!item) return null;
    return item.user_id;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          height: '80vh',
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">{getDialogTitle()}</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {currentUserId && item && (
          <EnhancedMessageCenter 
            userId={currentUserId}
            receiverId={getReceiverId()}
            itemId={item._id}
            initialMessage={initialMessage}
            itemType={itemType}
            onClose={onClose}
            onMessageSent={() => setMessageSent(true)}
            onError={(err) => setError(err)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
