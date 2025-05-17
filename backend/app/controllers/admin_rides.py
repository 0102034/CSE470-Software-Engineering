from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.admin import admin_required
from pymongo import MongoClient
from bson import ObjectId
from app.db import get_db
import datetime

admin_rides_bp = Blueprint('admin_rides', __name__)

@admin_rides_bp.route('/rides', methods=['GET'])
@jwt_required()
@admin_required
def get_all_rides():
    """Get all ride share posts for admin"""
    try:
        db = get_db()
        rides = list(db.share_rides.find())
        
        # Process ride data and add user information
        for ride in rides:
            ride['_id'] = str(ride['_id'])
            
            # Convert user_id to string
            if 'user_id' in ride:
                user_id = ride['user_id']
                if isinstance(user_id, ObjectId):
                    ride['user_id'] = str(user_id)
                
                # Get user information
                user = db.users.find_one({'_id': ObjectId(ride['user_id'])})
                if user:
                    ride['user'] = {
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', 'Unknown'),
                        'profile_picture': user.get('profile_picture', None)
                    }
        
        return jsonify(rides), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_rides_bp.route('/rides/<ride_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_ride(ride_id):
    """Delete a ride share post (admin only)"""
    try:
        db = get_db()
        # Safely handle ObjectId conversion
        try:
            result = db.share_rides.delete_one({'_id': ObjectId(ride_id)})
        except:
            # If ride_id is not a valid ObjectId, return an error
            return jsonify({'error': 'Invalid ride ID format'}), 400
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Ride not found'}), 404
            
        return jsonify({'message': 'Ride deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_rides_bp.route('/bus-routes', methods=['GET'])
@jwt_required()
@admin_required
def get_all_bus_routes():
    """Get all bus routes for admin"""
    try:
        db = get_db()
        bus_routes = list(db.bus_routes.find())
        
        # Process bus route data
        for route in bus_routes:
            route['_id'] = str(route['_id'])
        
        return jsonify(bus_routes), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_rides_bp.route('/bus-routes', methods=['POST'])
@jwt_required()
@admin_required
def create_bus_route():
    """Create a new bus route (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'route', 'schedule']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        db = get_db()
        result = db.bus_routes.insert_one({
            'name': data['name'],
            'route': data['route'],
            'schedule': data['schedule'],
            'created_at': datetime.datetime.utcnow()
        })
        
        return jsonify({
            'message': 'Bus route created successfully',
            'route_id': str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_rides_bp.route('/bus-routes/<route_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_bus_route(route_id):
    """Delete a bus route (admin only)"""
    try:
        db = get_db()
        result = db.bus_routes.delete_one({'_id': ObjectId(route_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Bus route not found'}), 404
            
        return jsonify({'message': 'Bus route deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
