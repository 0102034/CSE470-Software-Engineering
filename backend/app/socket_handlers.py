from flask import current_app, request
from flask_socketio import emit, join_room
from bson import ObjectId
from datetime import datetime
import base64
import os
import uuid

from app.models.message import Message
from app.utils.upload import save_base64_image

# Dictionary to store user socket mappings
connected_users = {}

def register_socket_handlers(socketio):
    @socketio.on('connect')
    def handle_connect():
        current_app.logger.info(f"Client connected: {request.sid}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        # Remove user from connected users
        for user_id, sid in connected_users.items():
            if sid == request.sid:
                del connected_users[user_id]
                current_app.logger.info(f"User {user_id} disconnected")
                break
    
    @socketio.on('register_user')
    def handle_register_user(data):
        user_id = data.get('user_id')
        if user_id:
            connected_users[user_id] = request.sid
            current_app.logger.info(f"User {user_id} registered with socket {request.sid}")
            
            # Join a room with the user's ID
            join_room(user_id)
    
    @socketio.on('send_message')
    def handle_send_message(data):
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        content = data.get('content', '')
        item_id = data.get('item_id')
        image = data.get('image')
        
        if not sender_id or not receiver_id:
            emit('error', {'message': 'Sender and receiver IDs are required'}, room=request.sid)
            return
        
        if not content and not image:
            emit('error', {'message': 'Message content or image is required'}, room=request.sid)
            return
        
        try:
            # Prepare message data
            message_data = {
                'sender_id': sender_id,
                'receiver_id': receiver_id,
                'content': content,
                'item_id': item_id
            }
            
            # Handle image if present
            if image:
                try:
                    image_url = save_base64_image(image, 'messages')
                    message_data['image_url'] = image_url
                except Exception as e:
                    current_app.logger.error(f"Error saving image: {str(e)}")
                    emit('error', {'message': f'Error saving image: {str(e)}'}, room=request.sid)
                    return
            
            # Create message in database
            message_id = Message.create_message(message_data)
            
            if message_id:
                # Prepare message for socket response
                message = {
                    '_id': message_id,
                    'sender_id': sender_id,
                    'receiver_id': receiver_id,
                    'content': content,
                    'item_id': item_id,
                    'image_url': message_data.get('image_url'),
                    'read': False,
                    'created_at': datetime.utcnow().isoformat()
                }
                
                # Send to sender
                emit('new_message', message, room=request.sid)
                
                # Send to receiver if online
                if receiver_id in connected_users:
                    emit('new_message', message, room=receiver_id)
                
                # Send success acknowledgment
                emit('message_sent', {'success': True, 'message_id': message_id}, room=request.sid)
            else:
                emit('error', {'message': 'Failed to save message'}, room=request.sid)
        
        except Exception as e:
            current_app.logger.error(f"Error handling message: {str(e)}")
            emit('error', {'message': f'Error: {str(e)}'}, room=request.sid)
    
    @socketio.on('mark_read')
    def handle_mark_read(data):
        user_id = data.get('user_id')
        message_id = data.get('message_id')
        
        if not user_id or not message_id:
            emit('error', {'message': 'User ID and message ID are required'}, room=request.sid)
            return
        
        try:
            result = Message.mark_message_read(message_id, user_id)
            
            if result:
                # Notify sender that message was read
                message = Message.get_message_by_id(message_id)
                if message and message.get('sender_id') in connected_users:
                    emit('message_read', {'message_id': message_id}, room=message['sender_id'])
                
                emit('mark_read_success', {'message_id': message_id}, room=request.sid)
            else:
                emit('error', {'message': 'Failed to mark message as read'}, room=request.sid)
        
        except Exception as e:
            current_app.logger.error(f"Error marking message as read: {str(e)}")
            emit('error', {'message': f'Error: {str(e)}'}, room=request.sid)
