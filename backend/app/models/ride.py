from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from flask import current_app

class Ride:
    def __init__(self):
        self.client = MongoClient(current_app.config['MONGO_URI'])
        self.db = self.client[current_app.config['DB_NAME']]
        self.collection = self.db.rides

    def create_ride_offer(self, data):
        ride = {
            'type': 'offer',
            'user_id': str(data['user_id']),
            'pickup_location': data['pickup_location'],
            'dropoff_location': data['dropoff_location'],
            'date': datetime.fromisoformat(data['date']),
            'time': data['time'],
            'available_seats': int(data['available_seats']),
            'contact_info': data['contact_info'],
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = self.collection.insert_one(ride)
        return str(result.inserted_id)

    def create_ride_request(self, data):
        ride = {
            'type': 'request',
            'user_id': str(data['user_id']),
            'pickup_location': data['pickup_location'],
            'dropoff_location': data['dropoff_location'],
            'date': datetime.fromisoformat(data['date']),
            'time': data['time'],
            'needed_seats': int(data['needed_seats']),
            'contact_info': data['contact_info'],
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = self.collection.insert_one(ride)
        return str(result.inserted_id)

    def get_ride(self, ride_id):
        return self.collection.find_one({'_id': ObjectId(ride_id)})

    def get_rides(self, filters=None):
        query = filters if filters else {}
        return list(self.collection.find(query))
