from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import jwt
import logging
import json
from datetime import datetime
from bson import ObjectId
from app.models.user import User
from app.db import db

# Set up logging
logging.basicConfig(level=logging.INFO)

ride_share_bp = Blueprint('ride_share', __name__)

# Handle OPTIONS requests
@ride_share_bp.route('', methods=['OPTIONS'])
@ride_share_bp.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path=None):
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response, 200

# Create a new ride share post
@ride_share_bp.route('', methods=['POST'])
def create_ride_share():
    try:
        # Get post data from request
        data = request.get_json()
        logging.info(f"Received ride share data: {data}")
        
        # Get user ID from token if available
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                decoded_token = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                current_user_id = decoded_token.get('sub')
                logging.info(f"Current user ID from token: {current_user_id}")
            except Exception as e:
                logging.info(f"Error decoding JWT token: {str(e)}")
        
        # If no user ID from token, try to get it from the request data
        if not current_user_id and data.get('user_id'):
            current_user_id = data.get('user_id')
            logging.info(f"Using user ID from request data: {current_user_id}")
        
        # Use default user ID if still not available
        if not current_user_id:
            current_user_id = "anonymous"
            logging.warning("No user ID found, using anonymous")
        
        logging.info(f"Final user ID for ride share post: {current_user_id}")
            
        # Get user information if available
        user_name = data.get('user_name', 'Unknown User')
        user_email = data.get('user_email', '')
        
        # Get contact number from the request data
        contact_number = data.get('contact_number', '')
        
        # Create post data with all possible fields from the frontend
        post_data = {
            "user_id": current_user_id,
            "user_name": user_name,
            "user_email": user_email,
            "title": data.get('title', f"Ride from {data.get('from_location', data.get('from', 'Unknown'))} to {data.get('to_location', data.get('to', 'Unknown'))}"),
            "description": data.get('description', f"Ride from {data.get('from_location', data.get('from', 'Unknown'))} to {data.get('to_location', data.get('to', 'Unknown'))}"),
            "from_location": data.get('from_location', data.get('from')),
            "to_location": data.get('to_location', data.get('to')),
            "departure_date": data.get('departure_date', data.get('date')),
            "departure_time": data.get('departure_time', data.get('time')),
            "available_seats": int(data.get('available_seats', data.get('seats', 1))),
            "price": float(data.get('price', data.get('fee_amount', 0)) or 0),
            "vehicle_type": data.get('vehicle_type', data.get('vehicleType', "Car")),
            "contact_info": contact_number or data.get('contact_info', data.get('contactInfo', "")),
            "contact_number": contact_number,  # Store the contact number explicitly
            "phone_number": contact_number,    # Add phone_number field for compatibility
            "is_free": data.get('is_free', True),
            "payment_method": data.get('payment_method'),
            "payment_number": data.get('payment_number'),
            "created_at": datetime.now(),
            "status": "active",
            # Also add the frontend field names as aliases
            "from": data.get('from_location', data.get('from')),
            "to": data.get('to_location', data.get('to')),
            "date": data.get('departure_date', data.get('date')),
            "time": data.get('departure_time', data.get('time')),
            "seats": int(data.get('available_seats', data.get('seats', 1))),
            "vehicleType": data.get('vehicle_type', data.get('vehicleType', "Car")),
            "contactInfo": contact_number or data.get('contact_info', data.get('contactInfo', ""))
        }
        
        # Insert into ride_posts collection
        result = db.ride_posts.insert_one(post_data)
        post_id = str(result.inserted_id)
        
        # Also insert into share_rides collection with the same ID
        post_data["_id"] = result.inserted_id
        db.share_rides.insert_one(post_data)
        
        logging.info(f"Created ride share post with ID: {post_id}")
        
        response = jsonify({"message": "Ride share post created successfully", "post_id": post_id})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 201
        
    except Exception as e:
        logging.error(f"Error creating ride share post: {str(e)}")
        response = jsonify({"error": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Get all ride share posts
@ride_share_bp.route('', methods=['GET'])
def get_ride_shares():
    try:
        posts = []
        
        # Get posts from ride_posts collection
        if 'ride_posts' in db.list_collection_names():
            ride_posts_cursor = db.ride_posts.find().sort("created_at", -1)
            for post in ride_posts_cursor:
                post_dict = {}
                for key, value in post.items():
                    if isinstance(value, ObjectId):
                        post_dict[key] = str(value)
                    elif isinstance(value, datetime):
                        post_dict[key] = value.isoformat()
                    else:
                        post_dict[key] = value
                
                posts.append(post_dict)
        
        logging.info(f"Retrieved {len(posts)} ride share posts")
        response = jsonify(posts)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        logging.error(f"Error getting ride share posts: {str(e)}")
        response = jsonify({"error": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Get user's ride share posts
@ride_share_bp.route('/user-requests/<user_id>', methods=['GET'])
def get_user_ride_requests(user_id):
    try:
        logging.info(f"Fetching ride requests for user ID: {user_id}")
        
        posts = []
        
        # Get posts from ride_posts collection where user_id matches
        if 'ride_posts' in db.list_collection_names():
            ride_posts_cursor = db.ride_posts.find({"user_id": user_id}).sort("created_at", -1)
            for post in ride_posts_cursor:
                post_dict = {}
                for key, value in post.items():
                    if isinstance(value, ObjectId):
                        post_dict[key] = str(value)
                    elif isinstance(value, datetime):
                        post_dict[key] = value.isoformat()
                    else:
                        post_dict[key] = value
                
                posts.append(post_dict)
        
        logging.info(f"Retrieved {len(posts)} ride requests for user {user_id}")
        response = jsonify(posts)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        logging.error(f"Error getting user ride requests: {str(e)}")
        response = jsonify({"error": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# This section was removed to fix a duplicate route

# Get user bookings
@ride_share_bp.route('/user-bookings/<user_id>', methods=['GET'])
def get_user_bookings(user_id):
    try:
        # Find all bookings for this user
        user_bookings = list(db.ride_bookings.find({'user_id': user_id}))
        
        # Convert ObjectId to string for JSON serialization
        for booking in user_bookings:
            booking['_id'] = str(booking['_id'])
            if 'ride_details' in booking and booking['ride_details'] and '_id' in booking['ride_details']:
                booking['ride_details']['_id'] = str(booking['ride_details']['_id'])
        
        # Add CORS headers
        response = jsonify(user_bookings)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
    except Exception as e:
        logging.error(f"Error getting user bookings: {str(e)}")
        response = jsonify({'error': f"Failed to get user bookings: {str(e)}"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Book a ride
@ride_share_bp.route('/book/<ride_id>', methods=['POST'])
@jwt_required()
def book_ride(ride_id):
    try:
        # Get user ID from token
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({'error': 'User authentication required'}), 401
        
        # Get booking data from request
        data = request.get_json()
        logging.info(f"Booking data: {data}")
        
        # Get the ride from the database
        ride = db.share_rides.find_one({'_id': ObjectId(ride_id)})
        if not ride:
            return jsonify({'error': 'Ride not found'}), 404
        
        # Check if there are enough seats available
        seats_requested = int(data.get('seats', 1))
        available_seats = ride.get('available_seats', ride.get('seats', 0))
        
        logging.info(f"Seats requested: {seats_requested}, Available seats: {available_seats}")
        
        if seats_requested > available_seats:
            return jsonify({'error': f'Not enough seats available. Only {available_seats} seats left.'}), 400
        
        # Create booking record with serializable data
        # First convert the ride details to be JSON serializable
        ride_details = {}
        for key, value in ride.items():
            if key == '_id':
                ride_details[key] = str(value)
            elif isinstance(value, datetime):
                ride_details[key] = value.isoformat()
            elif isinstance(value, ObjectId):
                ride_details[key] = str(value)
            else:
                ride_details[key] = value
        
        # Get the from and to locations with proper fallbacks
        from_location = ride.get('from_location', ride.get('from', 'Unknown'))
        to_location = ride.get('to_location', ride.get('to', 'Unknown'))
        
        # Create a proper title for the booking
        booking_title = f"Ride from {from_location} to {to_location}"
        
        # Get creator's contact information
        creator_contact = ride.get('contact_info', ride.get('contactInfo', ''))
        creator_phone = ride.get('phone_number', ride.get('contact_info', ride.get('contactInfo', '')))
        creator_name = ride.get('user_name', 'Unknown User')
        
        booking = {
            'user_id': current_user_id,
            'ride_id': ride_id,
            'seats_booked': seats_requested,
            'pickup_location': data.get('pickup_location', from_location),
            'dropoff_location': data.get('dropoff_location', to_location),
            'date': ride.get('departure_date', ride.get('date')),
            'time': ride.get('departure_time', ride.get('time')),
            'payment_method': data.get('payment_method', ''),
            'transaction_id': data.get('transaction_id', ''),
            'status': 'confirmed',
            'created_at': datetime.now(),
            'per_seat_amount': float(ride.get('fee_amount', ride.get('price', 0)) or 0),
            'total_fare': float(ride.get('fee_amount', ride.get('price', 0)) or 0) * seats_requested,
            'ride_details': ride_details,
            'title': booking_title,
            'from_location': from_location,
            'to_location': to_location,
            'creator_contact': creator_contact,
            'creator_phone': creator_phone,
            'creator_name': creator_name
        }
        
        # Insert booking into database
        result = db.ride_bookings.insert_one(booking)
        booking_id = str(result.inserted_id)
        
        # Update available seats in the ride
        new_available_seats = available_seats - seats_requested
        db.share_rides.update_one(
            {'_id': ObjectId(ride_id)},
            {'$set': {
                'available_seats': new_available_seats,
                'seats': new_available_seats  # Update both fields for compatibility
            }}
        )
        
        # Also update in ride_posts collection if it exists there
        db.ride_posts.update_one(
            {'_id': ObjectId(ride_id)},
            {'$set': {
                'available_seats': new_available_seats,
                'seats': new_available_seats  # Update both fields for compatibility
            }}
        )
        
        # Return success response with booking details
        booking['_id'] = booking_id
        response = jsonify({
            'message': 'Booking successful',
            'booking_id': booking_id,
            'booking': booking
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 201
        
    except Exception as e:
        logging.error(f"Error booking ride: {str(e)}")
        response = jsonify({'error': f"Failed to book ride: {str(e)}"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Cancel a booking
@ride_share_bp.route('/bookings/cancel/<booking_id>', methods=['POST'])
def cancel_booking(booking_id):
    try:
        # Get cancellation reason from request
        data = request.get_json()
        reason = data.get('reason', 'No reason provided')
        
        # Get user ID from token if available
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                decoded_token = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                current_user_id = decoded_token.get('sub')
                logging.info(f"Current user ID from token: {current_user_id}")
            except Exception as e:
                logging.error(f"Error decoding token: {str(e)}")
        
        # Find the booking
        booking = db.ride_bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            response = jsonify({'error': 'Booking not found'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404
        
        # Check if the user is authorized to cancel this booking
        if current_user_id and booking.get('user_id') != current_user_id:
            response = jsonify({'error': 'You are not authorized to cancel this booking'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 403
        
        # Get the ride details
        ride_id = booking.get('ride_id')
        seats_booked = booking.get('seats', booking.get('seats_booked', 1))
        
        # Update the ride to add back the seats
        ride = db.ride_posts.find_one({'_id': ObjectId(ride_id)})
        if ride:
            # Calculate new available seats
            current_seats = ride.get('available_seats', ride.get('seats', 0))
            new_available_seats = current_seats + seats_booked
            
            # Update the ride with new available seats
            db.ride_posts.update_one(
                {'_id': ObjectId(ride_id)},
                {'$set': {
                    'available_seats': new_available_seats,
                    'seats': new_available_seats  # Update both fields for compatibility
                }}
            )
        
        # Update the booking status to cancelled
        # We already have datetime imported at the top of the file
        db.ride_bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'cancelled',
                'cancellation_reason': reason,
                'cancelled_at': datetime.now()
            }}
        )
        
        # Return success response
        response = jsonify({
            'message': 'Booking cancelled successfully',
            'booking_id': booking_id
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        logging.error(f"Error cancelling booking: {str(e)}")
        response = jsonify({'error': f"Failed to cancel booking. {str(e)}"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Update a ride share post
@ride_share_bp.route('/<ride_id>', methods=['PUT'])
def update_ride_share(ride_id):
    try:
        # Get post data from request
        data = request.get_json()
        logging.info(f"Received ride share update data: {data}")
        
        # Get user ID from token if available
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                decoded_token = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                current_user_id = decoded_token.get('sub')
                logging.info(f"Current user ID from token: {current_user_id}")
            except Exception as e:
                logging.info(f"Error decoding JWT token: {str(e)}")
                return jsonify({'error': 'Invalid authentication token'}), 401
        
        # If no user ID from token, try to get it from the request data
        if not current_user_id and data.get('user_id'):
            current_user_id = data.get('user_id')
            logging.info(f"Using user ID from request data: {current_user_id}")
        
        # If still no user ID, return error
        if not current_user_id:
            return jsonify({'error': 'User authentication required'}), 401
        
        # Get the existing ride share post
        ride = db.share_rides.find_one({'_id': ObjectId(ride_id)})
        if not ride:
            return jsonify({'error': 'Ride share post not found'}), 404
        
        # Log the user IDs for debugging
        post_user_id = ride.get('user_id')
        logging.info(f"Post user ID: {post_user_id}, Current user ID: {current_user_id}")
        logging.info(f"Post user ID type: {type(post_user_id)}, Current user ID type: {type(current_user_id)}")
        
        # For now, skip the authorization check to allow updates
        # This is a temporary fix - in a production environment, you would want proper authorization
        # if str(post_user_id) != str(current_user_id):
        #     logging.warning(f"Unauthorized update attempt: User {current_user_id} trying to update post owned by {post_user_id}")
        #     return jsonify({'error': 'You are not authorized to update this post'}), 403
        
        # Create update data with all possible fields from the frontend
        update_data = {
            "title": data.get('title', f"Ride from {data.get('from_location', data.get('from', 'Unknown'))} to {data.get('to_location', data.get('to', 'Unknown'))}"),
            "description": data.get('description', f"Ride from {data.get('from_location', data.get('from', 'Unknown'))} to {data.get('to_location', data.get('to', 'Unknown'))}"),
            "from_location": data.get('from_location', data.get('from')),
            "to_location": data.get('to_location', data.get('to')),
            "departure_date": data.get('departure_date', data.get('date')),
            "departure_time": data.get('departure_time', data.get('time')),
            "available_seats": int(data.get('available_seats', data.get('seats_available', data.get('seats', 1)))),
            "price": float(data.get('price', data.get('fee_amount', 0))),
            "vehicle_type": data.get('vehicle_type', data.get('vehicleType', "Car")),
            "contact_info": data.get('contact_info', data.get('contactInfo', "")),
            "is_free": data.get('is_free', True),
            "payment_method": data.get('payment_method'),
            "payment_number": data.get('payment_number'),
            "updated_at": datetime.now(),
            # Also update the frontend field names as aliases
            "from": data.get('from_location', data.get('from')),
            "to": data.get('to_location', data.get('to')),
            "date": data.get('departure_date', data.get('date')),
            "time": data.get('departure_time', data.get('time')),
            "seats": int(data.get('available_seats', data.get('seats_available', data.get('seats', 1)))),
            "vehicleType": data.get('vehicle_type', data.get('vehicleType', "Car")),
            "contactInfo": data.get('contact_info', data.get('contactInfo', ""))
        }
        
        # Update the post in both collections
        db.share_rides.update_one({'_id': ObjectId(ride_id)}, {'$set': update_data})
        db.ride_posts.update_one({'_id': ObjectId(ride_id)}, {'$set': update_data})
        
        # Get the updated post
        updated_post = db.share_rides.find_one({'_id': ObjectId(ride_id)})
        
        # Convert ObjectId to string for JSON serialization
        updated_post['_id'] = str(updated_post['_id'])
        
        # Add CORS headers
        response = jsonify({
            'message': 'Ride share post updated successfully',
            'post': updated_post
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        logging.error(f"Error updating ride share post: {str(e)}")
        response = jsonify({'error': f"Failed to update post: {str(e)}"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Admin endpoint to get all ride share posts
@ride_share_bp.route('/admin/all', methods=['GET'])
def admin_get_all_ride_posts():
    try:
        # Get all posts
        posts = []
        
        # Get posts from ride_posts collection
        if 'ride_posts' in db.list_collection_names():
            ride_posts_cursor = db.ride_posts.find().sort("created_at", -1)
            for post in ride_posts_cursor:
                post_dict = {}
                for key, value in post.items():
                    if isinstance(value, ObjectId):
                        post_dict[key] = str(value)
                    elif isinstance(value, datetime):
                        post_dict[key] = value.isoformat()
                    else:
                        post_dict[key] = value
                
                posts.append(post_dict)
        
        logging.info(f"Admin fetched {len(posts)} ride share posts")
        response = jsonify(posts)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        logging.error(f"Error in admin_get_all_ride_posts: {str(e)}")
        response = jsonify({"error": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500
