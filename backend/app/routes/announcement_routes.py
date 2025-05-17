from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.announcement import Announcement
from app.models.user import User
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

announcement_bp = Blueprint('announcement', __name__)

@announcement_bp.route('', methods=['GET'])
def get_announcements():
    """Get all announcements or filter by page"""
    try:
        page = request.args.get('page')
        
        if page:
            announcements = Announcement.get_announcements_by_page(page)
        else:
            announcements = Announcement.get_all_announcements()
            
        return jsonify(announcements), 200
    except Exception as e:
        logging.error(f"Error in get_announcements: {str(e)}")
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/<announcement_id>', methods=['GET'])
def get_announcement(announcement_id):
    """Get a specific announcement by ID"""
    try:
        announcement = Announcement.get_announcement_by_id(announcement_id)
        
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404
            
        return jsonify(announcement), 200
    except Exception as e:
        logging.error(f"Error in get_announcement: {str(e)}")
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('', methods=['POST'])
@jwt_required()
def create_announcement():
    """Create a new announcement (admin only)"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.get_user_by_id(current_user_id)
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized. Admin access required"}), 403
        
        # Get announcement data
        data = request.get_json()
        
        # Validate required fields
        if not data.get('message') or not data.get('pages'):
            return jsonify({"error": "Message and pages are required"}), 400
        
        # Create announcement
        announcement_id = Announcement.create_announcement(data)
        
        return jsonify({
            "message": "Announcement created successfully",
            "announcement_id": announcement_id
        }), 201
    except Exception as e:
        logging.error(f"Error in create_announcement: {str(e)}")
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/<announcement_id>', methods=['PUT'])
@jwt_required()
def update_announcement(announcement_id):
    """Update an announcement (admin only)"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.get_user_by_id(current_user_id)
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized. Admin access required"}), 403
        
        # Get announcement data
        data = request.get_json()
        
        # Update announcement
        success = Announcement.update_announcement(announcement_id, data)
        
        if not success:
            return jsonify({"error": "Announcement not found or no changes made"}), 404
        
        return jsonify({"message": "Announcement updated successfully"}), 200
    except Exception as e:
        logging.error(f"Error in update_announcement: {str(e)}")
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/<announcement_id>', methods=['DELETE'])
@jwt_required()
def delete_announcement(announcement_id):
    """Delete an announcement (admin only)"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.get_user_by_id(current_user_id)
        
        # Check if user is admin
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized. Admin access required"}), 403
        
        # Delete announcement
        success = Announcement.delete_announcement(announcement_id)
        
        if not success:
            return jsonify({"error": "Announcement not found"}), 404
        
        return jsonify({"message": "Announcement deleted successfully"}), 200
    except Exception as e:
        logging.error(f"Error in delete_announcement: {str(e)}")
        return jsonify({"error": str(e)}), 500
