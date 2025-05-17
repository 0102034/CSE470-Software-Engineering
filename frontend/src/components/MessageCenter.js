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
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const MessageCenter = ({ userId }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch all conversations for the current user
  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/messages/conversations/${userId}`);
        setConversations(response.data);
        // Select the first conversation by default if available
        if (response.data.length > 0) {
          setSelectedConversation(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  // Fetch messages for the selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/messages/${selectedConversation._id}`);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedConversation) {
      fetchMessages();
      
      // Set up polling for new messages (simulating real-time)
      const intervalId = setInterval(fetchMessages, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [selectedConversation]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSendingMessage(true);
    try {
      const response = await axios.post('http://localhost:5000/api/messages', {
        conversationId: selectedConversation._id,
        senderId: userId,
        receiverId: selectedConversation.participants.find(p => p._id !== userId)?._id,
        content: newMessage,
      });
      
      // Add the new message to the list
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
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
    if (!conversation || !conversation.participants) return 'Unknown User';
    const otherParticipant = conversation.participants.find(p => p._id !== userId);
    return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User';
  };

  // Get unread message count for a conversation
  const getUnreadCount = (conversation) => {
    return conversation.unreadCount || 0;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Messages
      </Typography>
      
      <Paper sx={{ display: 'flex', height: 500, overflow: 'hidden' }}>
        {/* Conversations List */}
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          {loading && conversations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ p: 2 }}>
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
                  selected={selectedConversation?._id === conversation._id}
                  onClick={() => handleSelectConversation(conversation)}
                  sx={{
                    bgcolor: selectedConversation?._id === conversation._id ? 'action.selected' : 'inherit',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      color="error"
                      badgeContent={getUnreadCount(conversation)}
                      invisible={getUnreadCount(conversation) === 0}
                    >
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getOtherParticipantName(conversation)}
                    secondary={conversation.lastMessage?.content || 'Start a conversation'}
                    primaryTypographyProps={{
                      fontWeight: getUnreadCount(conversation) > 0 ? 'bold' : 'normal',
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      fontWeight: getUnreadCount(conversation) > 0 ? 'bold' : 'normal',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        
        {/* Messages Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
          {!selectedConversation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                Select a conversation to start messaging
              </Typography>
            </Box>
          ) : (
            <>
              {/* Conversation Header */}
              <Box sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {getOtherParticipantName(selectedConversation)}
                </Typography>
              </Box>
              
              {/* Messages List */}
              <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
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
                        justifyContent: message.senderId === userId ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 2,
                          borderRadius: 2,
                          bgcolor: message.senderId === userId ? 'primary.main' : 'grey.100',
                          color: message.senderId === userId ? 'white' : 'text.primary',
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
                          {formatTimestamp(message.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>
              
              {/* Message Input */}
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <form onSubmit={handleSendMessage}>
                  <Grid container spacing={1}>
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
                        disabled={!newMessage.trim() || sendingMessage}
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
    </Box>
  );
};

export default MessageCenter;
