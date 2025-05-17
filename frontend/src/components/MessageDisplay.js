import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { io } from 'socket.io-client';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SearchIcon from '@mui/icons-material/Search';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import InfoIcon from '@mui/icons-material/Info';
import LinkIcon from '@mui/icons-material/Link';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  Divider,
  Dialog,
  DialogContent
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';

const MessageDisplay = ({ userId }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;
    
    // Connect to socket server
    const socketInstance = io('http://localhost:5000');
    setSocket(socketInstance);
    
    // Socket event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsSocketConnected(true);
      
      // Register user with socket
      socketInstance.emit('register_user', { user_id: userId });
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsSocketConnected(false);
    });
    
    // Clean up on unmount
    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.disconnect();
    };
  }, [userId]);
  
  // Open the delete confirmation dialog
  const openDeleteDialog = (conversation) => {
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  // Close the delete confirmation dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };
  
  // Function to hide a conversation for the current user (soft deletion)
  const handleDeleteConversation = () => {
    if (!conversationToDelete) return;
    
    const conversationId = conversationToDelete._id;
    
    // Close the dialog
    closeDeleteDialog();
    
    // Use the updated endpoint that now implements soft deletion
    axios.delete(`/api/messages/conversations/${conversationId}`)
      .then(response => {
        if (response.data && response.data.status === 'success') {
          // Remove the conversation from the list in the UI
          setConversations(prevConversations => 
            prevConversations.filter(conv => conv._id !== conversationId)
          );
          
          // If this was the selected conversation, clear it
          if (selectedConversation && selectedConversation._id === conversationId) {
            setSelectedConversation(null);
            setMessages([]);
          }
          
          showSnackbar('Conversation removed from your messages', 'success');
          
          // If both users have hidden the conversation, show a different message
          if (response.data.both_hidden) {
            showSnackbar('Conversation has been removed for both users', 'info');
          }
        }
      })
      .catch(error => {
        console.error('Error removing conversation:', error);
        showSnackbar('Failed to remove conversation. Please try again.', 'error');
      });
  };
  
  // Socket.IO event handlers
  useEffect(() => {
    // If no socket or userId, or if socket isn't connected yet, don't proceed
    if (!socket || !userId || !isSocketConnected) return;
    
    // Listen for new messages
    socket.on('new_message', (message) => {
      console.log('New message received:', message);
      
      // PRIVACY FIX: Only process messages if they are meant for the current user
      // This ensures users can only see messages they sent or received
      const isMessageForCurrentUser = message.sender_id === userId || message.receiver_id === userId;
      
      if (!isMessageForCurrentUser) {
        console.log('Message not for current user, ignoring');
        return;
      }
      
      // If this is a new message in a conversation that was previously deleted,
      // we need to refresh the conversations list to show it again
      if (!selectedConversation || 
          (selectedConversation && 
           selectedConversation.other_participant?.id !== message.sender_id && 
           selectedConversation.other_participant?.id !== message.receiver_id)) {
        console.log('Received message for a conversation not currently selected, refreshing conversations list');
        fetchConversations();
        
        // Show a notification to the user that they have a new message
        showSnackbar(`New message from ${message.sender_name || 'someone'}`, 'info');
      }
      
      // Add message to the list if it belongs to the current conversation
      if (selectedConversation) {
        const isForCurrentConversation = (
          (message.sender_id === userId && message.receiver_id === selectedConversation.other_participant?.id) ||
          (message.sender_id === selectedConversation.other_participant?.id && message.receiver_id === userId)
        );
        
        if (isForCurrentConversation) {
          // Add the new message to the messages list
          setMessages(prevMessages => {
            // Check if the message is already in the list to prevent duplicates
            const messageExists = prevMessages.some(msg => 
              msg._id === message._id || 
              (msg.content === message.content && 
               msg.sender_id === message.sender_id && 
               Math.abs(new Date(msg.created_at) - new Date(message.created_at)) < 5000)
            );
            
            if (messageExists) {
              return prevMessages;
            }
            return [...prevMessages, message];
          });
          
          // Mark the message as read if it's from the other user
          if (message.sender_id === selectedConversation.other_participant?.id) {
            markConversationAsRead(selectedConversation._id);
          }
        } else {
          // If it's a new message not in the current conversation, update the unread status
          setConversations(prevConversations => {
            return prevConversations.map(conv => {
              // Check if this message belongs to this conversation
              const isForThisConversation = 
                (conv.other_participant?.id === message.sender_id && message.receiver_id === userId) ||
                (conv.other_participant?.id === message.receiver_id && message.sender_id === userId);
              
              if (isForThisConversation) {
                return {
                  ...conv,
                  last_message: message.content,
                  last_message_time: message.created_at,
                  unread: message.sender_id !== userId, // Mark as unread if the sender is not the current user
                  unread_count: conv.unread_count ? conv.unread_count + 1 : 1
                };
              }
              return conv;
            });
          });
        }
      } else {
        // No conversation selected, just update the conversations list
        fetchConversations();
      }
    });
    
    // Listen for message read status updates
    socket.on('message_read', (data) => {
      console.log('Message read:', data);
      
      // Update message read status in the current conversation
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg._id === data.message_id ? { ...msg, read: true } : msg
        )
      );
    });
    
    // Listen for conversation read status updates
    socket.on('conversation_read', (data) => {
      console.log('Conversation read:', data);
      
      // Update all messages in the conversation to read
      if (selectedConversation && selectedConversation._id === data.conversation_id) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.sender_id === userId && !msg.read ? { ...msg, read: true } : msg
          )
        );
      }
    });
    
    // Listen for socket errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      showSnackbar(error.message || 'An error occurred', 'error');
    });
    
    // Clean up event listeners when component unmounts or dependencies change
    return () => {
      socket.off('new_message');
      socket.off('message_read');
      socket.off('conversation_read');
      socket.off('error');
    };
  }, [socket, userId, selectedConversation, isSocketConnected]);
  
  // Fetch conversations whenever the component mounts or userId changes
  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);
  
  // Fetch messages whenever the selected conversation changes
  useEffect(() => {
    if (selectedConversation && selectedConversation._id) {
      fetchMessages(selectedConversation._id);
      
      // Mark conversation as read when selected
      markConversationAsRead(selectedConversation._id);
    }
  }, [selectedConversation?._id]);
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Fetch all conversations for the current user
  const fetchConversations = async () => {
    if (!userId) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      // Get the current user ID from token for comparison
      let currentUserId;
      try {
        const decoded = jwt_decode(token);
        currentUserId = decoded.sub || decoded.user_id;
      } catch (e) {
        console.error('Error decoding token:', e);
      }
      
      // If we're viewing someone else's profile, we need to fetch conversations with that user
      const endpoint = currentUserId !== userId 
        ? `/api/messages/conversations/with/${userId}` 
        : '/api/messages/conversations';
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        setConversations(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations. Please try again later.');
      setLoading(false);
    }
  };
  
  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    
    setLoadingMessages(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      const response = await axios.get(`/api/messages/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        setMessages(response.data);
        setLoadingMessages(false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again later.');
      setLoadingMessages(false);
    }
  };
  
  // Show snackbar message
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };
  
  // Handle selecting a conversation
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setLoading(true);
    
    // Fetch messages for the selected conversation
    axios.get(`/api/messages/conversations/${conversation._id}`)
      .then(response => {
        if (response.data && response.data.status === 'success') {
          setMessages(response.data.data);
          
          // Mark conversation as read if it has unread messages
          if (conversation.unread) {
            markConversationAsRead(conversation._id);
          }
        }
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // Mark conversation as read
  const markConversationAsRead = (conversationId) => {
    axios.put(`/api/messages/conversations/${conversationId}/read`)
      .then(response => {
        if (response.data && response.data.status === 'success') {
          // Update conversations list to reflect read status
          setConversations(prevConversations => 
            prevConversations.map(conv => 
              conv._id === conversationId ? { ...conv, unread: false, unread_count: 0 } : conv
            )
          );
          
          // Update selected conversation if it's the one being marked as read
          if (selectedConversation && selectedConversation._id === conversationId) {
            setSelectedConversation(prev => ({ ...prev, unread: false, unread_count: 0 }));
          }
        }
      })
      .catch(error => {
        console.error('Error marking conversation as read:', error);
      });
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
  };
  
  // Handle file selection
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Create new attachments with preview
      const newAttachments = files.map(file => ({
        id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        name: file.name,
        type: file.type,
        size: file.size,
        preview: URL.createObjectURL(file)
      }));
      
      setAttachments([...attachments, ...newAttachments]);
    }
  };
  
  // Handle removing an attachment
  const handleRemoveAttachment = (attachmentId) => {
    const updatedAttachments = attachments.filter(attachment => attachment.id !== attachmentId);
    setAttachments(updatedAttachments);
  };
  
  // Handle sending a message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if ((!newMessage.trim() && attachments.length === 0) || !selectedConversation || sendingMessage) return;
    
    setSendingMessage(true);
    setError(null);
    
    // Store the message content and clear the input field immediately to prevent double-sending
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setSendingMessage(false);
        return;
      }
      
      // Prepare message data
      const messageData = {
        receiver_id: selectedConversation.other_participant.id,
        content: messageContent,
        conversation_id: selectedConversation._id
      };
      
      // Create a temporary message to show immediately in the UI
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        sender_id: userId,
        receiver_id: selectedConversation.other_participant.id,
        content: messageContent,
        created_at: new Date().toISOString(),
        read: false,
        pending: true // Mark as pending until confirmed by server
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      let response;
      
      // Handle attachments if any
      if (attachments.length > 0) {
        setUploadingAttachment(true);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('receiver_id', selectedConversation.other_participant.id);
        formData.append('content', messageContent);
        formData.append('conversation_id', selectedConversation._id);
        
        // Append each attachment
        attachments.forEach(attachment => {
          formData.append('image', attachment.file);
        });
        
        // Send message with attachment
        response = await axios.post('/api/messages/upload', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Send text-only message
        response = await axios.post('/api/messages', messageData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (response.data && response.data.status === 'success') {
        // Clear attachments (input already cleared at the start of the function)
        setAttachments([]);
        
        // Update conversation with new message
        updateConversationWithNewMessage(messageContent);
        
        // Replace the temporary message with the confirmed one from the server
        if (response.data.data) {
          setMessages(prevMessages => {
            // Check if the message is already in the list (excluding the temp message)
            const existingMessages = prevMessages.filter(msg => msg._id !== tempMessage._id);
            const serverMessage = response.data.data;
            
            // Check if this is a duplicate of an existing message
            if (isDuplicateMessage(serverMessage, existingMessages)) {
              // Remove the temp message and don't add the server one
              return existingMessages;
            }
            
            // Replace the temp message with the server one
            return prevMessages.map(msg => 
              msg._id === tempMessage._id ? { ...serverMessage, pending: false } : msg
            );
          });
        }
        
        // If the conversation was just created, refresh conversations list
        if (!selectedConversation._id.startsWith('temp-')) {
          fetchConversations();
        }
      } else {
        // Remove the temporary message if there was an error
        setMessages(prevMessages => prevMessages.filter(msg => msg._id !== tempMessage._id));
        throw new Error(response.data?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Error sending message. Please try again.', 'error');
    } finally {
      setSendingMessage(false);
      setUploadingAttachment(false);
    }
  };
  
  // Helper function to update conversation with new message
  const updateConversationWithNewMessage = (messageContent) => {
    if (!selectedConversation) return;
    
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv._id === selectedConversation._id 
          ? { 
              ...conv, 
              last_message: messageContent,
              last_message_time: new Date().toISOString()
            } 
          : conv
      )
    );
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today, show time only
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // This week, show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older, show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  // Check if a message is a duplicate
  const isDuplicateMessage = (newMsg, existingMessages) => {
    return existingMessages.some(msg => 
      msg._id === newMsg._id || 
      (msg.content === newMsg.content && 
       msg.sender_id === newMsg.sender_id && 
       Math.abs(new Date(msg.created_at) - new Date(newMsg.created_at)) < 5000)
    );
  };
  
  // Generate color from string
  const stringToColor = (string) => {
    if (!string) return '#6573c3'; // Default color
    
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };
  
  // Format display name to show username instead of email
  const formatDisplayName = (name) => {
    if (!name) return '';
    
    // If it's an email, extract the username part
    if (name.includes('@')) {
      return name.split('@')[0];
    }
    
    // If it's a full name, return just the first name
    if (name.includes(' ')) {
      return name.split(' ')[0];
    }
    
    // Otherwise return the name as is
    return name;
  };
  
  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Conversations List */}
      <Paper 
        elevation={0} 
        sx={{ 
          width: 320, 
          height: '100%', 
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Messages</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TextField
              placeholder="Search conversations..."
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mr: 1 }}
            />
            <Tooltip title="Refresh">
              <span>
                <IconButton size="small" onClick={fetchConversations} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
        
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
          {conversations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" component="div">
                No conversations yet. Start chatting with users from the Marketplace, Lost & Found, or Ride Share pages.
              </Typography>
            </Box>
          ) : (
            conversations.map(conversation => (
              <ListItem
                key={conversation._id}
                button
                selected={selectedConversation?._id === conversation._id}
                onClick={() => handleSelectConversation(conversation)}
                sx={{ 
                  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                  bgcolor: selectedConversation?._id === conversation._id ? 'rgba(0, 0, 0, 0.04)' : 
                          conversation.unread ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.08)'
                  },
                  fontWeight: conversation.unread ? 'bold' : 'normal',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the ListItem click
                      openDeleteDialog(conversation);
                    }}
                    size="small"
                    color="error"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: stringToColor(conversation.other_participant?.name),
                      width: 48,
                      height: 48
                    }}
                  >
                    {conversation.other_participant?.name?.charAt(0).toUpperCase() || <PersonIcon />}
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                  {/* Primary content */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography 
                      variant="subtitle1" 
                      component="span"
                      sx={{ 
                        fontWeight: conversation.unread ? 'bold' : 'medium',
                        maxWidth: '70%', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {conversation.other_participant?.name && !conversation.other_participant.name.includes('@') ? 
                        conversation.other_participant.name : 
                        (conversation.other_participant?.email ? 
                          conversation.other_participant.email.split('@')[0] : 'Unknown User')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {formatTimestamp(conversation.last_message_time)}
                    </Typography>
                  </Box>
                  
                  {/* Secondary content */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography 
                      variant="body2" 
                      component="span"
                      sx={{ 
                        color: conversation.unread ? 'primary.main' : 'text.secondary',
                        fontWeight: conversation.unread ? 'medium' : 'normal',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mr: 1
                      }}
                    >
                      {conversation.last_message || 'No messages yet'}
                    </Typography>
                    {conversation.unread && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          flexShrink: 0
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
      
      {/* Message Display */}
      <Paper 
        elevation={0} 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          bgcolor: 'rgba(0, 0, 0, 0.02)'
        }}
      >
        {selectedConversation ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Conversation Header */}
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)', 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'background.paper'
            }}>
              <Avatar 
                sx={{ 
                  bgcolor: stringToColor(selectedConversation.other_participant?.name),
                  width: 40,
                  height: 40,
                  mr: 2
                }}
              >
                {selectedConversation.other_participant?.name?.charAt(0).toUpperCase() || <PersonIcon />}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: '#9c27b0' }}>
                  {selectedConversation.other_participant?.name && !selectedConversation.other_participant.name.includes('@') ? 
                    selectedConversation.other_participant.name : 
                    (selectedConversation.other_participant?.email ? 
                      selectedConversation.other_participant.email.split('@')[0] : 'Unknown User')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedConversation.other_participant?.email || ''}
                </Typography>
              </Box>
            </Box>
            
            {/* Messages Area */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              p: 2,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {loadingMessages ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  p: 3
                }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" component="div">No messages yet</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }} component="div">
                    Start the conversation by sending a message below.
                  </Typography>
                </Box>
              ) : (
                messages.map((message, index) => {
                  // Determine if the message is from the current user
                  const isCurrentUser = message.sender_id === userId;
                  
                  // For display purposes, we want to show the other user's name for sender messages
                  // and "You" for the current user's messages
                  // Prioritize using actual names instead of emails
                  const senderName = isCurrentUser ? "You" : 
                    (selectedConversation.other_participant?.name && !selectedConversation.other_participant.name.includes('@') ? 
                      selectedConversation.other_participant.name : 
                      (message.sender_name && !message.sender_name.includes('@') ? 
                        message.sender_name : 
                        (selectedConversation.other_participant?.email ? 
                          selectedConversation.other_participant.email.split('@')[0] : 
                          (message.sender_email ? 
                            message.sender_email.split('@')[0] : "Unknown User"))));
                  
                  // Check if we need to show a date separator
                  const showDate = index === 0 || 
                    new Date(message.created_at).toDateString() !== 
                    new Date(messages[index - 1].created_at).toDateString();
                  
                  return (
                    <React.Fragment key={`${message._id}-${index}`}>
                      {showDate && (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            my: 2 
                          }}
                        >
                          <Chip 
                            label={new Date(message.created_at).toLocaleDateString()} 
                            size="small"
                            sx={{ bgcolor: 'rgba(0, 0, 0, 0.08)' }}
                          />
                        </Box>
                      )}
                      
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                          mb: 1.5
                        }}
                      >
                        <Box 
                          sx={{ 
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                            alignItems: 'flex-end'
                          }}
                        >
                          {!isCurrentUser && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1 }}>
                              <Avatar 
                                sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  mb: 0.5,
                                  bgcolor: stringToColor(selectedConversation.other_participant?.name)
                                }}
                              >
                                {selectedConversation.other_participant?.name?.charAt(0).toUpperCase() || <PersonIcon />}
                              </Avatar>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'medium', color: '#9c27b0' }}>
                                {formatDisplayName(message.sender_name) || formatDisplayName(selectedConversation.other_participant?.name) || 'User'}
                              </Typography>
                            </Box>
                          )}
                          
                          <Box 
                            sx={{ 
                              // Sender messages (from other user) are purple and on the left
                              // Receiver messages (from current user) are blue and on the right
                              bgcolor: isCurrentUser ? '#1976d2' : '#9c27b0',
                              color: 'white',
                              borderRadius: isCurrentUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              p: 1.5,
                              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
                              position: 'relative',
                              opacity: message.pending ? 0.7 : 1,
                              border: message.item_id ? '2px solid #ffeb3b' : 'none'
                            }}
                          >
                            {/* If this is a one-time contact message (has item_id), show a special header */}
                            {message.item_id && (
                              <Box sx={{ 
                                mb: 1, 
                                pb: 1, 
                                borderBottom: '1px dashed rgba(255,255,255,0.5)',
                                bgcolor: 'rgba(255, 235, 59, 0.15)',
                                borderRadius: '8px',
                                p: 1
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                  {message.item_type === 'marketplace' ? <ShoppingBagIcon fontSize="small" sx={{ mr: 0.5, color: '#ffeb3b' }} /> : 
                                   message.item_type === 'ride' ? <DirectionsCarIcon fontSize="small" sx={{ mr: 0.5, color: '#ffeb3b' }} /> : 
                                   message.item_type === 'lost' ? <SearchIcon fontSize="small" sx={{ mr: 0.5, color: '#ffeb3b' }} /> : 
                                   message.item_type === 'found' ? <FindInPageIcon fontSize="small" sx={{ mr: 0.5, color: '#ffeb3b' }} /> : 
                                   <InfoIcon fontSize="small" sx={{ mr: 0.5, color: '#ffeb3b' }} />}
                                  <Typography variant="caption" component="div" sx={{ fontWeight: 'bold' }}>
                                    {message.item_type === 'marketplace' ? 'Marketplace: ' : 
                                     message.item_type === 'ride' ? 'Ride Share: ' : 
                                     message.item_type === 'lost' ? 'Lost Item: ' : 
                                     message.item_type === 'found' ? 'Found Item: ' : 'Item: '}
                                    <span style={{ color: '#ffeb3b' }}>{message.item_title || 'Untitled Item'}</span>
                                  </Typography>
                                </Box>
                                {/* Add a link to view the item if available */}
                                {message.item_id && (
                                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                    <Button 
                                      variant="outlined" 
                                      size="small" 
                                      sx={{ 
                                        color: 'white', 
                                        borderColor: 'rgba(255,255,255,0.5)',
                                        fontSize: '0.7rem',
                                        '&:hover': {
                                          borderColor: 'white',
                                          backgroundColor: 'rgba(255,255,255,0.1)'
                                        }
                                      }}
                                      onClick={() => {
                                        // Format the URL correctly based on item type
                                        let url = '/';
                                        if (message.item_type === 'marketplace') {
                                          url = `/marketplace?item=${message.item_id}`;
                                        } else if (message.item_type === 'ride') {
                                          url = `/ride-booking?ride=${message.item_id}`;
                                        } else if (message.item_type === 'lost' || message.item_type === 'found') {
                                          url = `/lost-found?item=${message.item_id}`;
                                        } else {
                                          // Default fallback - just go to the appropriate section
                                          if (message.item_type) {
                                            url = `/${message.item_type}`;
                                          }
                                        }
                                        window.open(url, '_blank');
                                      }}
                                    >
                                      View {message.item_type === 'marketplace' ? 'Item' : 
                                            message.item_type === 'ride' ? 'Ride' : 
                                            message.item_type === 'lost' ? 'Lost Item' : 
                                            message.item_type === 'found' ? 'Found Item' : 'Item'}
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            )}
                            
                            {message.content && (
                              <Typography variant="body1" component="div">{message.content}</Typography>
                            )}
                            
                            {message.image_url && (
                              <Box 
                                component="img"
                                src={message.image_url}
                                alt="Attachment"
                                sx={{ 
                                  maxWidth: '100%', 
                                  maxHeight: 200, 
                                  borderRadius: 1,
                                  mt: message.content ? 1 : 0
                                }}
                              />
                            )}
                            
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block', 
                                textAlign: 'right', 
                                mt: 0.5,
                                color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                              }}
                            >
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {message.pending && ' • Sending...'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>
            
            {/* Message Input */}
            <Box sx={{ 
              p: 2, 
              borderTop: '1px solid rgba(0, 0, 0, 0.12)', 
              bgcolor: 'background.paper'
            }}>
              <form onSubmit={handleSendMessage}>
                {attachments.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    mb: 2
                  }}>
                    {attachments.map((attachment, index) => (
                      <Box 
                        key={`${attachment.id}-${index}`}
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          position: 'relative',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        <Box
                          component="img"
                          src={attachment.preview}
                          alt={attachment.name}
                          sx={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                        />
                        <IconButton 
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: -8, 
                            right: -8,
                            bgcolor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.2)',
                            '&:hover': {
                              bgcolor: 'background.paper'
                            }
                          }}
                          onClick={() => handleRemoveAttachment(attachment.id)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Attach file">
                    <span>
                      <IconButton 
                        color="primary"
                        onClick={() => fileInputRef.current.click()}
                        disabled={sendingMessage}
                        type="button"
                      >
                        <AttachFileIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileSelect}
                    multiple
                  />
                  
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    variant="outlined"
                    size="small"
                    value={newMessage}
                    onChange={handleInputChange}
                    disabled={sendingMessage}
                    sx={{ 
                      mx: 1,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '20px'
                      }
                    }}
                  />
                  
                  <Tooltip title="Send message">
                    <span>
                      <IconButton 
                        color="primary" 
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && attachments.length === 0) || sendingMessage}
                        type="submit"
                      >
                        {sendingMessage ? (
                          <CircularProgress size={24} thickness={4} />
                        ) : (
                          <SendIcon />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </form>
            </Box>
          </Box>
        ) : (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 3,
            bgcolor: 'rgba(0, 0, 0, 0.02)'
          }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" component="div">No conversation selected</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }} component="div">
              Select a conversation from the list or start a new one by contacting users from the Marketplace, Lost & Found, or Ride Share pages.
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Custom Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: '8px',
            maxWidth: '400px',
            width: '100%'
          }
        }}
      >
        <Box sx={{ 
          p: 3, 
          textAlign: 'center',
          background: 'linear-gradient(to right, #ff9a9e, #fad0c4)',
          borderRadius: '8px 8px 0 0',
          color: 'white'
        }}>
          <CloseIcon sx={{ fontSize: 50, mb: 1, color: 'white' }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            Remove Conversation
          </Typography>
        </Box>
        
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" component="div" sx={{ mb: 2 }}>
            Are you sure you want to remove your conversation with
            <Typography component="span" sx={{ fontWeight: 'bold', color: '#9c27b0', mx: 1 }}>
              {formatDisplayName(conversationToDelete?.other_participant?.name) || 'this user'}
            </Typography>?
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This will remove the conversation from your messages list. If the other person sends you a new message, the conversation will reappear.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={closeDeleteDialog}
              sx={{ 
                borderRadius: '20px', 
                px: 3,
                borderColor: '#9e9e9e',
                color: '#9e9e9e',
                '&:hover': {
                  borderColor: '#757575',
                  backgroundColor: 'rgba(0,0,0,0.04)'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleDeleteConversation}
              sx={{ 
                borderRadius: '20px', 
                px: 3,
                background: 'linear-gradient(45deg, #ff5252, #ff1744)',
                boxShadow: '0 4px 8px rgba(255, 23, 68, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #ff1744, #d50000)',
                  boxShadow: '0 6px 10px rgba(255, 23, 68, 0.4)'
                }
              }}
            >
              Remove Conversation
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MessageDisplay;
