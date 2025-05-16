import unittest
import json
from app import create_app, socketio
from flask_socketio import SocketIOTestClient

class SocketIOTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.socket_client = SocketIOTestClient(self.app, socketio)
    
    def test_connect(self):
        """Test socket connection"""
        self.socket_client.connect()
        self.assertTrue(self.socket_client.is_connected())
    
    def test_send_message(self):
        """Test sending a message"""
        self.socket_client.connect()
        
        # Mock message data
        message_data = {
            'sender_id': '60d5ec9af682fbd12a0a42a1',  # Mock user ID
            'receiver_id': '60d5ec9af682fbd12a0a42a2',  # Mock user ID
            'content': 'Test message',
            'post_id': '60d5ec9af682fbd12a0a42a3',  # Mock post ID
            'post_type': 'marketplace'
        }
        
        # Emit send_message event
        self.socket_client.emit('send_message', message_data)
        
        # Receive the response
        received = self.socket_client.get_received()
        
        # Check if we got a message_sent event
        self.assertGreater(len(received), 0)
        
        # Find message_sent event
        message_sent_event = None
        for event in received:
            if event['name'] == 'message_sent':
                message_sent_event = event
                break
        
        self.assertIsNotNone(message_sent_event)

if __name__ == '__main__':
    unittest.main()
