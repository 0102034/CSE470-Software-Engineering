import axios from 'axios';
import io from 'socket.io-client';
import { API_URL } from '../config';

// Socket.io instance
let socket = null;

// Connect to the WebSocket server
const connectSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    
    // Connect to the API server
    socket = io(API_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],  // Try both websocket and polling
      autoConnect: true,
      withCredentials: true,  // Enable credentials
      extraHeaders: {  // Add CORS headers
        'Access-Control-Allow-Origin': 'http://localhost:3000'
      }
    });
    
    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Authenticate with the server
      socket.emit('authenticate', { token });
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    socket.on('authenticated', (data) => {
      console.log('Authenticated with WebSocket server', data);
    });
    
    socket.on('authentication_error', (error) => {
      console.error('WebSocket authentication error:', error);
    });
  }
  
  return socket;
};

// Disconnect from the WebSocket server
const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join a conversation room
const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('join_conversation', { conversation_id: conversationId });
  }
};

// Leave a conversation room
const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('leave_conversation', { conversation_id: conversationId });
  }
};

// Send a message via WebSocket
const sendMessageSocket = (messageData) => {
  if (socket) {
    socket.emit('send_message', messageData);
  }
};

// Mark a message as read
const markMessageRead = (messageId, userId) => {
  if (socket) {
    socket.emit('read_message', { message_id: messageId, user_id: userId });
  }
};

// Get all conversations for a user
const getConversations = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/api/messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// Get conversations related to a specific post
const getConversationsByPost = async (postType, postId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/api/messages/conversations/post/${postType}/${postId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations by post:', error);
    throw error;
  }
};

// Get messages for a specific conversation
const getConversationMessages = async (otherUserId, postId = null) => {
  try {
    const token = localStorage.getItem('token');
    let url = `${API_URL}/api/messages/messages/${otherUserId}`;
    
    // Add post_id as query parameter if provided
    if (postId) {
      url += `?post_id=${postId}`;
    }
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Send a message via HTTP (with optional image)
const sendMessage = async (messageData, imageFile = null) => {
  try {
    const token = localStorage.getItem('token');
    
    if (imageFile) {
      // Convert image file to base64 for socket transmission
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => {
          // Add the base64 image to the message data
          messageData.attachment = reader.result;
          
          // Send via socket
          if (socket) {
            socket.emit('send_message', messageData);
            resolve({ status: 'success', message: 'Message sent via socket' });
          } else {
            reject(new Error('Socket not connected'));
          }
        };
        reader.onerror = error => reject(error);
      });
    } else {
      // Send initial message via HTTP API
      const { post_type, post_id, receiver_id } = messageData;
      
      const response = await axios.post(`${API_URL}/api/messages/messages/post/${post_type}/${post_id}/user/${receiver_id}`, 
        {
          content: messageData.content,
          attachment_url: messageData.attachment_url
        }, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const messageService = {
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendMessageSocket,
  markMessageRead,
  getConversations,
  getConversationsByPost,
  getConversationMessages,
  sendMessage
};
