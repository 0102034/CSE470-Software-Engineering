
from flask import Flask
from flask_cors import CORS
from app import create_app
from app.socket_events import init_socket_events
from app.extensions import socketio

app = create_app()
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize the app with the Socket.IO instance
socketio.init_app(app)

# Initialize socket events
init_socket_events(socketio)

if __name__ == '__main__':
    # Run with SocketIO instead of regular Flask server
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)