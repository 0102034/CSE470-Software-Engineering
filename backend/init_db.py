from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

def create_collections():
    """Create all necessary collections if they don't exist"""
    # List of collections to ensure exist
    collections = [
        'users',
        'marketplace_items',
        'marketplace_purchases',
        'ride_posts',
        'share_rides',
        'ride_bookings',
        'announcements',
        'notifications',
        'bookings',
        'bus_routes',
        'messages',
        'conversations',
        'lost_found'
    ]
    
    # Get existing collections
    existing_collections = db.list_collection_names()
    print(f"Existing collections: {existing_collections}")
    
    # Create collections that don't exist
    for collection in collections:
        if collection not in existing_collections:
            db.create_collection(collection)
            print(f"Created collection: {collection}")
        else:
            print(f"Collection already exists: {collection}")

def create_sample_data():
    """Create sample data for testing"""
    # Check if we already have sample data
    if db.ride_posts.count_documents({}) > 0:
        print("Sample ride posts already exist")
    else:
        # Create sample ride posts
        sample_ride_posts = [
            {
                "user_id": "6806539c590ac678931ded4c",  # Replace with actual user ID
                "pickup_location": "Badda",
                "dropoff_location": "BRACU",
                "from_location": "Badda",
                "to_location": "BRACU",
                "date": "2025-05-04",
                "time": "09:00",
                "available_seats": 3,
                "seats_available": 3,
                "amount_per_seat": 50,
                "notes": "Morning ride to campus",
                "contact_info": "01712345678",
                "status": "active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "user_id": "6806539c590ac678931ded4c",  # Replace with actual user ID
                "pickup_location": "BRACU",
                "dropoff_location": "Gulshan",
                "from_location": "BRACU",
                "to_location": "Gulshan",
                "date": "2025-05-04",
                "time": "17:00",
                "available_seats": 2,
                "seats_available": 2,
                "amount_per_seat": 60,
                "notes": "Evening ride from campus",
                "contact_info": "01712345678",
                "status": "active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert sample ride posts
        db.ride_posts.insert_many(sample_ride_posts)
        print(f"Created {len(sample_ride_posts)} sample ride posts")
    
    # Check if we already have sample announcements
    if db.announcements.count_documents({}) > 0:
        print("Sample announcements already exist")
    else:
        # Create sample announcements
        sample_announcements = [
            {
                "message": "Welcome to BRACU Circle! Connect with fellow students for ride sharing.",
                "pages": ["home", "ride_share", "marketplace"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "message": "New ride sharing feature available! Book rides to and from campus.",
                "pages": ["ride_share"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert sample announcements
        db.announcements.insert_many(sample_announcements)
        print(f"Created {len(sample_announcements)} sample announcements")

if __name__ == "__main__":
    print("Initializing database...")
    create_collections()
    create_sample_data()
    print("Database initialization complete!")
