from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
import uuid

class User:
    def __init__(self, db=None):
        # We'll initialize the collection when it's first used
        self.db = db
        self.collection = None
    
    def _init_collection(self):
        # Initialize collection if not already done
        if self.collection is None:
            from flask import current_app
            if self.db is None:
                self.db = current_app.mongo_client.get_database()
            self.collection = self.db.users
            # Remove old indexes if they exist
            try:
                self.collection.drop_index('username_1')
            except:
                pass
            # Create an index on email for faster lookups and to ensure uniqueness
            self.collection.create_index('email', unique=True)
    
    def create_user(self, user_data):
        self._init_collection()
        # Hash password
        hashed_password = generate_password_hash(user_data['password'])
        
        user = {
            'email': user_data['email'],
            'password': hashed_password,
            'name': user_data['name'],
            'student_id': user_data['student_id'],
            'department': user_data['department'],
            'semester': user_data.get('semester', ''),
            'phone': user_data['phone'],
            'id_card_photo': user_data.get('id_card_photo', None),
            'verification_status': 'pending',  # pending, approved, rejected
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = self.collection.insert_one(user)
        return str(result.inserted_id)
    
    def get_user_by_email(self, email):
        self._init_collection()
        return self.collection.find_one({'email': email})
    
    def get_user_by_id(self, user_id):
        self._init_collection()
        try:
            # Try to convert to ObjectId
            obj_id = ObjectId(user_id)
            return self.collection.find_one({'_id': obj_id})
        except Exception as e:
            # If conversion fails, try using the string directly
            user = self.collection.find_one({'_id': user_id})
            if user:
                return user
                
            # Try finding by string ID field if it exists
            return self.collection.find_one({'id': user_id})
    
    def verify_password(self, user, password):
        return check_password_hash(user['password'], password)
    
    def create_test_user_if_not_exists(self):
        # Check if test user exists
        test_user = self.get_user_by_email('test@bracu.edu')
        if not test_user:
            # Create test user
            test_data = {
                'email': 'test@bracu.edu',
                'password': 'password123',
                'name': 'Test User',
                'student_id': '12345678',
                'department': 'Computer Science',
                'semester': '5th',
                'phone': '1234567890',
                'verification_status': 'approved'  # Auto-approve test user
            }
            self.create_user(test_data)
            return True
        return False
    
    def generate_token(self, user_id):
        """Generate JWT token for authenticated user"""
        secret_key = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
        payload = {
            'user_id': str(user_id),
            'exp': datetime.utcnow() + timedelta(days=1)
        }
        token = jwt.encode(payload, secret_key, algorithm='HS256')
        return token
    
    def get_pending_users(self):
        """Get all users with pending verification status"""
        self._init_collection()
        users = list(self.collection.find({'verification_status': 'pending'}))
        for user in users:
            user['_id'] = str(user['_id'])
            # Don't return password hash
            if 'password' in user:
                del user['password']
        return users
    
    def get_verified_users(self):
        """Get all users with approved verification status"""
        self._init_collection()
        users = list(self.collection.find({'verification_status': 'approved'}))
        for user in users:
            user['_id'] = str(user['_id'])
            # Don't return password hash
            if 'password' in user:
                del user['password']
        return users
    
    def approve_user(self, user_id):
        """Approve a user's verification request"""
        self._init_collection()
        result = self.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'verification_status': 'approved', 'updated_at': datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    def reject_user(self, user_id):
        """Reject a user's verification request"""
        self._init_collection()
        result = self.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'verification_status': 'rejected', 'updated_at': datetime.utcnow()}}
        )
        return result.modified_count > 0
        
    def create_password_reset_token(self, email):
        """Create a password reset token for a user"""
        self._init_collection()
        # Find the user by email
        user = self.collection.find_one({'email': email})
        if not user:
            return None
            
        # Generate a reset token
        reset_token = str(uuid.uuid4())
        expiry = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
        
        # Store the token in the database
        self.collection.update_one(
            {'_id': user['_id']},
            {'$set': {
                'reset_token': reset_token,
                'reset_token_expiry': expiry,
                'updated_at': datetime.utcnow()
            }}
        )
        
        return {
            'user_id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'token': reset_token,
            'expiry': expiry
        }
    
    def verify_reset_token(self, token):
        """Verify if a reset token is valid"""
        self._init_collection()
        # Find user with this token and check if it's still valid
        user = self.collection.find_one({
            'reset_token': token,
            'reset_token_expiry': {'$gt': datetime.utcnow()}
        })
        
        if not user:
            return None
            
        return {
            'user_id': str(user['_id']),
            'email': user['email']
        }
    
    def reset_password(self, token, new_password):
        """Reset a user's password using a valid token"""
        self._init_collection()
        # Verify the token first
        user_info = self.verify_reset_token(token)
        if not user_info:
            return False
            
        # Hash the new password
        hashed_password = generate_password_hash(new_password)
        
        # Update the password and remove the reset token
        result = self.collection.update_one(
            {'_id': ObjectId(user_info['user_id'])},
            {'$set': {
                'password': hashed_password,
                'updated_at': datetime.utcnow()
            },
            '$unset': {
                'reset_token': "",
                'reset_token_expiry': ""
            }}
        )
        
        return result.modified_count > 0