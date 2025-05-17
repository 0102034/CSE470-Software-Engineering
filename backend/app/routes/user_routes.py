from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from bson import ObjectId
import logging

user_bp = Blueprint('users', __name__)

@user_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get user information by ID"""
    try:
        # Get current user ID from token
        current_user_id = get_jwt_identity()
        
        # Initialize user model
        user_model = User()
        
        # Get user information
        user = user_model.get_user_by_id(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Convert ObjectId to string
        user['_id'] = str(user['_id'])
        
        # Remove sensitive information
        if 'password' in user:
            del user['password']
        
        return jsonify({
            "user": user,
            "message": "User information retrieved successfully"
        }), 200
        
    except Exception as e:
        logging.error(f"Error in get_user: {str(e)}")
        return jsonify({"error": str(e)}), 500
