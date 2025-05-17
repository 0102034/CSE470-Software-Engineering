from flask import Blueprint, request, jsonify, current_app
from app.models.message import Message
from app.models.user import User
from app.utils.auth import token_required
import os
import uuid
import base64
from datetime import datetime
from bson import ObjectId
from app.models.message import db  # Import the database connection
from app.extensions import socketio  # Import socketio from extensions

message_bp = Blueprint('message_bp', __name__)

@message_bp.route('', methods=['POST'])
@token_required
def create_message(current_user):
    """Create a new message"""
    try:
        # Check if data is JSON or form data
        if request.is_json:
            data = request.json
        else:
            data = request.form
        
        # Validate required fields
        if not all(key in data for key in ['receiver_id']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if not data.get('content') and 'image' not in request.files:
            return jsonify({'error': 'Message content or image is required'}), 400
        
        # Add sender_id from current user
        sender_id = str(current_user['_id'])
        data = dict(data)
        data['sender_id'] = sender_id
        
        # Handle image upload if present
        image_url = None
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename:
                # Create uploads directory if it doesn't exist
                upload_dir = os.path.join(os.getcwd(), 'uploads', 'messages')
                os.makedirs(upload_dir, exist_ok=True)
                
                # Generate unique filename
                filename = f"{uuid.uuid4()}_{image_file.filename}"
                filepath = os.path.join(upload_dir, filename)
                
                # Save the image
                image_file.save(filepath)
                
                # Set the image URL for the message
                image_url = f"/uploads/messages/{filename}"
                data['image_url'] = image_url
        
        # Create message
        message_id = Message.create_message(data)
        
        if message_id:
            # Get sender info
            sender_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
            if not sender_name:
                sender_name = current_user.get('email', 'Unknown User')
            
            # Prepare message for frontend
            message = {
                '_id': message_id,
                'sender_id': sender_id,
                'receiver_id': data.get('receiver_id'),
                'sender_name': sender_name,
                'content': data.get('content', ''),
                'image_url': image_url,
                'item_id': data.get('item_id'),
                'item_type': data.get('item_type'),
                'item_title': data.get('item_title'),
                'created_at': datetime.utcnow().isoformat(),
                'read': False
            }
            
            # Emit the message to both sender and receiver via Socket.IO
            socketio.emit('new_message', message, room=sender_id)
            socketio.emit('new_message', message, room=data.get('receiver_id'))
            
            # Also emit to conversation room if applicable
            conversation_id = data.get('conversation_id')
            if conversation_id:
                socketio.emit('new_message', message, room=conversation_id)
            
            return jsonify({
                'status': 'success',
                'message': 'Message sent successfully',
                'data': message
            }), 201
        else:
            return jsonify({'error': 'Failed to send message'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@message_bp.route('/upload', methods=['POST'])
@token_required
def upload_message_image(current_user):
    """Upload an image for a message"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
            
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'messages')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}_{image_file.filename}"
        filepath = os.path.join(upload_dir, filename)
        
        # Save the image
        image_file.save(filepath)
        
        # Return the image URL
        image_url = f"/uploads/messages/{filename}"
        
        return jsonify({
            'status': 'success',
            'message': 'Image uploaded successfully',
            'data': {'image_url': image_url}
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@message_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """Get all conversations for the current user"""
    try:
        user_id = str(current_user['_id'])
        conversations = Message.get_user_conversations(user_id)
        
        return jsonify(conversations), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@message_bp.route('/conversations/with/<user_id>', methods=['GET'])
@token_required
def get_conversations_with_user(current_user, user_id):
    try:
        current_user_id = str(current_user['_id'])
        
        # Find conversations between the current user and the specified user
        conversation = db.conversations.find_one({
            "$or": [
                {
                    "participant1_id": ObjectId(current_user_id),
                    "participant2_id": ObjectId(user_id)
                },
                {
                    "participant1_id": ObjectId(user_id),
                    "participant2_id": ObjectId(current_user_id)
                }
            ]
        })
        
        # If no conversation exists, return an empty array
        if not conversation:
            return jsonify([]), 200
        
        # Format the conversation for the response
        conversation_id = str(conversation['_id'])
        
        # Get the other user's details
        other_user = None
        if str(conversation['participant1_id']) == current_user_id:
            other_user_id = str(conversation['participant2_id'])
        else:
            other_user_id = str(conversation['participant1_id'])
            
        # Get user details
        other_user = db.users.find_one({"_id": ObjectId(other_user_id)})
        
        # Get the last message
        last_message = db.messages.find_one(
            {
                "$or": [
                    {
                        "sender_id": ObjectId(current_user_id),
                        "receiver_id": ObjectId(other_user_id)
                    },
                    {
                        "sender_id": ObjectId(other_user_id),
                        "receiver_id": ObjectId(current_user_id)
                    }
                ]
            },
            sort=[('created_at', -1)]
        )
        
        # Format the conversation
        formatted_conversation = {
            "_id": conversation_id,
            "other_participant": {
                "id": other_user_id,
                "name": f"{other_user.get('first_name', '')} {other_user.get('last_name', '')}".strip() or other_user.get('email', 'Unknown User'),
                "email": other_user.get('email', ''),
                "profile_image": other_user.get('profile_image', '')
            },
            "last_message": {
                "content": last_message.get('content', '') if last_message else '',
                "sender_id": str(last_message.get('sender_id', '')) if last_message else '',
                "created_at": last_message.get('created_at', datetime.utcnow()).isoformat() if last_message else datetime.utcnow().isoformat(),
                "read": last_message.get('read', True) if last_message else True
            },
            "unread_count": db.messages.count_documents({
                "conversation_id": ObjectId(conversation_id),
                "receiver_id": ObjectId(current_user_id),
                "read": False
            })
        }
        
        return jsonify([formatted_conversation]), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_conversations_with_user: {str(e)}")
        return jsonify({'error': str(e)}), 500

@message_bp.route('/conversation/<receiver_id>', methods=['GET'])
@token_required
def get_conversation_messages(current_user, receiver_id):
    """Get messages between current user and another user"""
    try:
        user_id = str(current_user['_id'])
        messages = Message.get_conversation_messages(user_id, receiver_id)
        
        return jsonify(messages), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@message_bp.route('/conversations/<conversation_id>', methods=['GET'])
@token_required
def get_messages_by_conversation_id(current_user, conversation_id):
    """Get messages from a specific conversation by its ID"""
    try:
        user_id = str(current_user['_id'])
        current_app.logger.info(f"Fetching conversation {conversation_id} for user {user_id}")
        
        # If the conversation ID is invalid or doesn't exist, just return an empty array
        # This is more user-friendly than returning an error
        try:
            # For testing purposes, if we can't find a conversation, let's create a direct message approach
            # This is a fallback mechanism to ensure the messaging UI works even if the conversation doesn't exist
            # In a production environment, you might want to handle this differently
            
            # Try to find messages directly between the users
            # This assumes the conversation_id might actually be another user's ID
            try:
                other_user_id = conversation_id
                # Try to validate if this is a valid user ID
                other_user = db.users.find_one({'_id': ObjectId(other_user_id)})
                
                if other_user:
                    current_app.logger.info(f"Found user {other_user_id}, fetching direct messages")
                    messages = Message.get_conversation_messages(user_id, other_user_id)
                    current_app.logger.info(f"Found {len(messages)} direct messages")
                    return jsonify(messages), 200
            except Exception as direct_err:
                current_app.logger.error(f"Error in direct message approach: {str(direct_err)}")
            
            # If we reach here, try the original conversation approach
            conv_obj_id = ObjectId(conversation_id)
            conversation = db.conversations.find_one({
                "_id": conv_obj_id,
                "$or": [
                    {"participant1_id": ObjectId(user_id)},
                    {"participant2_id": ObjectId(user_id)}
                ]
            })
            
            if not conversation:
                current_app.logger.warning(f"Conversation {conversation_id} not found or user {user_id} not authorized")
                return jsonify([]), 200
            
            # Get the other participant
            if conversation["participant1_id"] == ObjectId(user_id):
                other_id = str(conversation["participant2_id"])
            else:
                other_id = str(conversation["participant1_id"])
            
            current_app.logger.info(f"Fetching messages between {user_id} and {other_id}")
            
            # Get messages
            messages = Message.get_conversation_messages(user_id, other_id)
            current_app.logger.info(f"Found {len(messages)} messages")
            
            return jsonify(messages), 200
            
        except Exception as e:
            current_app.logger.error(f"Error processing conversation: {str(e)}")
            # Return empty array for better UX
            return jsonify([]), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_messages_by_conversation_id: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@message_bp.route('/mark-read/<message_id>', methods=['PUT'])
@token_required
def mark_message_as_read(current_user, message_id):
    """Mark a message as read"""
    try:
        user_id = str(current_user['_id'])
        result = Message.mark_message_read(message_id, user_id)
        
        if result:
            return jsonify({
                'status': 'success',
                'message': 'Message marked as read'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Message not found or already read'
            }), 404
        
    except Exception as e:
        current_app.logger.error(f"Error marking message as read: {str(e)}")
        return jsonify({'error': str(e)}), 500

@message_bp.route('/conversations/<conversation_id>/read', methods=['PUT'])
@token_required
def mark_conversation_as_read(current_user, conversation_id):
    """Mark all messages in a conversation as read"""
    try:
        user_id = str(current_user['_id'])
        
        # Get the other participant
        conversation = db.conversations.find_one({
            "_id": ObjectId(conversation_id),
            "$or": [
                {"participant1_id": ObjectId(user_id)},
                {"participant2_id": ObjectId(user_id)}
            ]
        })
        
        if not conversation:
            return jsonify({
                'status': 'error',
                'message': 'Conversation not found or unauthorized'
            }), 404
        
        # Get the other participant
        if str(conversation["participant1_id"]) == user_id:
            other_id = str(conversation["participant2_id"])
        else:
            other_id = str(conversation["participant1_id"])
        
        # Mark messages as read
        count = Message.mark_conversation_read(user_id, other_id)
        
        # Emit socket event to notify the sender
        socketio.emit('conversation_read', {
            'conversation_id': conversation_id,
            'reader_id': user_id
        }, room=other_id)
        
        return jsonify({
            'status': 'success',
            'message': f'{count} messages marked as read'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@message_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
@token_required
def delete_conversation(current_user, conversation_id):
    """Hide a conversation for the current user without deleting messages"""
    try:
        user_id = str(current_user['_id'])
        
        # Get the conversation to verify ownership
        conversation = db.conversations.find_one({
            "_id": ObjectId(conversation_id),
            "$or": [
                {"participant1_id": ObjectId(user_id)},
                {"participant2_id": ObjectId(user_id)}
            ]
        })
        
        if not conversation:
            return jsonify({
                'status': 'error',
                'message': 'Conversation not found or unauthorized'
            }), 404
        
        # Get the other participant
        if str(conversation["participant1_id"]) == user_id:
            other_id = str(conversation["participant2_id"])
        else:
            other_id = str(conversation["participant1_id"])
        
        # Hide the conversation for this user instead of deleting it
        result = Message.hide_conversation_for_user(conversation_id, user_id)
        
        if result:
            # Check if both users have hidden the conversation
            both_hidden, hidden_count = Message.check_conversation_hidden_status(conversation_id)
            
            # Notify the other user that the conversation was hidden
            socketio.emit('conversation_hidden', {
                'conversation_id': conversation_id,
                'hider_id': user_id
            }, room=other_id)
            
            return jsonify({
                'status': 'success',
                'message': 'Conversation hidden successfully',
                'both_hidden': both_hidden
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to hide conversation'
            }), 500
        
    except Exception as e:
        current_app.logger.error(f"Error in mark_conversation_as_read: {str(e)}")
        return jsonify({'error': str(e)}), 500

@message_bp.route('/unread', methods=['GET'])
@token_required
def get_unread_message_count(current_user):
    """Get count of unread messages for the current user"""
    try:
        user_id = str(current_user['_id'])
        
        # Count unread messages where the current user is the receiver
        unread_count = db.messages.count_documents({
            "receiver_id": ObjectId(user_id),
            "read": False
        })
        
        return jsonify({
            'status': 'success',
            'count': unread_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
