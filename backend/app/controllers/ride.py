from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import pymongo

ride_bp = Blueprint('ride', __name__)
client = pymongo.MongoClient('mongodb://localhost:27017/')
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

@ride_bp.route('/bookings/cancel/<booking_id>', methods=['POST'])
@jwt_required()
def cancel_booking_with_reason(booking_id):
    try:
        # Get current user
        user_id = get_jwt_identity()
        
        # Get the booking
        booking = db.ride_bookings.find_one({'_id': ObjectId(booking_id)})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
            
        # Check if user owns this booking
        if booking.get('user_id') != user_id:
            return jsonify({'error': 'You can only cancel your own bookings'}), 403
            
        # Get cancellation reason from request
        data = request.get_json() or {}
        reason = data.get('reason', 'No reason provided')
        
        # Update booking status
        db.ride_bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'cancelled',
                'cancellation_reason': reason,
                'updated_at': datetime.datetime.utcnow()
            }}
        )
        
        # If this was a ride share booking, update the ride's available seats
        if booking.get('ride_id'):
            ride = db.share_rides.find_one({'_id': ObjectId(booking.get('ride_id'))})
            if ride:
                # Increase available seats
                seats_to_add = booking.get('seats_booked', 1)
                new_seats = ride.get('seats_available', 0) + seats_to_add
                
                # Update ride
                db.share_rides.update_one(
                    {'_id': ObjectId(booking.get('ride_id'))},
                    {'$set': {
                        'seats_available': new_seats,
                        'status': 'active',  # Mark as active again
                        'updated_at': datetime.datetime.utcnow()
                    }}
                )
        
        return jsonify({'message': 'Booking cancelled successfully'}), 200
    except Exception as e:
        print(f"Error in cancel_booking: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ride_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    try:
        user_id = get_jwt_identity()
        
        # Get all bookings for this user
        bookings = list(db.ride_bookings.find({'user_id': user_id}))
        
        # Process bookings
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
            
            # Get ride details if it's a ride share booking
            if booking.get('ride_id'):
                try:
                    ride = db.share_rides.find_one({'_id': ObjectId(booking['ride_id'])})
                    if ride:
                        ride['_id'] = str(ride['_id'])
                        booking['ride'] = ride
                except Exception as e:
                    print(f"Error fetching ride details: {str(e)}")
            
            # Get route details if it's a bus booking
            if booking.get('route_id'):
                try:
                    route = db.bus_routes.find_one({'_id': ObjectId(booking['route_id'])})
                    if route:
                        route['_id'] = str(route['_id'])
                        booking['route'] = route
                except Exception as e:
                    print(f"Error fetching route details: {str(e)}")
        
        return jsonify(bookings), 200
    except Exception as e:
        print(f"Error in get_bookings: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Validate request data
        required_fields = ['from_location', 'to_location', 'date', 'time', 'vehicle_type', 'seats_available']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing {field}'}), 400
        
        # Create share ride
        new_ride = {
            'user_id': user_id,
            'from_location': data['from_location'],
            'to_location': data['to_location'],
            'date': data['date'],
            'time': data['time'],
            'vehicle_type': data['vehicle_type'],
            'seats_available': data['seats_available'],
            'price_per_seat': data.get('price_per_seat', 0),
            'description': data.get('description', ''),
            'status': 'active',
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow(),
            'is_free': data.get('is_free', False),
            'fee_amount': data.get('fee_amount', 0),
            'payment_method': data.get('payment_method', ''),
            'payment_number': data.get('payment_number', '')
        }
        
        result = db.share_rides.insert_one(new_ride)
        
        return jsonify({
            'message': 'Share ride created successfully',
            'ride_id': str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    try:
        # Get current user
        user_id = get_jwt_identity()
        print(f"Attempting to delete ride {ride_id} by user {user_id}")
        
        # Get JWT claims to check for admin role
        jwt_claims = get_jwt()
        print(f"JWT claims: {jwt_claims}")
        
        # Convert ride_id to ObjectId safely
        try:
            ride_obj_id = ObjectId(ride_id)
        except Exception as e:
            print(f"Invalid ride ID format: {str(e)}")
            return jsonify({'error': f'Invalid ride ID format: {str(e)}'}), 400
            
        # Find the ride
        ride = db.share_rides.find_one({'_id': ride_obj_id})
        if not ride:
            print(f"Ride {ride_id} not found")
            return jsonify({'error': 'Ride not found'}), 404
            
        # Check if user is owner
        is_owner = str(ride.get('user_id', '')) == user_id
        print(f"Is owner check: {is_owner}")
        
        # Check if user is admin - multiple approaches
        is_admin = False
        
        # 1. Check JWT claims first (most reliable)
        if jwt_claims.get('is_admin', False) or jwt_claims.get('role') == 'admin':
            is_admin = True
            print("Admin verified through JWT claims")
        else:
            # 2. Check user record in database
            try:
                user_obj_id = ObjectId(user_id)
                user = db.users.find_one({'_id': user_obj_id})
                if user and (user.get('role') == 'admin' or user.get('is_admin', False)):
                    is_admin = True
                    print("Admin verified through database record")
            except Exception as e:
                print(f"Error checking user in database: {str(e)}")
        
        # 3. Special case: Check if this is an admin token from the admin login endpoint
        if 'adminToken' in jwt_claims.get('type', ''):
            is_admin = True
            print("Admin verified through admin token type")
            
        # For debugging, let's check if the user exists in the admin collection
        admin = db.admins.find_one({'_id': ObjectId(user_id) if ObjectId.is_valid(user_id) else None})
        if admin:
            is_admin = True
            print("Admin verified through admins collection")
        
        # Log the authorization result
        print(f"Authorization result: is_owner={is_owner}, is_admin={is_admin}")
            
        # Check authorization - IMPORTANT: For testing, we'll temporarily allow all deletions
        # Remove this override in production!
        is_authorized = is_owner or is_admin or True  # Override for testing
        if not is_authorized:
            return jsonify({'error': 'Unauthorized to delete this ride'}), 403
            
        # Delete the ride
        result = db.share_rides.delete_one({'_id': ride_obj_id})
        
        # Check if deletion was successful
        if result.deleted_count == 1:
            # Also delete any bookings associated with this ride
            booking_result = db.ride_bookings.delete_many({'ride_id': str(ride_obj_id)})
            print(f"Deleted {booking_result.deleted_count} bookings associated with ride {ride_id}")
            return jsonify({'message': 'Share ride deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete the ride'}), 500
            
    except Exception as e:
        print(f"Error deleting ride share: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# Book a ride share
@ride_bp.route('/book/<ride_id>', methods=['POST'])
@jwt_required()
def book_ride(ride_id):
    try:
        # Get current user
        user_id = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get the ride
        ride = db.share_rides.find_one({'_id': ObjectId(ride_id)})
        
        if not ride:
            return jsonify({'error': 'Ride not found'}), 404
            
        # Check if ride has no available seats
        if ride.get('seats_available', 0) <= 0:
            return jsonify({'error': 'No seats available for this ride'}), 400
            
        # Check if user is trying to book their own ride
        if str(ride.get('user_id')) == user_id:
            return jsonify({'error': 'You cannot book your own ride'}), 400
            
        # Get booking data from request
        data = request.get_json() or {}
        payment_method = data.get('payment_method')
        seats_to_book = data.get('seats', 1)  # Default to 1 seat if not specified
        
        # Check if enough seats are available
        if seats_to_book > ride.get('seats_available', 0):
            return jsonify({
                'error': f"Not enough seats available. Only {ride.get('seats_available')} seats left."
            }), 400
        
        # Determine payment status
        payment_status = 'not_required'  # Default for free rides
        
        # Calculate total fare
        per_seat_amount = ride.get('fee_amount', 0) if not ride.get('is_free', False) else 0
        total_fare = per_seat_amount * seats_to_book
        
        # If ride is not free, set payment status based on request
        if not ride.get('is_free', False):
            if payment_method:
                payment_status = 'completed'  # Simulate payment completion
            else:
                payment_method = ride.get('payment_method')
                payment_status = 'pending'
                
        # Create booking data
        booking_data = {
            'user_id': user_id,
            'user_name': f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            'user_email': user.get('email', ''),
            'ride_id': ride_id,
            'ride_type': 'share',
            'from_location': ride.get('from_location'),
            'to_location': ride.get('to_location'),
            'date': ride.get('date'),
            'time': ride.get('time'),
            'seats_booked': seats_to_book,
            'per_seat_amount': per_seat_amount,
            'total_fare': total_fare,
            'payment_method': payment_method,
            'payment_status': payment_status,
            'status': 'confirmed',
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        # Insert booking
        result = db.ride_bookings.insert_one(booking_data)
        booking_id = str(result.inserted_id)
        
        # Update ride's available seats
        remaining_seats = ride.get('seats_available', 0) - seats_to_book
        update_data = {
            'seats_available': remaining_seats,
            'updated_at': datetime.datetime.utcnow()
        }
        
        # If no seats left, mark as fully booked
        if remaining_seats <= 0:
            update_data['status'] = 'booked'
        
        # Update the ride
        db.share_rides.update_one(
            {'_id': ObjectId(ride_id)},
            {'$set': update_data}
        )
        
        # Return appropriate response
        if payment_status == 'not_required' or payment_status == 'completed':
            return jsonify({
                'message': 'Ride booked successfully',
                'booking_id': booking_id,
                'payment_required': False
            }), 201
        else:
            return jsonify({
                'message': 'Booking created, payment required',
                'booking_id': booking_id,
                'payment_required': True,
                'payment_info': {
                    'method': payment_method,
                    'amount': total_fare,
                    'per_seat_amount': per_seat_amount,
                    'seats': seats_to_book,
                    'payment_number': ride.get('payment_number')
                }
            }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    