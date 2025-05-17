from flask import Blueprint, jsonify, request, current_app
from bson.objectid import ObjectId
from .. import limiter, cache
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.admin import admin_required
from app.db import get_db
import os
import datetime

admin_marketplace_bp = Blueprint('admin_marketplace', __name__)

@admin_marketplace_bp.route('/marketplace/items/<item_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_item(item_id):
    """Update a marketplace item (admin only)"""
    try:
        db = get_db()
        data = request.get_json()
        
        # Try to find the item by ObjectId
        try:
            item = db.marketplace_items.find_one({'_id': ObjectId(item_id)})
        except:
            # If not a valid ObjectId, try string ID
            item = db.marketplace_items.find_one({'_id': item_id})
            
        if not item:
            return jsonify({'error': 'Item not found'}), 404
            
        # Check if the item is sold - admins should not edit sold items
        if item.get('sold', False):
            return jsonify({'error': 'Cannot edit sold items'}), 400
        
        # Prepare update data
        update_data = {}
        allowed_fields = ['title', 'description', 'price', 'category', 'condition', 'tags']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Update item in database
        result = db.marketplace_items.update_one(
            {'_id': ObjectId(item_id)},
            {'$set': update_data}
        )
        
        # Clear all related caches
        cache.delete('view/api/marketplace/items')
        cache.delete(f'view/api/marketplace/items/{item_id}')
        cache.delete_many('view/api/marketplace/*')
        cache.delete_many('view/api/admin/*')
        
        return jsonify({'message': 'Item updated successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Admin update marketplace item error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_marketplace_bp.route('/marketplace/items/<item_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_item(item_id):
    """Delete a marketplace item (admin only)"""
    try:
        db = get_db()
        
        # Try to find the item by ObjectId
        try:
            item = db.marketplace_items.find_one({'_id': ObjectId(item_id)})
        except:
            # If not a valid ObjectId, try string ID
            item = db.marketplace_items.find_one({'_id': item_id})
            
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Delete images if they exist
        if 'images' in item:
            for image_url in item['images']:
                try:
                    image_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', '../uploads'), image_url.lstrip('/uploads/'))
                    if os.path.exists(image_path):
                        os.remove(image_path)
                except Exception as e:
                    current_app.logger.error(f"Error deleting image {image_url}: {str(e)}")
        
        # Delete item from database
        db.marketplace_items.delete_one({'_id': ObjectId(item_id)})
        
        # Clear all related caches
        cache.delete('view/api/marketplace/items')
        cache.delete(f'view/api/marketplace/items/{item_id}')
        cache.delete_many('view/api/marketplace/*')
        cache.delete_many('view/api/admin/*')
        
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Admin delete marketplace item error: {str(e)}")
        return jsonify({"error": str(e)}), 500
