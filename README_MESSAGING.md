# Real-Time Messaging System Documentation

## Overview

This document provides details on the real-time messaging system implemented for the BRACU Circle platform. The system enables users to contact post creators in the Marketplace, Ride Share, and Bus Booking sections, with real-time updates and message history.

## Features

- **Real-time messaging** using WebSockets (Flask-SocketIO)
- **Contact verification** - Only non-creators can initiate contact
- **Message storage** - All messages stored in the database
- **Image support** - Users can send both text and images
- **User profile integration** - Conversations accessible from user profiles
- **Post-specific conversations** - Messages linked to specific marketplace items or ride shares

## Technical Implementation

### Backend Components

1. **Flask-SocketIO Integration**
   - WebSocket server for real-time communication
   - Event handlers for message sending/receiving

2. **Message Model**
   - MongoDB schema for storing messages
   - Fields: sender_id, receiver_id, post_id, post_type, content, attachment_url, timestamp

3. **Message Controller**
   - REST API endpoints for message history
   - Conversation management

### Frontend Components

1. **Socket Utility**
   - Connection management
   - Event handling

2. **Message Components**
   - `MessageChat.js` - Chat interface component
   - `ContactButton.js` - Button for initiating contact
   - `MessageActivity.js` - User profile message center

## Usage Flow

1. **Initiating Contact**
   - User views a marketplace item or ride share post
   - If user is not the creator, they see a "Contact" button
   - Clicking the button opens a dialog to send the first message

2. **Messaging**
   - After initial contact, a conversation thread is created
   - Both users can send text messages and images
   - Messages appear in real-time for both parties

3. **Message Activity**
   - Users can view all their conversations in their profile
   - Selecting a conversation opens the full chat history

## API Endpoints

- `GET /api/messages/conversations` - Get all conversations for current user
- `GET /api/messages/conversations/post/:post_type/:post_id` - Get conversations for a specific post
- `GET /api/messages/messages/:other_user_id` - Get messages between current user and another user
- `POST /api/messages/messages/post/:post_type/:post_id/user/:user_id` - Send initial message

## WebSocket Events

- `connect` - Client connects to the server
- `authenticate` - Client authenticates with JWT token
- `join_conversation` - Client joins a conversation room
- `send_message` - Client sends a message
- `new_message` - Server broadcasts a new message
- `message_read` - Server notifies when a message is read

## Installation and Setup

### Backend Dependencies

```
Flask-SocketIO==5.3.6
eventlet==0.33.3
```

### Frontend Dependencies

```
socket.io-client==4.8.1
```

### Running the Messaging System

1. The messaging system is integrated with the main application. Follow the setup instructions in the main README.md file to set up the backend and frontend.

2. The backend server will automatically start the WebSocket server when you run:
   ```bash
   python run.py
   ```
   The server will use the default Flask-SocketIO port (typically 5000) or any available port if 5000 is in use.

3. The frontend is configured to automatically connect to the backend regardless of which port it's running on.

4. To test if the messaging system is working properly:
   - Log in with two different user accounts in separate browser windows/tabs
   - Navigate to a ride share or bus booking post created by one of the users
   - From the other user account, click the "Contact" button to start a conversation
   - Messages should appear in real-time for both users

## Testing

Use the provided test script to verify WebSocket functionality:

```bash
python test_socket.py
```
