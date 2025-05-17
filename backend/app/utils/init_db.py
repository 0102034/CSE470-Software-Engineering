"""
Database initialization script for BRACU Circle application.
This script creates all necessary collections and adds initial data.
"""

from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime
import os

def init_database():
    """Initialize the MongoDB database with required collections and sample data."""
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client.bracu_circle
        
        # Create collections if they don't exist
        collections = [
            'users', 'marketplace_items', 'rooms', 'bookings', 
            'share_rides', 'lost_found', 'notifications', 'messages',
            'announcements', 'conversations'
        ]
        
        existing_collections = db.list_collection_names()
        created_collections = []
        
        for collection in collections:
            if collection not in existing_collections:
                # Create the collection by inserting a dummy document and then removing it
                db[collection].insert_one({'temp': True})
                db[collection].delete_one({'temp': True})
                created_collections.append(collection)
        
        # Create admin user if it doesn't exist
        admin_user = db.users.find_one({"email": "470@gmail.com"})
        if not admin_user:
            admin = {
                "email": "470@gmail.com",
                "password": generate_password_hash("bracu2025"),
                "name": "Admin User",
                "role": "admin",
                "verification_status": "approved",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            db.users.insert_one(admin)
            created_collections.append("admin user")
        
        # Return information about what was created
        return {
            "success": True,
            "created_collections": created_collections,
            "message": f"Database initialized successfully. Created {len(created_collections)} new collections/items."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to initialize database: {str(e)}"
        }

if __name__ == "__main__":
    result = init_database()
    print(result)
