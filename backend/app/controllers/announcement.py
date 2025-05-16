from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.announcement import Announcement
from app.utils.role_utils import admin_required

announcement_bp = Blueprint('announcement', __name__)

@announcement_bp.route('', methods=['POST'])
@jwt_required()
@admin_required
def create_announcement():
    """Create a new announcement (admin only)"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('message'):
        return jsonify({"error": "Announcement message is required"}), 400
    
    if not data.get('pages') or not isinstance(data.get('pages'), list):
        return jsonify({"error": "Pages must be a non-empty list"}), 400
    
    try:
        announcement_id = Announcement.create_announcement(data)
        return jsonify({
            "message": "Announcement created successfully",
            "announcement_id": announcement_id
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('', methods=['GET'])
@jwt_required()
def get_all_announcements():
    """Get all announcements (admin only)"""
    try:
        announcements = Announcement.get_all_announcements()
        return jsonify({"announcements": announcements}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/page/<page>', methods=['GET'])
@jwt_required()
def get_announcements_by_page(page):
    """Get announcements for a specific page (for logged-in users)"""
    try:
        announcements = Announcement.get_announcements_by_page(page)
        return jsonify({"announcements": announcements}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/<announcement_id>', methods=['GET'])
@jwt_required()
def get_announcement(announcement_id):
    """Get a specific announcement by ID"""
    try:
        announcement = Announcement.get_announcement_by_id(announcement_id)
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404
        return jsonify({"announcement": announcement}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/<announcement_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_announcement(announcement_id):
    """Update an announcement (admin only)"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('message'):
        return jsonify({"error": "Announcement message is required"}), 400
    
    if not data.get('pages') or not isinstance(data.get('pages'), list):
        return jsonify({"error": "Pages must be a non-empty list"}), 400
    
    try:
        # Check if announcement exists
        announcement = Announcement.get_announcement_by_id(announcement_id)
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404
        
        # Update the announcement
        success = Announcement.update_announcement(announcement_id, data)
        if success:
            return jsonify({"message": "Announcement updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update announcement"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@announcement_bp.route('/<announcement_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_announcement(announcement_id):
    """Delete an announcement (admin only)"""
    try:
        # Check if announcement exists
        announcement = Announcement.get_announcement_by_id(announcement_id)
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404
        
        # Delete the announcement
        success = Announcement.delete_announcement(announcement_id)
        if success:
            return jsonify({"message": "Announcement deleted successfully"}), 200
        else:
            return jsonify({"error": "Failed to delete announcement"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
