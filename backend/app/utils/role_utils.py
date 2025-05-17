from flask import jsonify, request, current_app
from functools import wraps
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt

def admin_required(f):
    """
    A decorator that checks if the current user is an admin.
    This decorator must be used after the jwt_required decorator.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            
            # Get the JWT claims directly from the get_jwt function
            claims = get_jwt()
            
            # Check if it's an admin token by looking at the role claim
            if claims.get('role') != 'admin':
                return jsonify({'error': 'Admin privileges required'}), 403
                
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Admin authorization error: {str(e)}")
            return jsonify({'error': 'Authentication error. Please log in again.'}), 401
    return decorated_function
