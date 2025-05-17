"""
Script to fix database issues with ride posts, bookings, and announcements.
This script will ensure all required collections exist and contain sample data.
"""
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

def ensure_collections_exist():
    """Ensure all required collections exist"""
    required_collections = [
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
    for collection in required_collections:
        if collection not in existing_collections:
            db.create_collection(collection)
            print(f"Created collection: {collection}")
        else:
            print(f"Collection already exists: {collection}")

def create_sample_ride_posts():
    """Create sample ride posts if none exist"""
    # Check if we already have sample data
    if db.ride_posts.count_documents({}) > 0:
        print("Sample ride posts already exist")
        return
    
    # Create sample ride posts
    sample_ride_posts = [
        {
            "user_id": ObjectId("6462f79d5057b87a9c4e5555"),  # This is a placeholder ID
            "user_name": "John Doe",
            "user_email": "john@example.com",
            "title": "Ride to BRAC University",
            "description": "Daily ride from Gulshan to BRAC University. AC car available.",
            "from_location": "Gulshan",
            "to_location": "Merul Badda (BRAC University)",
            "departure_date": "2025-05-04",
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
            "departure_date": "2025-05-04",
            "departure_time": "17:30",
            "available_seats": 2,
            "price": 120.0,
            "vehicle_type": "Car",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert sample ride posts
    result = db.ride_posts.insert_many(sample_ride_posts)
    print(f"Created {len(sample_ride_posts)} sample ride posts with IDs: {result.inserted_ids}")

def create_sample_bookings():
    """Create sample bookings if none exist"""
    # Check if we already have sample data
    if db.bookings.count_documents({}) > 0:
        print("Sample bookings already exist")
        return
    
    # Get a ride post to reference
    ride_post = db.ride_posts.find_one({})
    if not ride_post:
        print("No ride posts found to create sample bookings")
        return
    
    # Create sample bookings
    sample_bookings = [
        {
            "user_id": ObjectId("6462f79d5057b87a9c4e5557"),  # This is a placeholder ID
            "user_name": "Alice Johnson",
            "user_email": "alice@example.com",
            "post_id": ride_post["_id"],
            "post_type": "ride",
            "post_title": ride_post["title"],
            "post_creator_id": ride_post["user_id"],
            "post_creator_name": ride_post["user_name"],
            "post_creator_email": ride_post["user_email"],
            "from_location": ride_post["from_location"],
            "to_location": ride_post["to_location"],
            "departure_date": ride_post["departure_date"],
            "departure_time": ride_post["departure_time"],
            "seats_booked": 1,
            "total_fare": float(ride_post["price"]),
            "status": "confirmed",
            "cancellation_reason": None,
            "payment_method": "Cash",
            "payment_status": "pending",
            "booking_timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert sample bookings
    result = db.bookings.insert_many(sample_bookings)
    print(f"Created {len(sample_bookings)} sample bookings with IDs: {result.inserted_ids}")

def create_sample_announcements():
    """Create sample announcements if none exist"""
    # Check if we already have sample data
    if db.announcements.count_documents({}) > 0:
        print("Sample announcements already exist")
        return
    
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
    result = db.announcements.insert_many(sample_announcements)
    print(f"Created {len(sample_announcements)} sample announcements with IDs: {result.inserted_ids}")

def fix_database():
    """Fix database issues with ride posts, bookings, and announcements"""
    print("Starting database fix...")
    
    # Ensure all required collections exist
    ensure_collections_exist()
    
    # Create sample data
    create_sample_ride_posts()
    create_sample_bookings()
    create_sample_announcements()
    
    print("Database fix complete!")

if __name__ == "__main__":
    fix_database()
