from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from flask import current_app

class Notification:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None

    def _ensure_connection(self):
        if self.collection is None:
            try:
                self.client = current_app.mongo_client
                self.db = self.client.get_database()
                self.collection = self.db.notifications
            except Exception as e:
                current_app.logger.error(f'Failed to initialize Notification model: {str(e)}')
                raise Exception('Database connection failed')

    def create_notification(self, data):
        self._ensure_connection()
        try:
            if not data.get('message'):
                raise ValueError('Message is required')
            if not data.get('page') or data['page'] not in ['ride_share', 'lost_found', 'marketplace']:
                raise ValueError('Valid page is required')
            if not data.get('admin_id'):
                raise ValueError('Admin ID is required')

            notification = {
                'message': data['message'],
                'page': data['page'],
                'created_by': str(data['admin_id']),
                'active': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = self.collection.insert_one(notification)
            return str(result.inserted_id)
        except Exception as e:
            current_app.logger.error(f'Failed to create notification: {str(e)}')
            raise

    def get_active_notifications(self, page):
        self._ensure_connection()
        try:
            if not page or page not in ['ride_share', 'lost_found', 'marketplace']:
                raise ValueError('Valid page is required')

            notifications = list(self.collection.find({
                'page': page,
                'active': True
            }).sort('created_at', -1))

            # Convert ObjectId to string
            for notification in notifications:
                notification['_id'] = str(notification['_id'])

            return notifications
        except Exception as e:
            current_app.logger.error(f'Failed to get active notifications: {str(e)}')
            raise

    def deactivate_notification(self, notification_id):
        self._ensure_connection()
        try:
            if not notification_id:
                raise ValueError('Notification ID is required')

            result = self.collection.update_one(
                {'_id': ObjectId(notification_id)},
                {'$set': {
                    'active': False,
                    'updated_at': datetime.utcnow()
                }}
            )

            if result.matched_count == 0:
                raise ValueError('Notification not found')

            return result.modified_count > 0
        except Exception as e:
            current_app.logger.error(f'Failed to deactivate notification: {str(e)}')
            raise

    def get_all_notifications(self):
        self._ensure_connection()
        try:
            notifications = list(self.collection.find().sort('created_at', -1))
            
            # Convert ObjectId to string
            for notification in notifications:
                notification['_id'] = str(notification['_id'])

            return notifications
        except Exception as e:
            current_app.logger.error(f'Failed to get all notifications: {str(e)}')
            raise
