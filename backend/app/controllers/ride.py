from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
from bson import ObjectId
import datetime

ride_bp = Blueprint('ride', __name__)
client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

@ride_bp.route('/routes', methods=['GET'])
def get_routes():
    routes = list(db.bus_routes.find())
    for route in routes:
        route['_id'] = str(route['_id'])
    
    return jsonify(routes), 200

@ride_bp.route('/routes', methods=['POST'])
@jwt_required()
def create_route():
    data = request.get_json()
    
    # Validate request data
    required_fields = ['name', 'start_location', 'end_location', 'schedule', 'fare']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400
    
    # Create route
    new_route = {
        'name': data['name'],
        'start_location': data['start_location'],
        'end_location': data['end_location'],
        'schedule': data['schedule'],
        'fare': data['fare'],
        'stops': data.get('stops', []),
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow(),
        'active': True
    }
    
    result = db.bus_routes.insert_one(new_route)
    
    return jsonify({
        'message': 'Route created successfully',
        'route_id': str(result.inserted_id)
    }), 201

@ride_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    user_id = get_jwt_identity()
    
    bookings = list(db.ride_bookings.find({'user_id': user_id}))
    for booking in bookings:
        booking['_id'] = str(booking['_id'])
        
        # Get route details
        route = db.bus_routes.find_one({'_id': ObjectId(booking['route_id'])})
        if route:
            route['_id'] = str(route['_id'])
            booking['route'] = route
    
    return jsonify(bookings), 200

@ride_bp.route('/bookings', methods=['POST'])
@jwt_required()
def create_booking():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Validate request data
    required_fields = ['route_id', 'date', 'time', 'pickup_location', 'dropoff_location']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400
    
    # Check if route exists
    route = db.bus_routes.find_one({'_id': ObjectId(data['route_id'])})
    if not route:
        return jsonify({'error': 'Route not found'}), 404
    
    # Create booking
    new_booking = {
        'user_id': user_id,
        'route_id': data['route_id'],
        'date': data['date'],
        'time': data['time'],
        'pickup_location': data['pickup_location'],
        'dropoff_location': data['dropoff_location'],
        'seats': data.get('seats', 1),
        'status': 'pending',
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    result = db.ride_bookings.insert_one(new_booking)
    
    return jsonify({
        'message': 'Booking created successfully',
        'booking_id': str(result.inserted_id)
    }), 201

@ride_bp.route('/bookings/<booking_id>', methods=['PUT'])
@jwt_required()
def update_booking(booking_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Check if booking exists and belongs to user
        booking = db.ride_bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized to update this booking'}), 403
        
        # Can only update if status is pending
        if booking['status'] != 'pending':
            return jsonify({'error': 'Cannot update confirmed or cancelled booking'}), 400
        
        # Update fields
        update_data = {'updated_at': datetime.datetime.utcnow()}
        allowed_fields = ['date', 'time', 'pickup_location', 'dropoff_location', 'seats']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        db.ride_bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': update_data}
        )
        
        return jsonify({'message': 'Booking updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@ride_bp.route('/bookings/<booking_id>', methods=['DELETE'])
@jwt_required()
def cancel_booking(booking_id):
    try:
        user_id = get_jwt_identity()
        
        # Check if booking exists and belongs to user
        booking = db.ride_bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized to cancel this booking'}), 403
        
        # Update status to cancelled
        db.ride_bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'cancelled',
                'updated_at': datetime.datetime.utcnow()
            }}
        )
        
        return jsonify({'message': 'Booking cancelled successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@ride_bp.route('/share', methods=['POST'])
@jwt_required()
def create_share_ride():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Validate request data
    required_fields = ['from_location', 'to_location', 'date', 'time', 'vehicle_type', 'seats_available', 'price_per_seat']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400
    
    # Create share ride
    new_share_ride = {
        'user_id': user_id,
        'from_location': data['from_location'],
        'to_location': data['to_location'],
        'date': data['date'],
        'time': data['time'],
        'vehicle_type': data['vehicle_type'],
        'seats_available': data['seats_available'],
        'price_per_seat': data['price_per_seat'],
        'description': data.get('description', ''),
        'status': 'active',
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    result = db.share_rides.insert_one(new_share_ride)
    
    return jsonify({
        'message': 'Share ride created successfully',
        'ride_id': str(result.inserted_id)
    }), 201

@ride_bp.route('/share', methods=['GET'])
def get_share_rides():
    """Get all active share rides (public feed)"""
    rides = list(db.share_rides.find({'status': 'active'}))
    for ride in rides:
        ride['_id'] = str(ride['_id'])
        ride['user_id'] = str(ride['user_id'])
    return jsonify(rides), 200

@ride_bp.route('/share/user', methods=['GET'])
@jwt_required()
def get_user_share_rides():
    """Get share rides posted by the currently logged-in user"""
    user_id = get_jwt_identity()
    rides = list(db.share_rides.find({'user_id': user_id}))
    for ride in rides:
        ride['_id'] = str(ride['_id'])
        ride['user_id'] = str(ride['user_id'])
    return jsonify(rides), 200

@ride_bp.route('/share/<ride_id>', methods=['PUT'])
@jwt_required()
def update_share_ride(ride_id):
    """Update a share ride (only by the owner or admin)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    ride = db.share_rides.find_one({'_id': ObjectId(ride_id)})
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    is_owner = str(ride['user_id']) == user_id
    # Check admin
    user = db.users.find_one({'_id': ObjectId(user_id)})
    is_admin = user and user.get('role') == 'admin'
    if not (is_owner or is_admin):
        return jsonify({'error': 'Unauthorized'}), 403
    allowed_fields = ['from_location', 'to_location', 'date', 'time', 'vehicle_type', 'seats_available', 'price_per_seat', 'description', 'status']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data['updated_at'] = datetime.datetime.utcnow()
    db.share_rides.update_one({'_id': ObjectId(ride_id)}, {'$set': update_data})
    updated_ride = db.share_rides.find_one({'_id': ObjectId(ride_id)})
    updated_ride['_id'] = str(updated_ride['_id'])
    updated_ride['user_id'] = str(updated_ride['user_id'])
    return jsonify(updated_ride), 200

@ride_bp.route('/share/<ride_id>', methods=['DELETE'])
@jwt_required()
def delete_share_ride(ride_id):
    """Delete a share ride (only by the owner or admin)"""
    user_id = get_jwt_identity()
    ride = db.share_rides.find_one({'_id': ObjectId(ride_id)})
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    is_owner = str(ride['user_id']) == user_id
    user = db.users.find_one({'_id': ObjectId(user_id)})
    is_admin = user and user.get('role') == 'admin'
    if not (is_owner or is_admin):
        return jsonify({'error': 'Unauthorized'}), 403
    db.share_rides.delete_one({'_id': ObjectId(ride_id)})
    return jsonify({'message': 'Share ride deleted successfully'}), 200

# ADMIN: get all share rides (including inactive/removed)
@ride_bp.route('/share/admin/all', methods=['GET'])
@jwt_required()
def admin_get_all_share_rides():
    try:
        # Get admin info from token
        from flask_jwt_extended import decode_token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
            
        token = auth_header.split(' ')[1]
        decoded = decode_token(token)
        
        # Check if it's an admin token
        if decoded.get('role') != 'admin' or decoded.get('sub') != '470@gmail.com':
            return jsonify({'error': 'Admin privileges required'}), 403
            
        # Fetch all ride shares
        rides = list(db.share_rides.find())
        
        # Process ride data
        for ride in rides:
            ride['_id'] = str(ride['_id'])
            ride['user_id'] = str(ride['user_id'])
            
            # Add user information
            try:
                ride_user = db.users.find_one({'_id': ObjectId(ride['user_id'])})
                if ride_user:
                    ride['user'] = {
                        'name': ride_user.get('name', 'Unknown'),
                        'email': ride_user.get('email', 'No email'),
                        '_id': str(ride_user['_id'])
                    }
            except Exception:
                # If user info can't be fetched, add placeholder
                ride['user'] = {
                    'name': 'Unknown User',
                    'email': 'No email available'
                }
        
        return jsonify(rides), 200
            
    except Exception as e:
        return jsonify({'error': f'Error accessing ride share data: {str(e)}'}), 500
    