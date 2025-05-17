import os
from werkzeug.utils import secure_filename
from flask import current_app
from models.user import User
from app import db
import traceback

def allowed_file(filename):
    allowed = current_app.config['ALLOWED_EXTENSIONS']
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed

def register_user(data, file):
    try:
        # Validate required fields (already validated in frontend, but double check)
        required = ['bracu_id', 'name', 'email', 'password', 'major', 'semester']
        for field in required:
            if not data.get(field):
                return {'error': f'Missing field: {field}'}, 400

        # Check for existing user/email
        if User.query.filter_by(email=data['email']).first() or User.query.filter_by(bracu_id=data['bracu_id']).first():
            return {'error': 'User with this email or BRACU ID already exists.'}, 400

        # Handle file upload
        filename = None
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_folder, exist_ok=True)
            file.save(os.path.join(upload_folder, filename))
        else:
            return {'error': 'Invalid or missing ID card file.'}, 400

        # Create user
        user = User(
            bracu_id=data['bracu_id'],
            name=data['name'],
            email=data['email'],
            major=data['major'],
            semester=data['semester'],
            id_card_filename=filename,
            is_verified=False
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return {'message': 'Registration successful. Await admin verification.'}, 201
    except Exception as e:
        print('Registration error:', e)
        traceback.print_exc()
        return {'error': f'Registration failed: {str(e)}'}, 500
