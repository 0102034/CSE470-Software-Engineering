"""
Ride Share Controller - Handles all ride sharing functionality
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from datetime import datetime
import pymongo
import json

ride_share_bp = Blueprint('ride_share_bp', __name__)
client = pymongo.MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

@ride_share_bp.route('/posts', methods=['GET'])
def get_all_posts():
    """Get all ride share posts"""
    try:
        # Debug log
        current_app.logger.info("Fetching all ride share posts")
        
        # Get all ride posts from both collections
        ride_posts = list(db.ride_posts.find().sort('created_at', -1))
        
        # Process ride posts
        for post in ride_posts:
            post['_id'] = str(post['_id'])
            if 'user_id' in post:
                post['user_id'] = str(post['user_id'])
            
            # Add user information
            try:
                if 'user_id' in post and post['user_id']:
                    user = db.users.find_one({'_id': ObjectId(post['user_id'])})
                    if user:
                        post['user'] = {
                            'name': user.get('name', 'Unknown'),
                            'email': user.get('email', 'No email'),
                            '_id': str(user['_id'])
                        }
            except Exception as e:
                current_app.logger.error(f"Error fetching user for post {post['_id']}: {str(e)}")
                post['user'] = {
                    'name': 'Unknown User',
                    'email': 'No email available'
                }
        
        # Add cache control headers
        response = jsonify(ride_posts)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error fetching ride share posts: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ride_share_bp.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    """Create a new ride share post"""
    try:
        # Get current user
        user_id = get_jwt_identity()
        
        # Get data from request
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['from_location', 'to_location', 'date', 'time', 'seats_available']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new ride post
        ride_post = {
            'user_id': user_id,
            'from_location': data['from_location'],
            'to_location': data['to_location'],
            'pickup_location': data.get('pickup_location', data['from_location']),
            'dropoff_location': data.get('dropoff_location', data['to_location']),
            'date': data['date'],
            'time': data['time'],
            'seats_available': int(data['seats_available']),
            'available_seats': int(data['seats_available']),
            'amount_per_seat': float(data.get('amount_per_seat', 0)),
            'notes': data.get('notes', ''),
            'contact_info': data.get('contact_info', ''),
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert into database
        result = db.ride_posts.insert_one(ride_post)
        
        # Get the newly created post with user details
        new_post = db.ride_posts.find_one({'_id': result.inserted_id})
        if new_post:
            new_post['_id'] = str(new_post['_id'])
            new_post['user_id'] = str(new_post['user_id'])
            
            # Add user information
            try:
                user = db.users.find_one({'_id': ObjectId(user_id)})
                if user:
                    new_post['user'] = {
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', 'No email'),
                        '_id': str(user['_id'])
                    }
            except Exception as e:
                current_app.logger.error(f"Error fetching user for new post: {str(e)}")
                new_post['user'] = {
                    'name': 'Unknown User',
                    'email': 'No email available'
                }
        
        # Add cache control headers
        response = jsonify({
            'message': 'Ride share post created successfully',
            'post_id': str(result.inserted_id),
            'post': new_post
        })
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response, 201
    except Exception as e:
        current_app.logger.error(f"Error creating ride share post: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ride_share_bp.route('/posts/<post_id>', methods=['GET'])
def get_post(post_id):
    """Get a specific ride share post"""
    try:
        # Find post in ride_posts collection
        post = db.ride_posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({'error': 'Ride share post not found'}), 404
        
        # Process post
        post['_id'] = str(post['_id'])
        if 'user_id' in post:
            post['user_id'] = str(post['user_id'])
        
        # Add user information
        try:
            if 'user_id' in post and post['user_id']:
                user = db.users.find_one({'_id': ObjectId(post['user_id'])})
                if user:
                    post['user'] = {
                        'name': user.get('name', 'Unknown'),
                        'email': user.get('email', 'No email'),
                        '_id': str(user['_id'])
                    }
        except Exception as e:
            current_app.logger.error(f"Error fetching user for post {post_id}: {str(e)}")
            post['user'] = {
                'name': 'Unknown User',
                'email': 'No email available'
            }
        
        return jsonify(post), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching ride share post: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ride_share_bp.route('/posts/<post_id>/book', methods=['POST'])
@jwt_required()
def book_post(post_id):
    """Book a ride share post"""
    try:
        # Get current user
        user_id = get_jwt_identity()
        
        # Find post
        post = db.ride_posts.find_one({'_id': ObjectId(post_id)})
        if not post:
            return jsonify({'error': 'Ride share post not found'}), 404
        
        # Check if user is trying to book their own post
        if post['user_id'] == user_id:
            return jsonify({'error': 'You cannot book your own ride'}), 400
        
        # Check if there are available seats
        if post['seats_available'] <= 0:
            return jsonify({'error': 'No seats available'}), 400
        
        # Get booking data
        data = request.get_json() or {}
        seats_to_book = int(data.get('seats', 1))
        
        # Check if enough seats are available
        if post['seats_available'] < seats_to_book:
            return jsonify({'error': f'Only {post["seats_available"]} seats available'}), 400
        
        # Create booking
        booking = {
            'user_id': user_id,
            'post_id': post_id,
            'post_user_id': post['user_id'],
            'from_location': post['from_location'],
            'to_location': post['to_location'],
            'date': post['date'],
            'time': post['time'],
            'seats_booked': seats_to_book,
            'amount_per_seat': post.get('amount_per_seat', 0),
            'total_amount': seats_to_book * post.get('amount_per_seat', 0),
            'status': 'confirmed',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert booking
        booking_result = db.ride_bookings.insert_one(booking)
        
        # Update post's available seats
        db.ride_posts.update_one(
            {'_id': ObjectId(post_id)},
            {'$set': {
                'seats_available': post['seats_available'] - seats_to_book,
                'available_seats': post['seats_available'] - seats_to_book,
                'updated_at': datetime.utcnow()
            }}
        )
        
        # If no seats left, mark as booked
        if post['seats_available'] - seats_to_book <= 0:
            db.ride_posts.update_one(
                {'_id': ObjectId(post_id)},
                {'$set': {'status': 'booked'}}
            )
        
        return jsonify({
            'message': 'Ride booked successfully',
            'booking_id': str(booking_result.inserted_id)
        }), 201
    except Exception as e:
        current_app.logger.error(f"Error booking ride share post: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ride_share_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_user_bookings():
    """Get all bookings for the current user"""
    try:
        # Get current user
        user_id = get_jwt_identity()
        
        # Get all bookings for this user
        bookings = list(db.ride_bookings.find({'user_id': user_id}).sort('created_at', -1))
        
        # Process bookings
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
            booking['user_id'] = str(booking['user_id'])
            booking['post_id'] = str(booking['post_id'])
            booking['post_user_id'] = str(booking['post_user_id'])
            
            # Add post details
            try:
                post = db.ride_posts.find_one({'_id': ObjectId(booking['post_id'])})
                if post:
                    booking['post'] = {
                        '_id': str(post['_id']),
                        'from_location': post['from_location'],
                        'to_location': post['to_location'],
                        'date': post['date'],
                        'time': post['time']
                    }
            except Exception as e:
                current_app.logger.error(f"Error fetching post for booking: {str(e)}")
        
        return jsonify(bookings), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching user bookings: {str(e)}")
        return jsonify({'error': str(e)}), 500
