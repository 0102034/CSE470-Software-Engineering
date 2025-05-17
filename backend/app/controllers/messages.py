from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import os
import base64
import uuid
from datetime import datetime

from app.models.message import Message
from app.models.user import User
from app.utils.upload import save_base64_image
from app.extensions import socketio

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/api/messages', methods=['POST'])
@jwt_required()
def send_message():
    """Send a new message"""
    current_user_id = get_jwt_identity()
    data = request.json or request.form
    
    # Validate required fields
    if not data.get('receiver_id'):
        return jsonify({'error': 'Receiver ID is required'}), 400
    
    if not data.get('content') and 'image' not in request.files and not data.get('image_data'):
        return jsonify({'error': 'Message content or image is required'}), 400
    
    # Prepare message data
    message_data = {
        'sender_id': current_user_id,
        'receiver_id': data.get('receiver_id'),
        'content': data.get('content', ''),
        'item_id': data.get('item_id')
    }
    
    # Handle image upload if present
    image_url = None
    
    # Handle base64 image data
    if data.get('image_data'):
        try:
            image_data = data.get('image_data')
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_url = save_base64_image(image_data, 'messages')
                message_data['image_url'] = image_url
        except Exception as e:
            current_app.logger.error(f"Error saving base64 image: {str(e)}")
            return jsonify({'error': f'Error saving image: {str(e)}'}), 500
    
    # Handle file upload
    elif 'image' in request.files:
        try:
            file = request.files['image']
            if file.filename:
                # Create directory if it doesn't exist
                upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'messages')
                os.makedirs(upload_folder, exist_ok=True)
                
                # Generate unique filename
                filename = f"{uuid.uuid4()}_{file.filename}"
                file_path = os.path.join(upload_folder, filename)
                
                # Save file
                file.save(file_path)
                
                # Set relative URL path
                image_url = f"/uploads/messages/{filename}"
                message_data['image_url'] = image_url
        except Exception as e:
            current_app.logger.error(f"Error uploading file: {str(e)}")
            return jsonify({'error': f'Error uploading file: {str(e)}'}), 500
    
    try:
        # Create message
        message_id = Message.create_message(message_data)
        
        if message_id:
            # Get sender info
            sender = User.get_user_by_id(current_user_id)
            sender_name = f"{sender.get('first_name', '')} {sender.get('last_name', '')}" if sender else "Unknown"
            
            # Get the created message
            message = {
                '_id': message_id,
                'sender_id': current_user_id,
                'receiver_id': data.get('receiver_id'),
                'sender_name': sender_name,
                'content': data.get('content', ''),
                'item_id': data.get('item_id'),
                'image_url': image_url,
                'read': False,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Emit the message to both sender and receiver via Socket.IO
            socketio.emit('new_message', message, room=current_user_id)
            socketio.emit('new_message', message, room=data.get('receiver_id'))
            
            # Also emit to conversation room if applicable
            conversation_id = data.get('conversation_id')
            if conversation_id:
                socketio.emit('new_message', message, room=conversation_id)
            
            return jsonify({
                'success': True,
                'message': 'Message sent successfully',
                'data': message
            }), 201
        else:
            return jsonify({'error': 'Failed to send message'}), 500
    except Exception as e:
        current_app.logger.error(f"Error sending message: {str(e)}")
        return jsonify({'error': f'Error sending message: {str(e)}'}), 500

@messages_bp.route('/api/messages/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for the current user"""
    current_user_id = get_jwt_identity()
    
    try:
        conversations = Message.get_user_conversations(current_user_id)
        return jsonify(conversations), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching conversations: {str(e)}")
        return jsonify({'error': f'Error fetching conversations: {str(e)}'}), 500

@messages_bp.route('/api/messages/conversation/<other_user_id>', methods=['GET'])
@jwt_required()
def get_conversation_messages(other_user_id):
    """Get messages between current user and another user"""
    current_user_id = get_jwt_identity()
    
    try:
        messages = Message.get_conversation_messages(current_user_id, other_user_id)
        
        # Get other user details
        other_user = User.get_user_by_id(other_user_id)
        other_user_details = {
            'id': str(other_user['_id']),
            'name': other_user.get('name', 'Unknown'),
            'email': other_user.get('email', '')
        } if other_user else None
        
        return jsonify({
            'messages': messages,
            'other_user': other_user_details
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching messages: {str(e)}")
        return jsonify({'error': f'Error fetching messages: {str(e)}'}), 500

@messages_bp.route('/api/messages/mark-read/<message_id>', methods=['PUT'])
@jwt_required()
def mark_message_read(message_id):
    """Mark a message as read"""
    current_user_id = get_jwt_identity()
    
    try:
        # Update message read status
        result = Message.mark_message_read(message_id, current_user_id)
        
        if result:
            return jsonify({
                'success': True,
                'message': 'Message marked as read'
            }), 200
        else:
            return jsonify({'error': 'Failed to mark message as read'}), 400
    except Exception as e:
        current_app.logger.error(f"Error marking message as read: {str(e)}")
        return jsonify({'error': f'Error marking message as read: {str(e)}'}), 500
