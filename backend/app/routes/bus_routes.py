from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.db import db
from bson import ObjectId
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

bus_bp = Blueprint('bus', __name__)

@bus_bp.route('/routes', methods=['GET'])
def get_routes():
    """Get all bus routes"""
    try:
        routes = list(db.bus_routes.find())
        for route in routes:
            route['_id'] = str(route['_id'])

        return jsonify(routes), 200
    except Exception as e:
        logging.error(f"Error in get_routes: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bus_bp.route('/routes', methods=['POST'])
@jwt_required()
def create_route():
    """Create a new bus route"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['route_name', 'start_point', 'end_point', 'stops', 'schedule']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Add timestamps
        from datetime import datetime
        data['created_at'] = datetime.utcnow()
        data['updated_at'] = datetime.utcnow()
        
        # Insert into database
        result = db.bus_routes.insert_one(data)
        
        return jsonify({
            "message": "Bus route created successfully",
            "route_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        logging.error(f"Error in create_route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bus_bp.route('/routes/<route_id>', methods=['GET'])
def get_route(route_id):
    """Get a specific bus route"""
    try:
        route = db.bus_routes.find_one({"_id": ObjectId(route_id)})
        
        if not route:
            return jsonify({"error": "Bus route not found"}), 404
            
        route['_id'] = str(route['_id'])
        
        return jsonify(route), 200
        
    except Exception as e:
        logging.error(f"Error in get_route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bus_bp.route('/routes/<route_id>', methods=['PUT'])
@jwt_required()
def update_route(route_id):
    """Update a bus route"""
    try:
        # Check if user is admin
        current_user_id = get_jwt_identity()
        admin_user = db.users.find_one({"_id": ObjectId(current_user_id), "role": "admin"})
        
        if not admin_user:
            return jsonify({"error": "Unauthorized. Admin access required"}), 403
            
        data = request.get_json()
        
        # Update timestamp
        from datetime import datetime
        data['updated_at'] = datetime.utcnow()
        
        # Update in database
        result = db.bus_routes.update_one(
            {"_id": ObjectId(route_id)},
            {"$set": data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Bus route not found"}), 404
            
        return jsonify({"message": "Bus route updated successfully"}), 200
        
    except Exception as e:
        logging.error(f"Error in update_route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bus_bp.route('/routes/<route_id>', methods=['DELETE'])
@jwt_required()
def delete_route(route_id):
    """Delete a bus route"""
    try:
        # Check if user is admin
        current_user_id = get_jwt_identity()
        admin_user = db.users.find_one({"_id": ObjectId(current_user_id), "role": "admin"})
        
        if not admin_user:
            return jsonify({"error": "Unauthorized. Admin access required"}), 403
            
        # Delete from database
        result = db.bus_routes.delete_one({"_id": ObjectId(route_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Bus route not found"}), 404
            
        return jsonify({"message": "Bus route deleted successfully"}), 200
        
    except Exception as e:
        logging.error(f"Error in delete_route: {str(e)}")
        return jsonify({"error": str(e)}), 500
