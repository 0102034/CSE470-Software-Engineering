from flask import Flask, send_from_directory, jsonify
from pymongo import MongoClient
from flask_jwt_extended import JWTManager
from flask_caching import Cache
from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

def get_request_limit_key():
    from flask import request
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token = auth_header.split(' ')[1]
            decoded = decode_token(token)
            if decoded.get('role') == 'admin':
                # Return None for admin users to bypass rate limiting
                return None
        except:
            pass
    return get_remote_address()

# Initialize extensions
jwt = JWTManager()
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300})
compress = Compress()
limiter = Limiter(
    key_func=get_request_limit_key,
    default_limits=["1000 per minute"],  # More lenient default limit
    storage_uri="memory://"
)

def create_app():
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret-key')
    
    # Configure MongoDB with connection pooling
    mongo_uri = "mongodb://localhost:27017/bracu_circle"
    app.config['MONGO_URI'] = mongo_uri
    app.mongo_client = MongoClient(mongo_uri)
    # Set the database name
    app.db = app.mongo_client.get_database()
    
    # Enable response compression
    app.config['COMPRESS_MIMETYPES'] = ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json']
    app.config['COMPRESS_LEVEL'] = 6
    app.config['COMPRESS_MIN_SIZE'] = 500
    
    # Initialize extensions
    jwt.init_app(app)
    cache.init_app(app)
    compress.init_app(app)
    limiter.init_app(app)
    
    # Register blueprints
    from app.controllers.auth import auth_bp
    from app.controllers.lost_found import lost_found_bp
    from app.controllers.ride import ride_bp
    from app.controllers.admin import admin_bp
    from app.controllers.users import users_bp
    from app.routes.notification_routes import notification_bp
    from app.routes.marketplace_routes import marketplace_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(marketplace_bp, url_prefix='/api/marketplace')
    app.register_blueprint(lost_found_bp, url_prefix='/api/lost-found')
    app.register_blueprint(ride_bp, url_prefix='/api/ride')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    
    # Serve uploaded files with caching
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
        return send_from_directory(uploads_dir, filename)
    
    # Add CORS headers to allow cross-origin requests
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Cache-Control'] = 'public, max-age=300'  # Cache for 5 minutes by default
        return response
    
    # Handle OPTIONS requests
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        return '', 200
    
    # Add basic error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
        
    @app.errorhandler(500)
    def server_error(error):
        app.logger.error(f"Server error: {str(error)}")
        return jsonify({"error": "An internal server error occurred"}), 500
    
    # Enable debug logging
    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)
    
    return app 