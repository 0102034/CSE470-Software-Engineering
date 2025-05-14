from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
from bson import ObjectId
import datetime
import os
from werkzeug.utils import secure_filename
import uuid
from .. import limiter

users_bp = Blueprint('users', __name__)

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

# Constants
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'uploads', 'profiles')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@users_bp.route('/<user_id>', methods=['GET'])
@limiter.limit("30 per minute")
@jwt_required()
def get_user(user_id):
    """Get user details"""
    try:
        # Get user's ID from JWT token for authorization
        token_user_id = get_jwt_identity()
        
        # Only allow users to access their own data
        if token_user_id != user_id:
            return jsonify({"error": "Unauthorized access to user data"}), 403
        
        # Get user data from database
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Remove sensitive information
        user.pop('password', None)
        
        # Convert ObjectId to string
        user['_id'] = str(user['_id'])

        # Fix profile_picture and id_card_photo URLs
        if 'profile_picture' in user and user['profile_picture']:
            if not user['profile_picture'].startswith('/uploads/') and not user['profile_picture'].startswith('http'):
                user['profile_picture'] = '/uploads/profiles/' + user['profile_picture']
        if 'id_card_photo' in user and user['id_card_photo']:
            if not user['id_card_photo'].startswith('/uploads/') and not user['id_card_photo'].startswith('http'):
                user['id_card_photo'] = '/uploads/' + user['id_card_photo']

        return jsonify(user), 200
    except Exception as e:
        current_app.logger.error(f"Error getting user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@users_bp.route('/<user_id>', methods=['PUT'])
@limiter.limit("10 per minute")
@jwt_required()
def update_user(user_id):
    """Update user details"""
    try:
        # Get user's ID from JWT token for authorization
        token_user_id = get_jwt_identity()
        
        # Only allow users to update their own data
        if token_user_id != user_id:
            return jsonify({"error": "Unauthorized to update user data"}), 403
        
        # Get updated data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Fields that can be updated
        allowed_fields = ['name', 'student_id', 'department', 'semester', 'phone', 'address']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        # Add updated timestamp
        update_data['updated_at'] = datetime.datetime.utcnow()
        
        # Update user in database
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404
        
        # Get updated user data
        updated_user = db.users.find_one({"_id": ObjectId(user_id)})
        
        # Remove sensitive information
        updated_user.pop('password', None)
        
        # Convert ObjectId to string
        updated_user['_id'] = str(updated_user['_id'])
        
        return jsonify(updated_user), 200
    except Exception as e:
        current_app.logger.error(f"Error updating user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@users_bp.route('/<user_id>/profile-picture', methods=['POST'])
@limiter.limit("5 per minute")
@jwt_required()
def update_profile_picture(user_id):
    """Update user profile picture"""
    try:
        # Get user's ID from JWT token for authorization
        token_user_id = get_jwt_identity()
        
        # Only allow users to update their own data
        if token_user_id != user_id:
            return jsonify({"error": "Unauthorized to update profile picture"}), 403
        
        # Check if file is provided
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No profile picture provided"}), 400
        
        file = request.files['profile_picture']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check if file is allowed
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file format. Only PNG, JPG, JPEG, GIF are allowed"}), 400
        
        # Get user data
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Delete old profile picture if exists
        if 'profile_picture' in user and user['profile_picture']:
            old_file_path = os.path.join(os.path.dirname(UPLOAD_FOLDER), user['profile_picture'].lstrip('/'))
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        # Save new profile picture
        filename = secure_filename(file.filename)
        unique_filename = f"profile_{user_id}_{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Update profile picture path in database
        profile_picture_url = f"/uploads/profiles/{unique_filename}"
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "profile_picture": profile_picture_url,
                "updated_at": datetime.datetime.utcnow()
            }}
        )
        
        return jsonify({
            "message": "Profile picture updated successfully",
            "profile_picture": profile_picture_url
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error updating profile picture: {str(e)}")
        return jsonify({"error": str(e)}), 500

@users_bp.route('/<user_id>/delete-profile-picture', methods=['DELETE'])
@limiter.limit("5 per minute")
@jwt_required()
def delete_profile_picture(user_id):
    """Delete user profile picture"""
    try:
        # Get user's ID from JWT token for authorization
        token_user_id = get_jwt_identity()
        
        # Only allow users to delete their own profile picture
        if token_user_id != user_id:
            return jsonify({"error": "Unauthorized to delete profile picture"}), 403
        
        # Get user data
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if user has a profile picture
        if 'profile_picture' not in user or not user['profile_picture']:
            return jsonify({"message": "No profile picture to delete"}), 200
        
        # Delete profile picture file
        picture_path = os.path.join(os.path.dirname(UPLOAD_FOLDER), user['profile_picture'].lstrip('/'))
        if os.path.exists(picture_path):
            os.remove(picture_path)
        
        # Update user record to remove profile picture reference
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$unset": {"profile_picture": ""}, "$set": {"updated_at": datetime.datetime.utcnow()}}
        )
        
        return jsonify({"message": "Profile picture deleted successfully"}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting profile picture: {str(e)}")
        return jsonify({"error": str(e)}), 500

@users_bp.route('/<user_id>/purchase-history', methods=['GET'])
@limiter.limit("30 per minute")
@jwt_required()
def get_purchase_history(user_id):
    """Get user purchase history"""
    try:
        # Get user's ID from JWT token for authorization
        token_user_id = get_jwt_identity()
        
        # Only allow users to access their own purchase history
        if token_user_id != user_id:
            return jsonify({"error": "Unauthorized to access purchase history"}), 403
        
        # Get purchase history from database
        purchases = list(db.purchases.find({"user_id": ObjectId(user_id)}))
        if not purchases:
            return jsonify([]), 200
        
        # Format purchase data
        formatted_purchases = []
        for purchase in purchases:
            purchase['_id'] = str(purchase['_id'])
            purchase['user_id'] = str(purchase['user_id'])
            if 'item_id' in purchase:
                purchase['item_id'] = str(purchase['item_id'])
                
                # Get item details if available
                item = db.marketplace_items.find_one({"_id": ObjectId(purchase['item_id'])})
                if item:
                    purchase['item'] = {
                        'title': item.get('title', ''),
                        'price': item.get('price', 0),
                        'category': item.get('category', '')
                    }
            
            formatted_purchases.append(purchase)
        
        return jsonify(formatted_purchases), 200
    except Exception as e:
        current_app.logger.error(f"Error getting purchase history: {str(e)}")
        return jsonify({"error": str(e)}), 500

@users_bp.route('/marketplace/user-items/<user_id>', methods=['GET'])
@limiter.limit("30 per minute")
@jwt_required()
def get_user_marketplace_items(user_id):
    """Get user's marketplace items"""
    try:
        # Get user's ID from JWT token for authorization
        token_user_id = get_jwt_identity()
        
        # Only allow users to access their own data
        if token_user_id != user_id:
            return jsonify({"error": "Unauthorized access to user data"}), 403
        
        # Get user's items from database
        items = list(db.marketplace_items.find({"user_id": ObjectId(user_id)}))
        
        # Convert ObjectId to string
        for item in items:
            item['_id'] = str(item['_id'])
            item['user_id'] = str(item['user_id'])
        
        return jsonify(items), 200
    except Exception as e:
        current_app.logger.error(f"Error getting user items: {str(e)}")
        return jsonify({"error": str(e)}), 500 