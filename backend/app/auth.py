from functools import wraps
from flask import request, jsonify
import jwt
from app.db import get_db

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
            current_user = get_db().users.find_one({'_id': data['user_id']})
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
        except:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
            current_user = get_db().users.find_one({'_id': data['user_id']})
            if not current_user or not current_user.get('is_admin', False):
                return jsonify({'message': 'Admin access required'}), 403
        except:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated_function
