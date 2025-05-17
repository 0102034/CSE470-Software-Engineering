import React, { useState, useEffect, useRef } from 'react';
import { Container, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { getCurrentUser } from '../utils/auth';
import MessageList from '../components/Messaging/MessageList';
import ChatWindow from '../components/Messaging/ChatWindow';
import {
  getConversations,
  getConversationMessages,
  sendMessage
} from '../services/MessageService';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Handle incoming messages
    socketRef.current.on('new_message', (message) => {
      if (currentConversation && 
          (message.sender_id === currentConversation.other_participant.id || 
           message.receiver_id === currentConversation.other_participant.id)) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update conversations list
      setConversations(prev => {
        const updated = [...prev];
        const conversationIndex = updated.findIndex(conv => 
          conv.participant1_id === message.sender_id || 
          conv.participant2_id === message.sender_id
        );
        
        if (conversationIndex !== -1) {
          updated[conversationIndex] = {
            ...updated[conversationIndex],
            last_message: message.content,
            last_message_time: message.created_at
          };
        }
        
        return updated;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentConversation]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await getConversations();
        setConversations(data);
        setLoading(false);

        // If userId is provided in URL, select that conversation
        if (userId) {
          const conversation = data.find(conv => 
            conv.other_participant.id === userId
          );
          if (conversation) {
            handleSelectConversation(conversation);
          }
        }
      } catch (err) {
        setError('Failed to load conversations');
        setLoading(false);
      }
    };

    loadConversations();
  }, [userId]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (currentConversation) {
        try {
          const data = await getConversationMessages(currentConversation.other_participant.id);
          setMessages(data);
        } catch (err) {
          setError('Failed to load messages');
        }
      }
    };

    loadMessages();
  }, [currentConversation]);

  const handleSelectConversation = async (conversation) => {
    setCurrentConversation(conversation);
    // Update URL without reloading
    navigate(`/messages/${conversation.other_participant.id}`, { replace: true });
  };

  const handleSendMessage = async (content, imageFile = null) => {
    if (!currentConversation) return;

    try {
      const message = await sendMessage(
        currentConversation.other_participant.id,
        content,
        null,
        imageFile
      );

      setMessages(prev => [...prev, message]);
      
      // Update conversation in the list
      setConversations(prev => {
        const updated = [...prev];
        const index = updated.findIndex(conv => conv._id === currentConversation._id);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            last_message: content,
            last_message_time: new Date().toISOString()
          };
        }
        return updated;
      });

    } catch (err) {
      setError('Failed to send message');
    }
  };

  if (loading) {
    return (
      <Container>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <MessageList
              conversations={conversations}
              activeConversation={currentConversation}
              onSelectConversation={handleSelectConversation}
              currentUserId={currentUser?.id}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
            {currentConversation ? (
              <ChatWindow
                messages={messages}
                currentUser={currentUser}
                otherUser={currentConversation.other_participant}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <Typography variant="h6" align="center" sx={{ mt: 4 }}>
                Select a conversation to start messaging
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Messages;
