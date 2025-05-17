import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'super-secret-key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'mysql+mysqlconnector://root:@localhost/bracu_circle')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2MB for uploads
