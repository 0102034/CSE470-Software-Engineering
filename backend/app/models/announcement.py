from app.db import get_db
from bson.objectid import ObjectId
from datetime import datetime

class Announcement:
    """Model for announcements"""
    
    @staticmethod
    def create(announcement_data):
        """Create a new announcement"""
        db = get_db()
        result = db.announcements.insert_one(announcement_data)
        
        # Get the created announcement with its ID
        created_announcement = db.announcements.find_one({"_id": result.inserted_id})
        
        # Convert ObjectId to string for JSON serialization
        if created_announcement:
            created_announcement["_id"] = str(created_announcement["_id"])
            
        return created_announcement
    
    @staticmethod
    def get_all():
        """Get all announcements"""
        db = get_db()
        announcements = list(db.announcements.find().sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for announcement in announcements:
            announcement["_id"] = str(announcement["_id"])
            
        return announcements
    
    @staticmethod
    def get_by_page(page):
        """Get announcements for a specific page"""
        # Find announcements that include this page and are active
        db = get_db()
        announcements = list(db.announcements.find(
            {"pages": page, "active": True}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for announcement in announcements:
            announcement["_id"] = str(announcement["_id"])
            
        return announcements
    
    @staticmethod
    def update(announcement_id, update_data):
        """Update an announcement"""
        try:
            # Convert string ID to ObjectId
            obj_id = ObjectId(announcement_id)
            
            db = get_db()
            # Update the announcement
            result = db.announcements.update_one(
                {"_id": obj_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return None
                
            # Get the updated announcement
            updated_announcement = db.announcements.find_one({"_id": obj_id})
            
            # Convert ObjectId to string for JSON serialization
            if updated_announcement:
                updated_announcement["_id"] = str(updated_announcement["_id"])
                
            return updated_announcement
        except Exception as e:
            print(f"Error updating announcement: {e}")
            return None
    
    @staticmethod
    def delete(announcement_id):
        """Delete an announcement from the database"""
        try:
            # Convert string ID to ObjectId
            obj_id = ObjectId(announcement_id)
            
            db = get_db()
            # Actually delete the announcement from the database
            result = db.announcements.delete_one({"_id": obj_id})
            
            # Log the deletion for audit purposes
            if result.deleted_count > 0:
                print(f"Announcement {announcement_id} was permanently deleted from the database")
            
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting announcement: {e}")
            return False
