from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from config import Config
import os

# Initialize extensions (db must be global for models)
db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register blueprints
    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp)

    @app.route('/')
    def home():
        return {"message": "Welcome to BRACU Circle API"}

    return app

# For running directly
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
