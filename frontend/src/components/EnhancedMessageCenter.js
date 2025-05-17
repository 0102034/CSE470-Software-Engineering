import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  TextField, 
  Button, 
  Divider, 
  IconButton,
  Badge,
  Grid,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import axios from 'axios';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

// Socket.io connection will be initialized in the component

const EnhancedMessageCenter = ({ userId, itemId, receiverId, initialMessage, itemType, onClose, onMessageSent, onError }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initialize socket connection and socket.io reference
  const [socket, setSocket] = useState(null);
  
  // Initialize socket connection
  useEffect(() => {
    // Get current user from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const user = {
          _id: decoded.sub || decoded.user_id,
          email: decoded.email || ''
        };
        setCurrentUser(user);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    // Connect to socket server
    const socketInstance = io('http://localhost:5000');
    setSocket(socketInstance);

    // Socket event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsSocketConnected(true);
      
      // Register user with socket
      if (userId) {
        socketInstance.emit('register_user', { user_id: userId });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsSocketConnected(false);
    });

    socketInstance.on('new_message', (message) => {
      console.log('New message received:', message);
      // Add message to the list if it belongs to the current conversation
      if (selectedConversation) {
        const isRelevant = 
          (message.sender_id === userId && message.receiver_id === selectedConversation.other_participant.id) ||
          (message.sender_id === selectedConversation.other_participant.id && message.receiver_id === userId);
        
        if (isRelevant) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
      }
    });

    // Clean up on component unmount
    return () => {
      console.log('Disconnecting socket');
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [userId]);
  
  // Update socket connection status when socket changes
  useEffect(() => {
    if (socket) {
      setIsSocketConnected(socket.connected);
    }
  }, [socket]);

  // Fetch all conversations for the current user
  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`/api/messages/conversations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setConversations(response.data);
        
        // If receiverId is provided, find or create that conversation
        if (receiverId) {
          const existingConv = response.data.find(conv => 
            conv.participant1_id === receiverId || conv.participant2_id === receiverId
          );
          
          if (existingConv) {
            setSelectedConversation(existingConv);
          } else if (receiverId !== userId) {
            // Create a new conversation object
            const newConv = {
              _id: `temp_${Date.now()}`,
              participant1_id: userId,
              participant2_id: receiverId,
              last_message: '',
              last_message_time: new Date().toISOString(),
              other_participant: {
                id: receiverId,
                name: 'User', // This will be updated when messages are fetched
                email: ''
              }
            };
            setSelectedConversation(newConv);
          }
        } else if (response.data.length > 0) {
          // Select the first conversation by default
          setSelectedConversation(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [userId, receiverId]);

  // Fetch messages for the selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation || !userId) return;
      
      setLoading(true);
      try {
        const otherId = selectedConversation.other_participant.id;
        const response = await axios.get(`/api/messages/conversation/${otherId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessages(response.data);
        
        // Join the conversation room
        if (isSocketConnected) {
          socket.emit('join_conversation', { conversation_id: selectedConversation._id });
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation, userId, isSocketConnected]);

  // Scroll to bottom of messages when new messages arrive
  // Set initial message when provided
  useEffect(() => {
    if (initialMessage && !newMessage) {
      setNewMessage(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelectConversation = (conversation) => {
    // Leave previous conversation room if any
    if (selectedConversation && isSocketConnected && socket) {
      socket.emit('leave_conversation', { conversation_id: selectedConversation._id });
    }
    
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !userId) return;
    
    setSendingMessage(true);
    try {
      // Get receiver ID - either from selected conversation or directly from props
      const receiverId = selectedConversation ? 
        selectedConversation.other_participant.id : 
        receiverId;
      
      if (!receiverId) {
        throw new Error('No receiver specified');
      }
      
      // Prepare image data if any
      let imageData = null;
      if (selectedImage) {
        imageData = imagePreview;
      }
      
      // Prepare message data
      const messageData = {
        sender_id: userId,
        receiver_id: receiverId,
        content: newMessage,
        item_id: itemId || null,
        image: imageData,
        conversation_id: selectedConversation ? selectedConversation._id : null
      };
      
      // Send message via socket
      if (isSocketConnected && socket) {
        // Use a Promise to handle the socket response
        const sendMessagePromise = new Promise((resolve, reject) => {
          // Set up listeners for success and error responses
          const onMessageSent = (data) => {
            socket.off('message_sent', onMessageSent);
            socket.off('error', onError);
            resolve(data);
          };
          
          const onError = (error) => {
            socket.off('message_sent', onMessageSent);
            socket.off('error', onError);
            reject(new Error(error.message || 'Failed to send message'));
          };
          
          // Set up temporary listeners
          socket.on('message_sent', onMessageSent);
          socket.on('error', onError);
          
          // Send the message
          socket.emit('send_message', messageData);
          
          // Set a timeout in case we don't get a response
          setTimeout(() => {
            socket.off('message_sent', onMessageSent);
            socket.off('error', onError);
            reject(new Error('Timeout: No response from server'));
          }, 5000);
        });
        
        // Wait for the socket response
        await sendMessagePromise;
      } else {
        // Fallback to REST API if socket is not connected
        const formData = new FormData();
        formData.append('receiver_id', receiverId);
        formData.append('content', newMessage);
        if (itemId) formData.append('item_id', itemId);
        if (selectedImage) formData.append('image', selectedImage);
        
        const response = await axios.post('/api/messages', formData, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // Add the new message to the list if we got a response
        if (response.data && response.data.data) {
          setMessages(prevMessages => [...prevMessages, response.data.data]);
        }
      }
      
      // Show success notification
      setSnackbarMessage({
        open: true,
        message: 'Message sent successfully',
        severity: 'success'
      });
      
      // Call onMessageSent callback if provided
      if (onMessageSent) {
        onMessageSent();
      }
      
      // If this is a one-time message (from contact button), close the dialog
      if (onClose && !selectedConversation) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbarMessage({
        open: true,
        message: `Error sending message: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      
      // Call onError callback if provided
      if (onError) {
        onError(error.message || 'Failed to send message');
      }
    } finally {
      // Clear input fields
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setSendingMessage(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (imageUrl) => {
    setFullScreenImage(imageUrl);
    setImageDialogOpen(true);
  };

  // Format timestamp to readable format
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get the other participant's name in the conversation
  const getOtherParticipantName = (conversation) => {
    if (!conversation || !conversation.other_participant) return 'Unknown User';
    return conversation.other_participant.name || 'Unknown User';
  };

  // Get unread message count for a conversation
  const getUnreadCount = (conversation) => {
    return conversation.unreadCount || 0;
  };

  const handleCloseSnackbar = () => {
    setSnackbarMessage(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarMessage.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarMessage.severity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage.message}
        </Alert>
      </Snackbar>
      
      <Paper sx={{ 
        display: 'flex', 
        height: '100%', 
        overflow: 'hidden',
        boxShadow: 3,
        borderRadius: 2
      }}>
        {/* Conversations List */}
        <Box sx={{ 
          width: 300, 
          borderRight: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: 'primary.main',
            color: 'white'
          }}>
            <Typography variant="h6">Messages</Typography>
          </Box>
          
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading && conversations.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : conversations.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No conversations yet
                </Typography>
              </Box>
            ) : (
              <List>
                {conversations.map((conversation) => (
                  <ListItem 
                    key={conversation._id}
                    button
                    selected={selectedConversation && selectedConversation._id === conversation._id}
                    onClick={() => handleSelectConversation(conversation)}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge 
                        color="success" 
                        variant="dot" 
                        invisible={!conversation.other_participant.isOnline}
                      >
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">
                            {getOtherParticipantName(conversation)}
                          </Typography>
                          {getUnreadCount(conversation) > 0 && (
                            <Badge 
                              badgeContent={getUnreadCount(conversation)} 
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          noWrap
                          sx={{ maxWidth: 180 }}
                        >
                          {conversation.last_message || 'No messages yet'}
                        </Typography>
                      }
                      secondaryTypographyProps={{
                        component: 'div',
                        sx: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
        
        {/* Messages Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
          {!selectedConversation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                Select a conversation to start messaging
              </Typography>
            </Box>
          ) : (
            <>
              {/* Conversation Header */}
              <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: 'background.paper'
              }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {getOtherParticipantName(selectedConversation)}
                </Typography>
                {onClose && (
                  <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                  </IconButton>
                )}
              </Box>
              
              {/* Messages List */}
              <Box sx={{ flex: 1, overflow: 'auto', py: 2, px: 3, bgcolor: '#f5f5f5' }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message, index) => (
                    <Box
                      key={message._id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: message.sender_id === userId ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 2,
                          borderRadius: 2,
                          bgcolor: message.sender_id === userId ? 'primary.main' : 'white',
                          color: message.sender_id === userId ? 'white' : 'text.primary',
                          boxShadow: 1,
                        }}
                      >
                        {message.content && (
                          <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                            {message.content}
                          </Typography>
                        )}
                        
                        {message.image_url && (
                          <Box 
                            sx={{ mt: message.content ? 1 : 0, cursor: 'pointer' }}
                            onClick={() => handleImageClick(message.image_url)}
                          >
                            <img 
                              src={message.image_url} 
                              alt="Message attachment" 
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: 200, 
                                borderRadius: 4,
                                display: 'block'
                              }} 
                            />
                          </Box>
                        )}
                        
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
                          {formatTimestamp(message.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>
              
              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                {imagePreview && (
                  <Box sx={{ mb: 2, position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={imagePreview} 
                      alt="Selected" 
                      style={{ 
                        maxWidth: 100, 
                        maxHeight: 100, 
                        borderRadius: 4,
                        border: '1px solid #ddd'
                      }} 
                    />
                    <IconButton 
                      size="small" 
                      sx={{ 
                        position: 'absolute', 
                        top: -10, 
                        right: -10,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'error.light', color: 'white' }
                      }}
                      onClick={handleRemoveImage}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                <form onSubmit={handleSendMessage}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="icon-button-file"
                        type="file"
                        onChange={handleImageSelect}
                        ref={fileInputRef}
                      />
                      <label htmlFor="icon-button-file">
                        <IconButton 
                          color="primary" 
                          component="span"
                          disabled={sendingMessage}
                        >
                          <PhotoCameraIcon />
                        </IconButton>
                      </label>
                    </Grid>
                    <Grid item xs>
                      <TextField
                        fullWidth
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        variant="outlined"
                        size="small"
                        disabled={sendingMessage}
                      />
                    </Grid>
                    <Grid item>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        endIcon={<SendIcon />}
                        disabled={(!newMessage.trim() && !selectedImage) || sendingMessage}
                      >
                        Send
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Box>
            </>
          )}
        </Box>
      </Paper>
      
      {/* Full-screen image dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Image</Typography>
          <IconButton onClick={() => setImageDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            {fullScreenImage && (
              <img 
                src={fullScreenImage} 
                alt="Full size" 
                style={{ maxWidth: '100%', maxHeight: '70vh' }} 
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EnhancedMessageCenter;
