from flask import request
from flask_socketio import emit, join_room, leave_room
from . import socketio
from bson import ObjectId
from datetime import datetime
from .models.message import Message
from flask_jwt_extended import decode_token
import json
import base64
import os

# Store active users with their socket IDs
active_users = {}

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected:', request.sid)
    # Remove user from active users
    for user_id, sid in active_users.items():
        if sid == request.sid:
            del active_users[user_id]
            break

@socketio.on('authenticate')
def handle_authenticate(data):
    """Authenticate user and store their socket ID"""
    try:
        token = data.get('token')
        if not token:
            emit('authentication_error', {'message': 'No token provided'})
            return
            
        # Decode token to get user ID
        decoded_token = decode_token(token)
        user_id = decoded_token['sub']
        
        # Store user's socket ID
        active_users[user_id] = request.sid
        
        # Join a room specific to this user
        join_room(f'user_{user_id}')
        
        emit('authenticated', {'user_id': user_id})
        print(f'User {user_id} authenticated with socket ID {request.sid}')
    except Exception as e:
        emit('authentication_error', {'message': str(e)})

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join a specific conversation room"""
    conversation_id = data.get('conversation_id')
    if conversation_id:
        join_room(f'conversation_{conversation_id}')
        emit('joined_conversation', {'conversation_id': conversation_id})

@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """Leave a specific conversation room"""
    conversation_id = data.get('conversation_id')
    if conversation_id:
        leave_room(f'conversation_{conversation_id}')

@socketio.on('send_message')
def handle_send_message(data):
    """Handle new message and broadcast to recipients"""
    try:
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        content = data.get('content')
        post_id = data.get('post_id')
        post_type = data.get('post_type')  # 'marketplace' or 'ride_share'
        attachment = data.get('attachment')  # Base64 encoded image if any
        
        if not all([sender_id, receiver_id, content, post_id, post_type]):
            emit('message_error', {'message': 'Missing required fields'})
            return
        
        # Process attachment if present
        attachment_url = None
        if attachment:
            try:
                # Extract the base64 data after the comma
                if ',' in attachment:
                    base64_data = attachment.split(',')[1]
                else:
                    base64_data = attachment
                
                # Decode base64 data
                image_data = base64.b64decode(base64_data)
                
                # Create uploads directory if it doesn't exist
                uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
                if not os.path.exists(uploads_dir):
                    os.makedirs(uploads_dir)
                
                # Generate a unique filename
                timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                filename = f'message_{sender_id}_{timestamp}.jpg'
                filepath = os.path.join(uploads_dir, filename)
                
                # Save the image
                with open(filepath, 'wb') as f:
                    f.write(image_data)
                
                # Set the URL for the attachment
                attachment_url = f'/uploads/{filename}'
            except Exception as e:
                print(f'Error processing attachment: {str(e)}')
                # Continue without the attachment if there's an error
                pass
            
        # Create message in database
        message_data = {
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'content': content,
            'post_id': post_id,
            'post_type': post_type,
            'attachment_url': attachment_url
        }
        
        message_id = Message.create_message(message_data)
        
        if not message_id:
            emit('message_error', {'message': 'Failed to save message'})
            return
            
        # Get the created message
        message = {
            '_id': message_id,
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'content': content,
            'post_id': post_id,
            'post_type': post_type,
            'attachment_url': attachment_url,
            'created_at': datetime.utcnow().isoformat(),
            'read': False
        }
        
        # Broadcast to conversation room if both users are in the same conversation
        conversation_id = data.get('conversation_id')
        if conversation_id:
            emit('new_message', message, room=f'conversation_{conversation_id}')
        
        # Also send to receiver's personal room
        receiver_sid = active_users.get(receiver_id)
        if receiver_sid:
            emit('new_message', message, room=f'user_{receiver_id}')
            
        # Send confirmation to sender
        emit('message_sent', {'message_id': message_id})
        
    except Exception as e:
        emit('message_error', {'message': str(e)})

@socketio.on('read_message')
def handle_read_message(data):
    """Mark a message as read"""
    try:
        message_id = data.get('message_id')
        user_id = data.get('user_id')
        
        if not message_id or not user_id:
            return
            
        # Update message read status in database
        # This would typically call a method in your Message model
        # For now, just emit an event to confirm
        emit('message_read', {'message_id': message_id}, room=f'user_{user_id}')
        
    except Exception as e:
        print(f"Error marking message as read: {str(e)}")
