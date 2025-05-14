from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.order import Order
from ..models.message import Message
from bson import ObjectId
from .. import limiter

marketplace_bp = Blueprint('marketplace', __name__)

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

@marketplace_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
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
