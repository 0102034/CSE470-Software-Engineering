from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ride_post import RidePost
from app.models.booking import Booking
from app.models.user import User
from app.db import db
from bson import ObjectId
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

ride_share_bp = Blueprint('ride_share', __name__)

@ride_share_bp.route('/posts', methods=['POST'])
@jwt_required()
def create_ride_post():
    """Create a new ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        # Create an instance of the User class and call the method on it
        user_model = User()
        user = user_model.get_user_by_id(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get post data from request
        data = request.get_json()

        # Add user information
        data["user_id"] = current_user_id
        data["user_name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        data["user_email"] = user.get('email', '')

        # Create the post
        post_id = RidePost.create_post(data)

        return jsonify({"message": "Ride post created successfully", "post_id": post_id}), 201

    except Exception as e:
        logging.error(f"Error in create_ride_post: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/posts', methods=['GET'])
def get_ride_posts():
    """Get all ride share posts with optional filtering"""
    try:
        # Get filter criteria from query parameters
        filter_criteria = {}

        if request.args.get('from_location'):
            filter_criteria['from_location'] = request.args.get('from_location')

        if request.args.get('to_location'):
            filter_criteria['to_location'] = request.args.get('to_location')

        if request.args.get('departure_date'):
            filter_criteria['departure_date'] = request.args.get('departure_date')

        if request.args.get('status'):
            filter_criteria['status'] = request.args.get('status')

        # Get posts with filters
        posts = RidePost.get_all_posts(filter_criteria)
        
        # Log for debugging
        logging.info(f"Fetched {len(posts)} ride posts")
        
        # Get current user ID from token if available
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                current_user_id = get_jwt_identity()
                logging.info(f"Current user ID: {current_user_id}")
            except Exception as e:
                logging.info(f"No valid JWT token: {str(e)}")
        
        # Add a flag to indicate if the current user is the creator of each post
        for post in posts:
            post['is_creator'] = current_user_id == post.get('user_id')
            logging.info(f"Post {post.get('_id')}: is_creator = {post['is_creator']}")

        return jsonify(posts), 200

    except Exception as e:
        logging.error(f"Error in get_ride_posts: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/posts/<post_id>', methods=['GET'])
def get_ride_post(post_id):
    """Get a specific ride share post by ID"""
    try:
        post = RidePost.get_post_by_id(post_id)

        if not post:
            return jsonify({"error": "Ride post not found"}), 404

        # Get current user ID from token if available
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                current_user_id = get_jwt_identity()
            except Exception as e:
                logging.info(f"No valid JWT token: {str(e)}")
        
        # Add is_creator flag
        post['is_creator'] = current_user_id == post.get('user_id')
        logging.info(f"Post {post_id}: is_creator = {post['is_creator']}")

        return jsonify(post), 200

    except Exception as e:
        logging.error(f"Error in get_ride_post: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/user-posts/<user_id>', methods=['GET'])
@ride_share_bp.route('/posts/user/<user_id>', methods=['GET'])
def get_user_ride_posts(user_id):
    """Get all ride share posts created by a user"""
    try:
        # Get current user ID from token if available
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                current_user_id = get_jwt_identity()
                logging.info(f"Current user ID: {current_user_id}")
            except Exception as e:
                logging.info(f"No valid JWT token: {str(e)}")
        
        logging.info(f"Fetching posts for user {user_id}")
        posts = RidePost.get_user_posts(user_id)
        
        # Add is_creator flag to each post
        for post in posts:
            post['is_creator'] = current_user_id == post.get('user_id')
        
        logging.info(f"Fetched {len(posts)} posts for user {user_id}")
        return jsonify(posts), 200

    except Exception as e:
        logging.error(f"Error in get_user_ride_posts: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/posts/<post_id>', methods=['PUT'])
@jwt_required()
def update_ride_post(post_id):
    """Update a ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()

        # Get the post
        post = RidePost.get_post_by_id(post_id)

        if not post:
            return jsonify({"error": "Ride post not found"}), 404

        # Check if the user is the creator of the post
        if post.get('user_id') != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Get post data from request
        data = request.get_json()

        # Update the post
        success = RidePost.update_post(post_id, data)

        if success:
            return jsonify({"message": "Ride post updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update ride post"}), 500

    except Exception as e:
        logging.error(f"Error in update_ride_post: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/posts/<post_id>', methods=['DELETE'])
@jwt_required()
def delete_ride_post(post_id):
    """Delete a ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()

        # Get the post
        post = RidePost.get_post_by_id(post_id)

        if not post:
            return jsonify({"error": "Ride post not found"}), 404

        # Check if the user is the creator of the post or an admin
        if post.get('user_id') != current_user_id:
            # Check if the user is an admin
            user_model = User()
            current_user = user_model.get_user_by_id(current_user_id)
            if not current_user or current_user.get('role') != 'admin':
                return jsonify({"error": "Unauthorized"}), 403

        # Delete the post
        success = RidePost.delete_post(post_id)

        if success:
            return jsonify({"message": "Ride post deleted successfully"}), 200
        else:
            return jsonify({"error": "Failed to delete ride post"}), 500

    except Exception as e:
        logging.error(f"Error in delete_ride_post: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/posts/<post_id>/book', methods=['POST'])
@jwt_required()
def book_ride(post_id):
    """Book a ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user_model = User()
        user = user_model.get_user_by_id(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the post
        post = RidePost.get_post_by_id(post_id)

        if not post:
            return jsonify({"error": "Ride post not found"}), 404

        # Check if the post is already booked
        if post.get('status') == 'booked':
            return jsonify({"error": "This ride is already booked"}), 400

        # Check if the user is trying to book their own post
        if post.get('user_id') == current_user_id:
            return jsonify({"error": "You cannot book your own ride post"}), 400

        # Get payment information from the request if available
        data = request.get_json() or {}
        payment_method = data.get('payment_method')
        
        # Determine payment status based on ride settings
        payment_status = "not_required"  # Default for free rides
        
        # If the ride is not free, set payment status based on request
        if not post.get('is_free', False):
            # If payment method is provided, set status to pending
            if payment_method:
                payment_status = "completed"  # Mark as completed since we're simulating payment
            else:
                # If no payment method provided for a paid ride, use the one from the post
                payment_method = post.get('payment_method')
                payment_status = "pending"

        # Create booking data
        booking_data = {
            "user_id": current_user_id,
            "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "user_email": user.get('email', ''),
            "post_id": post_id,
            "post_type": "ride",
            "post_title": post.get('title', f"From {post.get('from_location')} to {post.get('to_location')}"),
            "post_creator_id": post.get('user_id'),
            "post_creator_name": post.get('user_name'),
            "post_creator_email": post.get('user_email'),
            "from_location": post.get('from_location'),
            "to_location": post.get('to_location'),
            "departure_date": post.get('departure_date'),
            "departure_time": post.get('departure_time'),
            "seats_booked": 1,  # Default to 1 seat for now
            "total_fare": 0 if post.get('is_free', False) else post.get('fee_amount', post.get('price', 0)),
            "payment_method": payment_method,
            "payment_status": payment_status
        }

        # Create the booking
        booking_id = Booking.create_booking(booking_data)

        # Update the post status to booked
        RidePost.update_status(post_id, "booked")

        # Return appropriate response based on payment status
        if payment_status == "not_required" or payment_status == "completed":
            return jsonify({
                "message": "Ride booked successfully", 
                "booking_id": booking_id,
                "payment_required": False
            }), 201
        else:
            return jsonify({
                "message": "Booking created, payment required", 
                "booking_id": booking_id,
                "payment_required": True,
                "payment_info": {
                    "method": payment_method,
                    "amount": post.get('fee_amount', post.get('price', 0)),
                    "payment_number": post.get('payment_number')
                }
            }), 201

    except Exception as e:
        logging.error(f"Error in book_ride: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_user_bookings():
    """Get all bookings for the current user"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()

        # Get the user's bookings
        bookings = Booking.get_user_bookings(current_user_id)

        # For each booking, get the ride details
        for booking in bookings:
            if booking.get('post_type') == 'ride':
                ride = RidePost.get_post_by_id(booking.get('post_id'))
                booking['ride_details'] = ride

        return jsonify(bookings), 200

    except Exception as e:
        logging.error(f"Error in get_user_bookings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/bookings/<booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a booking with a reason"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()

        # Get the booking
        booking = Booking.get_booking_by_id(booking_id)

        if not booking:
            return jsonify({"error": "Booking not found"}), 404

        # Check if the user is the one who made the booking
        if booking.get('user_id') != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Get the cancellation reason from request
        data = request.get_json()
        reason = data.get('reason')
        
        # Validate that a reason was provided
        if not reason:
            return jsonify({"error": "Cancellation reason is required"}), 400
            
        # Valid cancellation reasons
        valid_reasons = [
            "Changed plans", 
            "Found another ride", 
            "Emergency", 
            "Weather conditions",
            "Vehicle issues",
            "Other"
        ]
        
        # Check if the reason is valid
        if reason not in valid_reasons and not reason.startswith("Other:"):
            return jsonify({"error": "Invalid cancellation reason"}), 400

        # Cancel the booking
        result = Booking.cancel_booking(booking_id, reason)
        
        # Check if cancellation was successful
        if isinstance(result, dict) and not result.get('success', True):
            return jsonify({"error": result.get('message', "Failed to cancel booking")}), 400

        if result == False:
            return jsonify({"error": "Failed to cancel booking"}), 500
            
        return jsonify({"message": "Booking cancelled successfully"}), 200

    except Exception as e:
        logging.error(f"Error in cancel_booking: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/messages/<receiver_id>', methods=['GET'])
@jwt_required()
def get_messages(receiver_id):
    """Get messages between current user and another user"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()

        # Query messages where current user is sender or receiver
        messages = list(db.messages.find({
            "$or": [
                {"sender_id": current_user_id, "receiver_id": receiver_id},
                {"sender_id": receiver_id, "receiver_id": current_user_id}
            ]
        }).sort("created_at", 1))

        # Convert ObjectId to string for JSON serialization
        for message in messages:
            message["_id"] = str(message["_id"])

        return jsonify(messages), 200

    except Exception as e:
        logging.error(f"Error in get_messages: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    """Send a message to another user"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user_model = User()
        user = user_model.get_user_by_id(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if it's a form data or JSON request
        if request.content_type and 'multipart/form-data' in request.content_type:
            receiver_id = request.form.get('receiver_id')
            content = request.form.get('content', '')
            image = request.files.get('image')
        else:
            data = request.get_json()
            receiver_id = data.get('receiver_id')
            content = data.get('content', '')
            image = None

        if not receiver_id:
            return jsonify({"error": "Receiver ID is required"}), 400

        # Check if the receiver exists
        receiver = user_model.get_user_by_id(receiver_id)
        if not receiver:
            return jsonify({"error": "Receiver not found"}), 404

        # Create message data
        message_data = {
            "sender_id": current_user_id,
            "sender_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "receiver_id": receiver_id,
            "receiver_name": f"{receiver.get('first_name', '')} {receiver.get('last_name', '')}".strip(),
            "content": content,
            "image_url": None,  # Will be updated if image is uploaded
            "created_at": datetime.utcnow()
        }

        # Handle image upload if present
        if image:
            # Save the image to a file
            filename = f"{datetime.utcnow().timestamp()}_{image.filename}"
            image_path = f"uploads/messages/{filename}"
            image.save(image_path)
            message_data["image_url"] = f"/uploads/messages/{filename}"

        # Insert the message
        result = db.messages.insert_one(message_data)
        message_id = str(result.inserted_id)

        return jsonify({
            "message": "Message sent successfully", 
            "message_id": message_id
        }), 201

    except Exception as e:
        logging.error(f"Error in send_message: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ride_share_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    """Send a message to another user"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user_model = User()
        user = user_model.get_user_by_id(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the data from the request
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        content = data.get('content', '')
        post_id = data.get('post_id')
        post_type = data.get('post_type', 'ride_share')
        subject = data.get('subject', 'Ride Share Inquiry')

        # Check if the receiver exists
        receiver = user_model.get_user_by_id(receiver_id)
        if not receiver:
            return jsonify({"error": "Receiver not found"}), 404

        # Create message data
        message_data = {
            "sender_id": current_user_id,
            "sender_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "receiver_id": receiver_id,
            "receiver_name": f"{receiver.get('first_name', '')} {receiver.get('last_name', '')}".strip(),
            "content": content,
            "post_id": post_id,
            "post_type": post_type,
            "subject": subject,
            "image_url": None,
            "created_at": datetime.utcnow()
        }

        # Insert the message
        result = db.messages.insert_one(message_data)
        message_id = str(result.inserted_id)

        return jsonify({
            "message": "Message sent successfully", 
            "message_id": message_id
        }), 201

    except Exception as e:
        logging.error(f"Error in send_message: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ride_share_bp.route('/messages/post/ride_share/<post_id>/user/<receiver_id>', methods=['POST'])
@jwt_required()
def send_post_message(post_id, receiver_id):
    """Send a message related to a specific ride share post"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user_model = User()
        user = user_model.get_user_by_id(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get the content from the request
        data = request.get_json()
        content = data.get('content', '')

        # Check if the receiver exists
        receiver = user_model.get_user_by_id(receiver_id)
        if not receiver:
            return jsonify({"error": "Receiver not found"}), 404

        # Check if the post exists
        post = RidePost.get_ride_post_by_id(post_id)
        if not post:
            return jsonify({"error": "Ride post not found"}), 404

        # Create message data
        message_data = {
            "sender_id": current_user_id,
            "sender_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "receiver_id": receiver_id,
            "receiver_name": f"{receiver.get('first_name', '')} {receiver.get('last_name', '')}".strip(),
            "content": content,
            "post_id": post_id,
            "post_type": "ride_share",
            "subject": "Ride Share Inquiry",
            "image_url": None,
            "created_at": datetime.utcnow()
        }

        # Insert the message
        result = db.messages.insert_one(message_data)
        message_id = str(result.inserted_id)

        return jsonify({
            "message": "Message sent successfully", 
            "message_id": message_id
        }), 201

    except Exception as e:
        logging.error(f"Error in send_message: {str(e)}")
        return jsonify({"error": str(e)}), 500
