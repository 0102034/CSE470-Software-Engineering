from functools import wraps
from flask import request, jsonify, current_app
import jwt
import os
from bson.objectid import ObjectId

# Get the JWT secret key from environment or use default
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')

def token_required(f):
    """
    Decorator for routes that require a valid JWT token
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Decode the token
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            
            # Get the user ID from the token
            user_id = payload.get('sub') or payload.get('user_id')
            if not user_id:
                return jsonify({'error': 'Invalid token'}), 401
            
            # Get the user from the database
            from ..models.user import User
            user_model = User(current_app.db)
            current_user = user_model.get_user_by_id(user_id)
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
            
            # Pass the current user to the route
            return f(current_user, *args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            current_app.logger.error(f"Token validation error: {str(e)}")
            return jsonify({'error': 'Token validation failed'}), 401
    
    return decorated
