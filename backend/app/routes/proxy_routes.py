"""
Proxy routes to handle API endpoint redirections
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ride_post import RidePost
from app.db import db
from bson import ObjectId
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

proxy_bp = Blueprint('proxy', __name__)

@proxy_bp.route('/posts', methods=['GET'])
@jwt_required()
def get_ride_posts():
    """Proxy endpoint to get all ride share posts"""
    try:
        # Get all ride posts from the database
        posts = list(db.ride_posts.find({}))
        
        # Convert ObjectId to string for JSON serialization
        for post in posts:
            post['_id'] = str(post['_id'])
            
        return jsonify(posts), 200
    except Exception as e:
        logging.error(f"Error in get_ride_posts: {str(e)}")
        return jsonify({"error": str(e)}), 500

@proxy_bp.route('/posts/<post_id>', methods=['PUT'])
@jwt_required()
def update_ride_post(post_id):
    """Proxy endpoint to update a ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Get post data from request
        data = request.get_json()
        
        # Update the post in the database
        result = db.ride_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Post not found or no changes made"}), 404
            
        return jsonify({"message": "Ride post updated successfully"}), 200
    except Exception as e:
        logging.error(f"Error in update_ride_post: {str(e)}")
        return jsonify({"error": str(e)}), 500

@proxy_bp.route('/posts/<post_id>', methods=['DELETE'])
@jwt_required()
def delete_ride_post(post_id):
    """Proxy endpoint to delete a ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Delete the post from the database
        result = db.ride_posts.delete_one({"_id": ObjectId(post_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Post not found"}), 404
            
        return jsonify({"message": "Ride post deleted successfully"}), 200
    except Exception as e:
        logging.error(f"Error in delete_ride_post: {str(e)}")
        return jsonify({"error": str(e)}), 500
