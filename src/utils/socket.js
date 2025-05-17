import { io } from 'socket.io-client';
import { API_URL } from '../config';

let socket;

export const initSocket = (token) => {
  if (socket) return socket;
  
  // Initialize socket connection
  socket = io(API_URL, {
    auth: {
      token
    },
    transports: ['websocket'],
    autoConnect: true
  });
  
  // Setup event listeners
  socket.on('connect', () => {
    console.log('Socket connected');
    // Authenticate with the server
    socket.emit('authenticate', { token });
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('authenticated', (data) => {
    console.log('Socket authenticated', data);
  });
  
  socket.on('authentication_error', (error) => {
    console.error('Socket authentication error:', error);
  });
  
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('join_conversation', { conversation_id: conversationId });
  }
};

export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('leave_conversation', { conversation_id: conversationId });
  }
};

export const sendMessage = (messageData) => {
  if (socket) {
    socket.emit('send_message', messageData);
  }
};

export const markMessageAsRead = (messageId, userId) => {
  if (socket) {
    socket.emit('read_message', { message_id: messageId, user_id: userId });
  }
};
