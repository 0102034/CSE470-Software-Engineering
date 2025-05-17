from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from ..models.user import User
import os
import jwt
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from bson import ObjectId
from .. import cache
from datetime import datetime

# Secret key for JWT - should match the one in app/__init__.py
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-key')

admin_bp = Blueprint('admin_bp', __name__)
client = MongoClient(os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'))
db = client.bracu_circle
user_model = User(db)

# Admin authentication middleware
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            # Get the JWT data
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({
                    'message': 'Missing or invalid token',
                    'authenticated': False,
                    'authorized': False
                }), 401
            
            token = auth_header.split(' ')[1]
            
            # Try the new flask_jwt_extended format first
            try:
                decoded = decode_token(token)
                # Check if token has admin role claim
                if decoded.get('role') == 'admin':
                    # Admin token verified
                    return fn(*args, **kwargs)
                
                # Get the identity and check if user is admin in database
                user_id = decoded.get('sub')
                if user_id:
                    user = db.users.find_one({'_id': ObjectId(user_id)})
                    if user and user.get('role') == 'admin':
                        return fn(*args, **kwargs)
                
                return jsonify({
                    'message': 'Admin privileges required',
                    'authenticated': True,
                    'authorized': False
                }), 403
                
            except Exception:
                # Try legacy format
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
                if payload.get('role') == 'admin' and payload.get('admin_id'):
                    # Legacy admin token
                    return fn(*args, **kwargs)
                elif 'user_id' in payload:
                    # Legacy user token - check if admin
                    user = db.users.find_one({'_id': ObjectId(payload['user_id'])})
                    if user and user.get('role') == 'admin':
                        return fn(*args, **kwargs)
                
                return jsonify({
                    'message': 'Admin privileges required',
                    'authenticated': True,
                    'authorized': False
                }), 403
                
        except Exception as e:
            return jsonify({
                'message': f'Error: {str(e)}',
                'authenticated': False,
                'authorized': False
            }), 401
            
    return wrapper

@admin_bp.route('/pending-users', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_users():
    """Get all users who are pending verification"""
    try:
        # Add debug logging
        current_app.logger.debug("Fetching pending users")
        pending_users = list(db.users.find({'verification_status': 'pending'}, {'password': 0}))
        
        # Convert ObjectId to string
        for user in pending_users:
            user['_id'] = str(user['_id'])
        
            # Make sure the ID card photo URL is properly formatted
            if 'id_card_photo' in user and user['id_card_photo']:
                # Ensure the URL starts with / if it's a relative path
                if not user['id_card_photo'].startswith('/') and not user['id_card_photo'].startswith('http'):
                    user['id_card_photo'] = '/' + user['id_card_photo']
        
        current_app.logger.debug(f"Found {len(pending_users)} pending users")
        return jsonify(pending_users), 200
    except Exception as e:
        current_app.logger.error(f"Error getting pending users: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/verified-users', methods=['GET'])
@jwt_required()
@admin_required
@cache.cached(timeout=60)  # Cache for 60 seconds to reduce rate limit issues
def get_verified_users():
    """Get all verified users"""
    try:
        # Add debug logging
        current_app.logger.debug("Fetching verified users")
        verified_users = list(db.users.find({'verification_status': 'approved'}, {'password': 0}))
        
        # Convert ObjectId to string
        for user in verified_users:
            user['_id'] = str(user['_id'])
        
            # Make sure the ID card photo URL is properly formatted
            if 'id_card_photo' in user and user['id_card_photo']:
                # Ensure the URL starts with / if it's a relative path
                if not user['id_card_photo'].startswith('/') and not user['id_card_photo'].startswith('http'):
                    user['id_card_photo'] = '/' + user['id_card_photo']
        
        # Add cache control headers
        response = jsonify(verified_users)
        response.headers['Cache-Control'] = 'max-age=60'
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error fetching verified users: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/approve-user/<user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def approve_user(user_id):
    """Approve a user's verification request"""
    try:
        # Add debug logging
        current_app.logger.debug(f"Approving user with ID: {user_id}")
        
        # Check if user exists
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            current_app.logger.warning(f"User not found with ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404
         
        # Update user verification status
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'verification_status': 'approved',
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            current_app.logger.warning(f"No changes made when approving user: {user_id}")
            return jsonify({'error': 'User already approved or not found'}), 400
        
        current_app.logger.info(f"User {user_id} approved successfully")
        return jsonify({'message': 'User approved successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error approving user: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reject-user/<user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def reject_user(user_id):
    """Reject a user's verification request"""
    try:
        # Add debug logging
        current_app.logger.debug(f"Rejecting user with ID: {user_id}")
        
        # Check if user exists
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            current_app.logger.warning(f"User not found with ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404
             
        # Update user verification status
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'verification_status': 'rejected',
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            current_app.logger.warning(f"No changes made when rejecting user: {user_id}")
            return jsonify({'error': 'User already rejected or not found'}), 400
        
        current_app.logger.info(f"User {user_id} rejected successfully")
        return jsonify({'message': 'User rejected successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error rejecting user: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/user/<user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user_details(user_id):
    """Get detailed information about a user"""
    try:
        # Find user by ID
        user = db.users.find_one({'_id': ObjectId(user_id)}, {'password': 0})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Convert ObjectId to string for JSON serialization
        user['_id'] = str(user['_id'])
        
        # Make sure the ID card photo URL is properly formatted
        if 'id_card_photo' in user and user['id_card_photo']:
            # Ensure the URL starts with / if it's a relative path
            if not user['id_card_photo'].startswith('/') and not user['id_card_photo'].startswith('http'):
                user['id_card_photo'] = '/' + user['id_card_photo']
                
        return jsonify(user), 200
    except Exception as e:
        current_app.logger.error(f"Error getting user details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/delete-user/<user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Admin deletes a user account by ID"""
    try:
        result = db.users.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        current_app.logger.error(f"Admin error deleting user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/edit-user/<user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def edit_user(user_id):
    """Edit user information"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Check if user exists
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Fields that admin is allowed to edit
        allowed_fields = ['name', 'email', 'username', 'department', 'semester', 'verification_status']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
            
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        # Update user
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made or user not found'}), 400
            
        # Clear cache
        cache.delete('admin_pending_users')
        cache.delete('admin_verified_users')
        
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error editing user: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/statistics', methods=['GET', 'POST', 'OPTIONS'])
@jwt_required()
@admin_required
@cache.cached(timeout=60)  # Cache statistics for 1 minute instead of 5 to show more recent items
def get_statistics():
    """Get platform statistics for admin dashboard"""
    try:
        # Count users
        total_users = db.users.count_documents({})
        verified_users = db.users.count_documents({'verification_status': 'approved'})
        pending_users = db.users.count_documents({'verification_status': 'pending'})
        
        # Count rooms and bookings
        total_rooms = db.rooms.count_documents({'active': True})
        total_bookings = db.bookings.count_documents({})
        
        # Count marketplace items - use marketplace_items collection instead of items
        total_items = db.marketplace_items.count_documents({})

        # Share ride statistics
        total_share_rides = db.share_rides.count_documents({})
        active_share_rides = db.share_rides.count_documents({'status': 'active'})
        inactive_share_rides = db.share_rides.count_documents({'status': {'$ne': 'active'}})
        
        # Get recent ride share posts
        recent_share_rides = list(db.share_rides.find().sort('created_at', -1).limit(5))
        # Convert ObjectId to string for recent share rides
        for ride in recent_share_rides:
            if '_id' in ride:
                ride['_id'] = str(ride['_id'])
            if 'user_id' in ride:
                ride['user_id'] = str(ride['user_id'])

        # Get recent activities
        recent_bookings = list(db.bookings.find().sort('created_at', -1).limit(5))
        # Use marketplace_items collection instead of items
        recent_items = list(db.marketplace_items.find().sort('created_at', -1).limit(5))
        
        # Convert ObjectId to string
        for booking in recent_bookings:
            booking['_id'] = str(booking['_id'])
            booking['user_id'] = str(booking['user_id'])
            booking['room_id'] = str(booking['room_id'])
            
        for item in recent_items:
            item['_id'] = str(item['_id'])
            item['user_id'] = str(item['user_id'])
            
            # Add user details to items
            user = db.users.find_one({'_id': ObjectId(item['user_id'])})
            if user:
                item['seller'] = {
                    'id': str(user['_id']),
                    'name': user.get('name', 'Unknown'),
                    'email': user.get('email', '')
                }
        
        # Add cache control headers
        response = jsonify({
            'users': {
                'total': total_users,
                'verified': verified_users,
                'pending': pending_users
            },
            'rooms': {
                'total': total_rooms
            },
            'bookings': {
                'total': total_bookings
            },
            'marketplace': {
                'total_items': total_items
            },
            'share_rides': {
                'total': total_share_rides,
                'active': active_share_rides,
                'inactive': inactive_share_rides
            },
            # Add rideshare property to match frontend expectations
            'rideshare': {
                'total_posts': total_share_rides,
                'active': active_share_rides,
                'inactive': inactive_share_rides
            },
            'recent_activities': {
                'bookings': recent_bookings,
                'items': recent_items,
                'rideshare': recent_share_rides
            }
        })
        response.headers['Cache-Control'] = 'max-age=60'
        return response, 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 