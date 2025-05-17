from flask import jsonify, request
from functools import wraps
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

def admin_required(f):
    """
    A decorator that checks if the current user is an admin.
    This decorator must be used after the jwt_required decorator.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            
            # Get the JWT claims
            from flask_jwt_extended import decode_token
            
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
            return jsonify({'error': str(e)}), 401
    return decorated_function
