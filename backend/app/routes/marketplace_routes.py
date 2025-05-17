from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.order import Order
from ..models.message import Message
from bson import ObjectId
import logging
from .. import limiter
import datetime

marketplace_bp = Blueprint('marketplace', __name__)

# Marketplace items routes
@marketplace_bp.route('/items', methods=['GET'])
def get_items():
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client.bracu_circle
        
        # Get all marketplace items
        items = list(db.marketplace_items.find())
        
        # Convert ObjectId to string for JSON serialization
        for item in items:
            item['_id'] = str(item['_id'])
            if 'user_id' in item and isinstance(item['user_id'], ObjectId):
                item['user_id'] = str(item['user_id'])
            
            # Get user info for each item
            if 'user_id' in item:
                user = db.users.find_one({'_id': ObjectId(item['user_id'])})
                if user:
                    item['seller'] = {
                        'id': str(user['_id']),
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', '')
                    }
        
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/items', methods=['POST'])
@jwt_required()
def create_item():
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client.bracu_circle
        
        user_id = get_jwt_identity()
        
        # Get form data
        title = request.form.get('title')
        description = request.form.get('description')
        price = float(request.form.get('price', 0))
        category = request.form.get('category')
        condition = request.form.get('condition')
        
        # Handle image uploads
        images = []
        if 'images' in request.files:
            import os
            from werkzeug.utils import secure_filename
            
            # Create uploads directory if it doesn't exist
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads', 'marketplace')
            os.makedirs(uploads_dir, exist_ok=True)
            
            # Process each uploaded file
            uploaded_files = request.files.getlist('images')
            for file in uploaded_files:
                if file and file.filename:
                    filename = secure_filename(file.filename)
                    # Add timestamp to filename to avoid duplicates
                    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
                    filename = f"{timestamp}_{filename}"
                    file_path = os.path.join(uploads_dir, filename)
                    file.save(file_path)
                    # Store the path relative to the uploads directory
                    images.append(f'/uploads/marketplace/{filename}')
            
            # If no images were successfully uploaded, use a placeholder
            if not images:
                images = ['/uploads/placeholder.jpg']
        
        # Create new item
        new_item = {
            'title': title,
            'description': description,
            'price': price,
            'category': category,
            'condition': condition,
            'images': images,
            'user_id': ObjectId(user_id),
            'status': 'available',
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        result = db.marketplace_items.insert_one(new_item)
        
        # Get the inserted item with user info
        inserted_item = db.marketplace_items.find_one({'_id': result.inserted_id})
        inserted_item['_id'] = str(inserted_item['_id'])
        inserted_item['user_id'] = str(inserted_item['user_id'])
        
        # Add seller info
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            inserted_item['seller'] = {
                'id': str(user['_id']),
                'name': user.get('name', 'Unknown'),
                'email': user.get('email', '')
            }
        
        return jsonify(inserted_item), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/items/user/<user_id>', methods=['GET'])
def get_user_items(user_id):
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client.bracu_circle
        
        # Get all marketplace items for a specific user
        items = list(db.marketplace_items.find({'user_id': ObjectId(user_id)}))
        
        # Convert ObjectId to string for JSON serialization
        for item in items:
            item['_id'] = str(item['_id'])
            if 'user_id' in item and isinstance(item['user_id'], ObjectId):
                item['user_id'] = str(item['user_id'])
            
            # Get user info for each item
            user = db.users.find_one({'_id': ObjectId(user_id)})
            if user:
                item['seller'] = {
                    'id': str(user['_id']),
                    'name': user.get('name', 'Unknown'),
                    'email': user.get('email', '')
                }
        
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Order routes
@marketplace_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Add buyer_id to data
        data['buyer_id'] = user_id
        
        # Create the order
        order_id = Order.create_order(data)
        if order_id:
            return jsonify({
                'message': 'Order created successfully',
                'order_id': order_id
            }), 201
        return jsonify({'error': 'Failed to create order'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/orders/buyer', methods=['GET'])
@jwt_required()
def get_buyer_orders():
    try:
        user_id = get_jwt_identity()
        orders = Order.get_user_orders(user_id, as_buyer=True)
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/orders/seller', methods=['GET'])
@jwt_required()
def get_seller_orders():
    try:
        user_id = get_jwt_identity()
        orders = Order.get_user_orders(user_id, as_buyer=False)
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Message routes
@marketplace_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    try:
        sender_id = get_jwt_identity()
        data = request.get_json()
        data['sender_id'] = sender_id
        
        # Create the message
        message_id = Message.create_message(data)
        if message_id:
            return jsonify({
                'message': 'Message sent successfully',
                'message_id': message_id
            }), 201
        return jsonify({'error': 'Failed to send message'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route removed to avoid duplicate endpoint

@marketplace_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    try:
        user_id = get_jwt_identity()
        conversations = Message.get_user_conversations(user_id)
        return jsonify(conversations), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/messages/conversations', methods=['GET'])
@jwt_required()
def get_message_conversations():
    try:
        user_id = get_jwt_identity()
        conversations = Message.get_user_conversations(user_id)
        return jsonify(conversations), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/messages/<other_user_id>', methods=['GET'])
@jwt_required()
def get_conversation_messages(other_user_id):
    try:
        user_id = get_jwt_identity()
        messages = Message.get_conversation_messages(user_id, other_user_id)
        return jsonify(messages), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/messages/unread', methods=['GET'])
@jwt_required()
def get_unread_messages():
    """Get count of unread messages for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Connect to the database
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client.bracu_circle
        
        # Query the database for unread messages where the current user is the receiver
        # and the message has not been read
        unread_count = db.messages.count_documents({
            'receiver_id': ObjectId(user_id),
            'read': False
        })
        
        logging.info(f"Found {unread_count} unread messages for user {user_id}")
        
        return jsonify({
            'count': unread_count,
            'message': 'Unread messages retrieved successfully'
        }), 200
    except Exception as e:
        logging.error(f"Error in get_unread_messages: {str(e)}")
        return jsonify({'error': str(e)}), 500

@marketplace_bp.route('/messages/post/marketplace/<post_id>/user/<receiver_id>', methods=['POST'])
@jwt_required()
def send_marketplace_post_message(post_id, receiver_id):
    """Send a message related to a specific marketplace post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Get the content from the request
        data = request.get_json()
        content = data.get('content', '')
        
        # Prepare message data
        message_data = {
            'sender_id': current_user_id,
            'receiver_id': receiver_id,
            'content': content,
            'post_id': post_id,
            'post_type': 'marketplace',
            'subject': 'Marketplace Inquiry'
        }
        
        # Create the message
        message_id = Message.create_message(message_data)
        
        if message_id:
            return jsonify({
                'message': 'Message sent successfully',
                'message_id': message_id
            }), 201
        
        return jsonify({'error': 'Failed to send message'}), 400
        
    except Exception as e:
        logging.error(f"Error in send_post_message: {str(e)}")
        return jsonify({'error': str(e)}), 500
