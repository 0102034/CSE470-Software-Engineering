from flask import jsonify, request
from app.models.notification import Notification
from flask_jwt_extended import get_jwt_identity
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            from flask_jwt_extended import decode_token
            from flask import request
            
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Missing or invalid token'}), 401
            
            token = auth_header.split(' ')[1]
            decoded = decode_token(token)
            
            # Check if it's an admin token
            if decoded.get('role') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
                
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
    return decorated_function

class NotificationController:
    def __init__(self):
        self.notification_model = Notification()

    @admin_required
    def create_notification(self):
        try:
            # Get admin info from token
            from flask_jwt_extended import decode_token
            auth_header = request.headers.get('Authorization')
            token = auth_header.split(' ')[1]
            decoded = decode_token(token)
            admin_email = decoded.get('sub')  # This will be 470@gmail.com
            
            # Get request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            if not data.get('message'):
                return jsonify({'error': 'Message is required'}), 400
            
            if not data.get('page') or data['page'] not in ['home', 'ride_share', 'lost_found', 'marketplace']:
                return jsonify({'error': 'Valid page is required'}), 400

            notification_data = {
                'message': data['message'],
                'page': data['page'],
                'admin_id': admin_email
            }

            notification_id = self.notification_model.create_notification(notification_data)
            return jsonify({
                'message': 'Notification created successfully',
                'notification_id': notification_id
            }), 201

        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            current_app.logger.error(f'Error creating notification: {str(e)}')
            return jsonify({'error': 'Failed to create notification'}), 500

    def get_active_notifications(self, page):
        try:
            if page not in ['home', 'ride_share', 'lost_found', 'marketplace']:
                return jsonify({'error': 'Invalid page'}), 400

            notifications = self.notification_model.get_active_notifications(page)
            # Convert ObjectId to string for JSON serialization
            for notification in notifications:
                notification['_id'] = str(notification['_id'])
            
            return jsonify(notifications), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @admin_required
    def deactivate_notification(self, notification_id):
        try:
            success = self.notification_model.deactivate_notification(notification_id)
            if success:
                return jsonify({'message': 'Notification deactivated successfully'}), 200
            return jsonify({'error': 'Notification not found'}), 404

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @admin_required
    def get_all_notifications(self):
        try:
            notifications = self.notification_model.get_all_notifications()
            # Convert ObjectId to string for JSON serialization
            for notification in notifications:
                notification['_id'] = str(notification['_id'])
            
            return jsonify(notifications), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    @admin_required
    def update_notification(self, notification_id):
        try:
            # Get admin info from token
            from flask_jwt_extended import decode_token
            from flask import current_app
            
            auth_header = request.headers.get('Authorization')
            token = auth_header.split(' ')[1]
            decoded = decode_token(token)
            admin_email = decoded.get('sub')
            
            # Get request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            if not data.get('message'):
                return jsonify({'error': 'Message is required'}), 400
            
            if not data.get('page') or data['page'] not in ['home', 'ride_share', 'lost_found', 'marketplace']:
                return jsonify({'error': 'Valid page is required'}), 400

            update_data = {
                'message': data['message'],
                'page': data['page'],
                'updated_by': admin_email
            }

            success = self.notification_model.update_notification(notification_id, update_data)
            if success:
                return jsonify({'message': 'Notification updated successfully'}), 200
            return jsonify({'error': 'Notification not found'}), 404

        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            current_app.logger.error(f'Error updating notification: {str(e)}')
            return jsonify({'error': 'Failed to update notification'}), 500
