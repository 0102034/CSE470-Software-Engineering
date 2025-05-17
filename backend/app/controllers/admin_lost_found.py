from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.admin import admin_required
from pymongo import MongoClient
from bson import ObjectId
from app.db import get_db
import datetime

admin_lost_found_bp = Blueprint('admin_lost_found', __name__)

@admin_lost_found_bp.route('/lost-found', methods=['GET'])
@jwt_required()
@admin_required
def get_all_lost_found():
    """Get all lost and found items for admin"""
    try:
        db = get_db()
        items = list(db.lost_found_items.find())
        
        # Process item data and add user information
        for item in items:
            item['_id'] = str(item['_id'])
            
            # Convert user_id to string
            if 'user_id' in item:
                user_id = item['user_id']
                if isinstance(user_id, ObjectId):
                    item['user_id'] = str(user_id)
                
                # Get user information
                user = db.users.find_one({'_id': ObjectId(item['user_id'])})
                if user:
                    item['user'] = {
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', 'Unknown'),
                        'profile_picture': user.get('profile_picture', None)
                    }
        
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_lost_found_bp.route('/lost-items', methods=['GET'])
@jwt_required()
@admin_required
def get_lost_items():
    """Get all lost items for admin"""
    try:
        db = get_db()
        items = list(db.lost_found_items.find({'item_type': 'lost'}))
        
        # Process item data and add user information
        for item in items:
            item['_id'] = str(item['_id'])
            
            # Convert user_id to string
            if 'user_id' in item:
                user_id = item['user_id']
                if isinstance(user_id, ObjectId):
                    item['user_id'] = str(user_id)
                
                # Get user information
                user = db.users.find_one({'_id': ObjectId(item['user_id'])})
                if user:
                    item['user'] = {
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', 'Unknown'),
                        'profile_picture': user.get('profile_picture', None)
                    }
        
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_lost_found_bp.route('/found-items', methods=['GET'])
@jwt_required()
@admin_required
def get_found_items():
    """Get all found items for admin"""
    try:
        db = get_db()
        items = list(db.lost_found_items.find({'item_type': 'found'}))
        
        # Process item data and add user information
        for item in items:
            item['_id'] = str(item['_id'])
            
            # Convert user_id to string
            if 'user_id' in item:
                user_id = item['user_id']
                if isinstance(user_id, ObjectId):
                    item['user_id'] = str(user_id)
                
                # Get user information
                user = db.users.find_one({'_id': ObjectId(item['user_id'])})
                if user:
                    item['user'] = {
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', 'Unknown'),
                        'profile_picture': user.get('profile_picture', None)
                    }
        
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_lost_found_bp.route('/lost-found/<item_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_item(item_id):
    """Delete a lost & found item (admin only)"""
    try:
        db = get_db()
        result = db.lost_found_items.delete_one({'_id': ObjectId(item_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Item not found'}), 404
            
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_lost_found_bp.route('/lost-found/<item_id>', methods=['PUT', 'PATCH'])
@admin_lost_found_bp.route('/lost-items/<item_id>', methods=['PUT', 'PATCH'])
@admin_lost_found_bp.route('/found-items/<item_id>', methods=['PUT', 'PATCH'])
@jwt_required()
@admin_required
def update_item(item_id):
    """Update a lost & found item (admin only)"""
    try:
        db = get_db()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'category', 'location']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Prepare update data
        update_data = {
            "title": data['title'],
            "description": data['description'],
            "category": data['category'],
            "location": data['location'],
            "updated_at": datetime.datetime.utcnow()
        }
        
        # Optional fields
        if 'status' in data:
            update_data['status'] = data['status']
            
        if 'contact_info' in data:
            update_data['contact_info'] = data['contact_info']
        
        # Update the item
        result = db.lost_found_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Item not found"}), 404
            
        if result.modified_count > 0:
            # Get the updated item
            updated_item = db.lost_found_items.find_one({"_id": ObjectId(item_id)})
            if updated_item:
                updated_item['_id'] = str(updated_item['_id'])
                if 'user_id' in updated_item:
                    updated_item['user_id'] = str(updated_item['user_id'])
                return jsonify({
                    "message": "Item updated successfully",
                    "item": updated_item
                }), 200
            return jsonify({"message": "Item updated successfully"}), 200
        
        return jsonify({"message": "No changes made"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
