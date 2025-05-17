from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from ..models.message import Message
from ..models.user import User

message_bp = Blueprint('messages', __name__)

@message_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for the current user"""
    try:
        user_id = get_jwt_identity()
        conversations = Message.get_user_conversations(user_id)
        return jsonify({
            'status': 'success',
            'conversations': conversations
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@message_bp.route('/conversations/post/<post_type>/<post_id>', methods=['GET'])
@jwt_required()
def get_conversations_by_post(post_type, post_id):
    """Get conversations related to a specific post"""
    try:
        user_id = get_jwt_identity()
        
        # Validate post_type
        if post_type not in ['marketplace', 'ride_share']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid post type'
            }), 400
            
        conversations = Message.get_conversations_by_post(user_id, post_id, post_type)
        return jsonify({
            'status': 'success',
            'conversations': conversations
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@message_bp.route('/messages/<other_user_id>', methods=['GET'])
@jwt_required()
def get_messages(other_user_id):
    """Get messages between current user and another user"""
    try:
        user_id = get_jwt_identity()
        post_id = request.args.get('post_id')
        
        messages = Message.get_conversation_messages(user_id, other_user_id, post_id)
        return jsonify({
            'status': 'success',
            'messages': messages
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@message_bp.route('/messages/post/<post_type>/<post_id>/user/<user_id>', methods=['POST'])
@jwt_required()
def send_initial_message(post_type, post_id, user_id):
    """Send an initial message to a user about a post"""
    try:
        sender_id = get_jwt_identity()
        data = request.json
        
        # Validate post_type
        if post_type not in ['marketplace', 'ride_share']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid post type'
            }), 400
            
        # Validate content
        if not data.get('content'):
            return jsonify({
                'status': 'error',
                'message': 'Message content is required'
            }), 400
            
        # Create message
        message_data = {
            'sender_id': sender_id,
            'receiver_id': user_id,
            'content': data['content'],
            'post_id': post_id,
            'post_type': post_type,
            'attachment_url': data.get('attachment_url')
        }
        
        message_id = Message.create_message(message_data)
        
        if not message_id:
            return jsonify({
                'status': 'error',
                'message': 'Failed to send message'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message_id': message_id
        }), 201
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
