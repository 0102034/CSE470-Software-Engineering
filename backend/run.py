import os
from flask import Flask
from flask_cors import CORS
from app import create_app
from app.socket_events import init_socket_events
from app.extensions import socketio

app = create_app()

# Allow all origins for now to ensure frontend can connect
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize the app with the Socket.IO instance
socketio.init_app(app, cors_allowed_origins="*")

# Initialize socket events
init_socket_events(socketio)

if __name__ == '__main__':
    # Check if we're in development or production
    is_dev = os.environ.get('FLASK_ENV') == 'development'
    
    if is_dev:
        # Development mode
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    else:
        # Production mode - allow unsafe Werkzeug in production or use gunicorn
        socketio.run(app, debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), allow_unsafe_werkzeug=True)
