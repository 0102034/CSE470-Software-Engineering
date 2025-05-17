"""
Authentication routes for the application.
"""
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from app.db import get_db
from bson import ObjectId
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """
    Login user with email and password
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
        
    email = data.get('email', '')
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400
    
    db = get_db()
    user = db.users.find_one({"email": email})
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # Check if account is verified
    if not user.get('verified', False):
        return jsonify({"success": False, "message": "Account not verified"}), 401
    
    # Verify password
    if not check_password_hash(user.get('password', ''), password):
        return jsonify({"success": False, "message": "Invalid password"}), 401
    
    # Create tokens
    access_token = create_access_token(
        identity=str(user['_id']),
        additional_claims={
            'email': user['email'],
            'name': user.get('name', ''),
            'role': user.get('role', 'user')
        },
        expires_delta=datetime.timedelta(hours=24)
    )
    
    refresh_token = create_refresh_token(
        identity=str(user['_id']),
        expires_delta=datetime.timedelta(days=30)
    )
    
    return jsonify({
        "success": True,
        "user": {
            "id": str(user['_id']),
            "email": user['email'],
            "name": user.get('name', ''),
            "role": user.get('role', 'user')
        },
        "token": access_token,
        "refreshToken": refresh_token
    }), 200

@auth_bp.route('/api/admin/login', methods=['POST'])
def admin_login():
    """
    Login admin with email and password
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
        
    email = data.get('email', '')
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400
    
    db = get_db()
    admin = db.users.find_one({"email": email, "role": "admin"})
    
    if not admin:
        return jsonify({"success": False, "message": "Admin not found"}), 404
    
    # Verify password
    if not check_password_hash(admin.get('password', ''), password):
        return jsonify({"success": False, "message": "Invalid password"}), 401
    
    # Create tokens
    access_token = create_access_token(
        identity=str(admin['_id']),
        additional_claims={
            'email': admin['email'],
            'name': admin.get('name', ''),
            'role': 'admin'
        },
        expires_delta=datetime.timedelta(hours=24)
    )
    
    refresh_token = create_refresh_token(
        identity=str(admin['_id']),
        expires_delta=datetime.timedelta(days=30)
    )
    
    return jsonify({
        "success": True,
        "admin": {
            "id": str(admin['_id']),
            "email": admin['email'],
            "name": admin.get('name', ''),
            "role": 'admin'
        },
        "token": access_token,
        "refreshToken": refresh_token
    }), 200

@auth_bp.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    # Required fields
    name = data.get('name', '')
    email = data.get('email', '')
    password = data.get('password', '')
    
    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email and password are required"}), 400
    
    # Check if email is already registered
    db = get_db()
    if db.users.find_one({"email": email}):
        return jsonify({"success": False, "message": "Email already registered"}), 409
    
    # Create new user
    new_user = {
        "name": name,
        "email": email,
        "password": generate_password_hash(password),
        "role": "user",
        "verified": True,  # Set to True for now, in a real app this would be False until email verification
        "created_at": datetime.datetime.utcnow()
    }
    
    result = db.users.insert_one(new_user)
    
    return jsonify({
        "success": True,
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }), 201

@auth_bp.route('/api/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """
    Verify JWT token and return user details
    """
    current_user_id = get_jwt_identity()
    
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    return jsonify({
        "success": True,
        "user": {
            "id": str(user['_id']),
            "email": user['email'],
            "name": user.get('name', ''),
            "role": user.get('role', 'user')
        }
    }), 200

@auth_bp.route('/api/admin/verify-token', methods=['GET'])
@jwt_required()
def verify_admin_token():
    """
    Verify admin JWT token and return admin details
    """
    current_user_id = get_jwt_identity()
    
    db = get_db()
    admin = db.users.find_one({"_id": ObjectId(current_user_id), "role": "admin"})
    
    if not admin:
        return jsonify({"success": False, "message": "Admin not found"}), 404
    
    return jsonify({
        "success": True,
        "admin": {
            "id": str(admin['_id']),
            "email": admin['email'],
            "name": admin.get('name', ''),
            "role": 'admin'
        }
    }), 200

@auth_bp.route('/api/refresh-token', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """
    Refresh access token using refresh token
    """
    current_user_id = get_jwt_identity()
    
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # Create new access token
    access_token = create_access_token(
        identity=str(user['_id']),
        additional_claims={
            'email': user['email'],
            'name': user.get('name', ''),
            'role': user.get('role', 'user')
        },
        expires_delta=datetime.timedelta(hours=24)
    )
    
    return jsonify({
        "success": True,
        "token": access_token
    }), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required(optional=True)
def get_current_user():
    """
    Get current user information based on JWT token
    """
    try:
        current_user_id = get_jwt_identity()
        
        # If no identity found, return anonymous user info
        if not current_user_id:
            return jsonify({
                "success": True,
                "user": None,
                "message": "No authentication token provided"
            }), 200
        
        db = get_db()
        # Handle potential ObjectId conversion errors
        try:
            user = db.users.find_one({"_id": ObjectId(current_user_id)})
        except Exception as e:
            print(f"Error converting user ID to ObjectId: {str(e)}")
            # Try string comparison as fallback
            user = db.users.find_one({"_id": current_user_id})
        
        if not user:
            return jsonify({
                "success": False, 
                "message": "User not found",
                "user_id": current_user_id
            }), 404
        
        # Return user data without sensitive information
        return jsonify({
            "success": True,
            "user": {
                "id": str(user['_id']),
                "email": user['email'],
                "name": user.get('name', ''),
                "role": user.get('role', 'user'),
                "phone": user.get('phone', ''),
                "profile_image": user.get('profile_image', ''),
                "verified": user.get('verified', False)
            }
        }), 200
    except Exception as e:
        # Log the error for debugging
        print(f"Error in /api/auth/me endpoint: {str(e)}")
        return jsonify({
            "success": False, 
            "message": "Authentication error", 
            "error": str(e)
        }), 200  # Return 200 instead of 500 to prevent client errors
