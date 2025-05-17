"""
Database module that provides access to the MongoDB database.
This module is imported by models to interact with the database.
"""
from flask import current_app
from pymongo import MongoClient
import os
from datetime import datetime
from bson import ObjectId

# Create a direct connection to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

# Ensure required collections exist
required_collections = [
    'announcements',
    'ride_posts',
    'bookings',
    'bus_routes',
    'users'
]

for collection in required_collections:
    if collection not in db.list_collection_names():
        db.create_collection(collection)
        print(f'Created {collection} collection')

# Initialize sample data for ride_posts if empty
if db.ride_posts.count_documents({}) == 0:
    sample_ride_posts = [
        {
            "user_id": ObjectId("6462f79d5057b87a9c4e5555"),  # This is a placeholder ID
            "user_name": "John Doe",
            "user_email": "john@example.com",
            "title": "Ride to BRAC University",
            "description": "Daily ride from Gulshan to BRAC University. AC car available.",
            "from_location": "Gulshan",
            "to_location": "Merul Badda (BRAC University)",
            "departure_date": "2025-05-02",
            "departure_time": "08:30",
            "available_seats": 3,
            "price": 150.0,
            "vehicle_type": "Car",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "user_id": ObjectId("6462f79d5057b87a9c4e5556"),  # This is a placeholder ID
            "user_name": "Jane Smith",
            "user_email": "jane@example.com",
            "title": "Evening Ride from BRAC",
            "description": "Evening ride from BRAC University to Banani. Non-AC car.",
            "from_location": "Merul Badda (BRAC University)",
            "to_location": "Banani",
            "departure_date": "2025-05-02",
            "departure_time": "17:30",
            "available_seats": 2,
            "price": 120.0,
            "vehicle_type": "Car",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    db.ride_posts.insert_many(sample_ride_posts)
    print("Inserted sample ride posts")

# Initialize sample data for bus_routes if empty
if db.bus_routes.count_documents({}) == 0:
    sample_bus_routes = [
        {
            "name": "BRAC University Shuttle",
            "start_location": "Mohakhali",
            "end_location": "Merul Badda (BRAC University)",
            "schedule": [
                {"day": "Monday to Friday", "times": ["07:30", "09:00", "12:30", "16:00", "18:30"]},
                {"day": "Saturday", "times": ["08:00", "12:00", "16:30"]}
            ],
            "fare": 30.0,
            "stops": ["Mohakhali", "Gulshan 1", "Gulshan 2", "Merul Badda"],
            "active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Banani Express",
            "start_location": "Banani",
            "end_location": "Merul Badda (BRAC University)",
            "schedule": [
                {"day": "Monday to Friday", "times": ["08:00", "10:30", "13:00", "17:00"]},
                {"day": "Saturday", "times": ["09:00", "13:30", "17:30"]}
            ],
            "fare": 25.0,
            "stops": ["Banani", "Gulshan 2", "Badda Link Road", "Merul Badda"],
            "active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    db.bus_routes.insert_many(sample_bus_routes)
    print("Inserted sample bus routes")
