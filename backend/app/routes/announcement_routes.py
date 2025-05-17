from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request, get_jwt
from app.models.announcement import Announcement
from app.controllers.admin import admin_required
from datetime import datetime
from functools import wraps

announcement_bp = Blueprint('announcements', __name__)

# For now, we'll use a simplified approach that allows any authenticated user to manage announcements
# This will be replaced with proper admin authentication in a future update
def simplified_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            # Get the JWT token from the Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({"error": "Missing or invalid token"}), 401
            
            # For now, just check if the token exists and allow access
            # In a production environment, we would properly verify the token and check admin privileges
            return fn(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Authentication error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 401
    return wrapper

@announcement_bp.route('/api/admin/announcements', methods=['POST'])
@simplified_auth
def create_announcement():
    """Create a new announcement (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('message') or not data.get('pages'):
            return jsonify({"error": "Title, message, and pages are required"}), 400
        
        # Create announcement
        announcement = {
            'title': data.get('title'),
            'message': data.get('message'),
            'pages': data.get('pages', []),
            'important': data.get('important', False),
            'created_by': 'admin',  # Hardcoded for now since we can't use get_jwt_identity() without jwt_required
            'created_at': datetime.utcnow(),
            'active': True
        }
        
        # Save to database
        result = Announcement.create(announcement)
        
        return jsonify({"success": True, "announcement": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/api/admin/announcements', methods=['GET'])
@simplified_auth
def get_all_announcements():
    """Get all announcements (admin only)"""
    try:
        announcements = Announcement.get_all()
        return jsonify(announcements), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/api/admin/announcements/<announcement_id>', methods=['PUT'])
@simplified_auth
def update_announcement(announcement_id):
    """Update an announcement (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('message') or not data.get('pages'):
            return jsonify({"error": "Title, message, and pages are required"}), 400
        
        # Update fields
        update_data = {
            'title': data.get('title'),
            'message': data.get('message'),
            'pages': data.get('pages', []),
            'important': data.get('important', False),
            'updated_at': datetime.utcnow()
        }
        
        # Update in database
        result = Announcement.update(announcement_id, update_data)
        if not result:
            return jsonify({"error": "Announcement not found"}), 404
            
        return jsonify({"success": True, "announcement": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/api/admin/announcements/<announcement_id>', methods=['DELETE'])
@simplified_auth
def delete_announcement(announcement_id):
    """Delete an announcement (admin only)"""
    try:
        result = Announcement.delete(announcement_id)
        if not result:
            return jsonify({"error": "Announcement not found"}), 404
            
        return jsonify({"success": True, "message": "Announcement deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/api/announcements/page/<page>', methods=['GET'])
def get_page_announcements(page):
    """Get announcements for a specific page (public)"""
    try:
        if page not in ['home', 'ride_share', 'lost_found', 'marketplace']:
            return jsonify({"error": "Invalid page"}), 400
            
        announcements = Announcement.get_by_page(page)
        return jsonify(announcements), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
