from flask import jsonify, request
from app.models.ride import Ride
from datetime import datetime
from flask_jwt_extended import get_jwt_identity

class RideController:
    def __init__(self):
        self.ride_model = Ride()

    def create_ride_offer(self):
        try:
            current_user_id = get_jwt_identity()  # Get logged in user's ID
            data = request.get_json()
            data['user_id'] = current_user_id  # Set creator as current user
            
            required_fields = ['pickup_location', 'dropoff_location', 
                             'date', 'time', 'available_seats', 'contact_info']
            
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            ride_id = self.ride_model.create_ride_offer(data)
            return jsonify({'message': 'Ride offer created successfully', 'ride_id': ride_id}), 201
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def create_ride_request(self):
        try:
            current_user_id = get_jwt_identity()  # Get logged in user's ID
            data = request.get_json()
            data['user_id'] = current_user_id  # Set creator as current user
            
            required_fields = ['pickup_location', 'dropoff_location', 
                             'date', 'time', 'needed_seats', 'contact_info']
            
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            ride_id = self.ride_model.create_ride_request(data)
            return jsonify({'message': 'Ride request created successfully', 'ride_id': ride_id}), 201
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def get_ride(self, ride_id):
        try:
            current_user_id = get_jwt_identity()  # Get logged in user's ID
            ride = self.ride_model.get_ride(ride_id)
            if not ride:
                return jsonify({'error': 'Ride not found'}), 404
            
            # Add a flag to indicate if the current user is the creator
            ride['is_creator'] = str(ride['user_id']) == str(current_user_id)
            ride['_id'] = str(ride['_id'])
            return jsonify(ride), 200
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def get_rides(self):
        try:
            current_user_id = get_jwt_identity()  # Get logged in user's ID
            filters = {}
            # Add filters from query parameters
            if request.args.get('type'):
                filters['type'] = request.args.get('type')
            if request.args.get('status'):
                filters['status'] = request.args.get('status')

            rides = self.ride_model.get_rides(filters)
            # Add is_creator flag and convert ObjectId to string
            for ride in rides:
                ride['is_creator'] = str(ride['user_id']) == str(current_user_id)
                ride['_id'] = str(ride['_id'])
            
            return jsonify(rides), 200
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def contact_ride_creator(self, ride_id):
        try:
            current_user_id = get_jwt_identity()  # Get logged in user's ID
            ride = self.ride_model.get_ride(ride_id)
            
            if not ride:
                return jsonify({'error': 'Ride not found'}), 404
                
            # Verify that the current user is not the creator
            if str(ride['user_id']) == str(current_user_id):
                return jsonify({'error': 'You cannot contact yourself'}), 403
                
            # Return contact information
            return jsonify({
                'message': 'Contact information retrieved successfully',
                'contact_info': ride['contact_info']
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
