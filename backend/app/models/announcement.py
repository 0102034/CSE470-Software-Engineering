from datetime import datetime
from bson import ObjectId
from app.db import db

class Announcement:
    @staticmethod
    def create_announcement(data):
        """Create a new announcement"""
        announcement = {
            "message": data["message"],
            "pages": data["pages"],  # List of pages where the announcement should be displayed
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.announcements.insert_one(announcement)
        return str(result.inserted_id)
    
    @staticmethod
    def get_all_announcements():
        """Get all announcements"""
        announcements = list(db.announcements.find().sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for announcement in announcements:
            announcement["_id"] = str(announcement["_id"])
        
        return announcements
    
    @staticmethod
    def get_announcements_by_page(page):
        """Get announcements for a specific page"""
        announcements = list(db.announcements.find({"pages": page}).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for announcement in announcements:
            announcement["_id"] = str(announcement["_id"])
        
        return announcements
    
    @staticmethod
    def get_announcement_by_id(announcement_id):
        """Get an announcement by ID"""
        announcement = db.announcements.find_one({"_id": ObjectId(announcement_id)})
        
        if announcement:
            announcement["_id"] = str(announcement["_id"])
        
        return announcement
    
    @staticmethod
    def update_announcement(announcement_id, data):
        """Update an announcement"""
        update_data = {
            "message": data.get("message"),
            "pages": data.get("pages"),
            "updated_at": datetime.utcnow()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = db.announcements.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def delete_announcement(announcement_id):
        """Delete an announcement"""
        result = db.announcements.delete_one({"_id": ObjectId(announcement_id)})
        return result.deleted_count > 0
