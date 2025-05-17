"""
API routes for Ride Share functionality
"""
from flask import Blueprint, request, jsonify
from app.auth import login_required, admin_required
from app.models.ride_share import RideShare
from bson.errors import InvalidId

# Create blueprint
ride_share_bp = Blueprint('ride_share', __name__)

@ride_share_bp.route('/api/rides/available', methods=['GET'])
@login_required
def get_available_rides():
    """Get all available rides with optional filtering"""
    filters = {
        'from': request.args.get('from', ''),
        'to': request.args.get('to', ''),
        'date': request.args.get('date', '')
    }
    
    try:
        rides = RideShare.get_all_rides(filters)
        return jsonify({"success": True, "rides": rides}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/rides', methods=['POST'])
@login_required
def create_ride():
    """Create a new ride"""
    data = request.get_json()
    current_user = request.current_user
    
    required_fields = ['from_location', 'to_location', 'date', 'time',
                      'seats_available', 'is_paid', 'contact_number']
    
    if data.get('is_paid'):
        required_fields.extend(['fee_per_seat', 'payment_method'])
    
    # Validate required fields
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"success": False, "message": f"Missing required field: {field}"}), 400
    
    try:
        # Create ride post using the current user's info
        ride_id = RideShare.create_ride_post(
            user_id=current_user['_id'],
            user_email=current_user['email'],
            user_name=current_user['name'],
            from_location=data['from_location'],
            to_location=data['to_location'],
            date=data['date'],
            time=data['time'],
            seats_available=data['seats_available'],
            is_paid=data['is_paid'],
            fee_per_seat=data.get('fee_per_seat', 0),
            payment_method=data.get('payment_method'),
            contact_number=data['contact_number']
        )
        return jsonify({"success": True, "ride_id": ride_id}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@ride_share_bp.route('/api/ride-posts/<ride_id>', methods=['GET'])
def get_ride_post(ride_id):
    """Get a specific ride post by ID"""
    try:
        db = RideShare.get_db()
        ride_post = db.ride_posts.find_one({"_id": RideShare.ObjectId(ride_id)})
        
        if not ride_post:
            return jsonify({"success": False, "message": "Ride post not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        ride_post['_id'] = str(ride_post['_id'])
        
        return jsonify({"success": True, "ride_post": ride_post}), 200
    except InvalidId:
        return jsonify({"success": False, "message": "Invalid ride ID format"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/ride-posts/<ride_id>', methods=['PUT'])
@login_required
def update_ride_post(ride_id):
    """Update a ride post"""
    data = request.get_json()
    current_user = request.current_user
    
    try:
        # Only allow updating specific fields
        allowed_updates = {
            'from_location', 'to_location', 'date', 'time', 
            'seats_available', 'is_paid', 'fee_per_seat', 'payment_method', 'contact_number'
        }
        
        updates = {k: v for k, v in data.items() if k in allowed_updates}
        
        if not updates:
            return jsonify({"success": False, "message": "No valid fields to update"}), 400
        
        success, message = RideShare.update_ride_post(ride_id, current_user['_id'], updates)
        
        if success:
            return jsonify({"success": True, "message": message}), 200
        else:
            return jsonify({"success": False, "message": message}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/rides/<ride_id>', methods=['DELETE'])
@login_required
def delete_ride(ride_id):
    """Delete a ride"""
    try:
        success = RideShare.delete_ride(ride_id, request.current_user['_id'])
        return jsonify({"success": True, "message": "Ride deleted"}), 200
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/rides/my', methods=['GET'])
@login_required
def get_my_rides():
    """Get rides posted by the current user"""
    try:
        current_user = request.current_user
        rides = RideShare.get_user_rides(current_user['_id'])
        return jsonify({'success': True, 'rides': rides}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@ride_share_bp.route('/api/rides/bookings/my', methods=['GET'])
@login_required
def get_my_bookings():
    """Get bookings made by the current user"""
    try:
        current_user = request.current_user
        bookings = RideShare.get_user_bookings(current_user['_id'])
        return jsonify({'success': True, 'bookings': bookings}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@ride_share_bp.route('/api/rides/<ride_id>/book', methods=['POST'])
@login_required
def book_ride(ride_id):
    """Book a ride"""
    data = request.get_json()
    current_user = request.current_user
    
    try:
        result = RideShare.book_ride(
            ride_id=ride_id,
            user_id=current_user['_id'],
            user_email=current_user['email'],
            user_name=current_user['name'],
            seats=data['seats']
        )
        return jsonify({
            "success": True,
            "booking": result['booking'],
            "contact_info": result['contact_info']
        }), 201
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/rides/bookings/<booking_id>/cancel', methods=['POST'])
@login_required
def cancel_booking(booking_id):
    """Cancel a booking"""
    data = request.get_json()
    
    if not data.get('reason'):
        return jsonify({"success": False, "message": "Cancellation reason is required"}), 400
    
    try:
        success = RideShare.cancel_booking(
            booking_id=booking_id,
            user_id=request.current_user['_id'],
            reason=data['reason']
        )
        return jsonify({"success": True, "message": "Booking cancelled"}), 200
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/my-rides', methods=['GET'])
@login_required
def get_user_rides():
    """Get ride posts created by the current user"""
    current_user = request.current_user
    
    try:
        ride_posts = RideShare.get_ride_posts_by_user(current_user['_id'])
        return jsonify({"success": True, "ride_posts": ride_posts}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Admin routes
@ride_share_bp.route('/api/admin/ride-posts', methods=['GET'])
@admin_required
def admin_get_all_ride_posts():
    """Admin endpoint to get all ride posts"""
    try:
        ride_posts = RideShare.get_all_ride_posts({})  # No filters, get everything
        return jsonify({"success": True, "ride_posts": ride_posts}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/admin/ride-posts/<ride_id>', methods=['PUT'])
@admin_required
def admin_update_ride_post(ride_id):
    """Admin endpoint to update any ride post"""
    data = request.get_json()
    
    try:
        # Allow updating any field as admin
        db = RideShare.get_db()
        result = db.ride_posts.update_one(
            {"_id": RideShare.ObjectId(ride_id)},
            {"$set": data}
        )
        
        if result.modified_count > 0:
            return jsonify({"success": True, "message": "Ride post updated successfully"}), 200
        else:
            return jsonify({"success": False, "message": "No changes made or ride post not found"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@ride_share_bp.route('/api/admin/ride-posts/<ride_id>', methods=['DELETE'])
@admin_required
def admin_delete_ride_post(ride_id):
    """Admin endpoint to delete any ride post"""
    try:
        db = RideShare.get_db()
        result = db.ride_posts.delete_one({"_id": RideShare.ObjectId(ride_id)})
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Ride post deleted successfully"}), 200
        else:
            return jsonify({"success": False, "message": "Ride post not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
