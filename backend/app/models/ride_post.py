from datetime import datetime
from bson import ObjectId
from app.db import db

class RidePost:
    @staticmethod
    def create_post(data):
        """Create a new ride share post"""
        post = {
            "user_id": ObjectId(data["user_id"]),
            "user_name": data["user_name"],
            "user_email": data["user_email"],
            "title": data["title"],
            "description": data["description"],
            "from_location": data["from_location"],
            "to_location": data["to_location"],
            "departure_date": data["departure_date"],
            "departure_time": data["departure_time"],
            "available_seats": int(data["available_seats"]),
            "price": float(data["price"]),
            "vehicle_type": data["vehicle_type"],
            "status": "active",  # active, booked, completed, cancelled
            "is_free": data.get("is_free", False),
            "fee_amount": float(data.get("fee_amount", 0)),
            "payment_method": data.get("payment_method", None),  # Bkash, Nagad, In Person, None for free rides
            "payment_number": data.get("payment_number", None),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.ride_posts.insert_one(post)
        return str(result.inserted_id)
    
    @staticmethod
    def get_all_posts(filter_criteria=None):
        """Get all ride share posts with optional filtering"""
        query = {}
        
        if filter_criteria:
            if "from_location" in filter_criteria and filter_criteria["from_location"]:
                query["from_location"] = {"$regex": filter_criteria["from_location"], "$options": "i"}
            
            if "to_location" in filter_criteria and filter_criteria["to_location"]:
                query["to_location"] = {"$regex": filter_criteria["to_location"], "$options": "i"}
            
            if "departure_date" in filter_criteria and filter_criteria["departure_date"]:
                query["departure_date"] = filter_criteria["departure_date"]
            
            if "status" in filter_criteria and filter_criteria["status"]:
                query["status"] = filter_criteria["status"]
        
        posts = list(db.ride_posts.find(query).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for post in posts:
            post["_id"] = str(post["_id"])
            post["user_id"] = str(post["user_id"])
        
        return posts
    
    @staticmethod
    def get_post_by_id(post_id):
        """Get a ride share post by ID"""
        post = db.ride_posts.find_one({"_id": ObjectId(post_id)})
        
        if post:
            post["_id"] = str(post["_id"])
            post["user_id"] = str(post["user_id"])
        
        return post
    
    @staticmethod
    def get_user_posts(user_id):
        """Get all ride share posts created by a user"""
        try:
            # Try to convert user_id to ObjectId
            user_id_obj = ObjectId(user_id)
            posts = list(db.ride_posts.find({"user_id": user_id_obj}).sort("created_at", -1))
            
            # Convert ObjectId to string for JSON serialization
            for post in posts:
                post["_id"] = str(post["_id"])
                post["user_id"] = str(post["user_id"])
            
            return posts
        except Exception as e:
            print(f"Error in get_user_posts: {str(e)}")
            return []
    
    @staticmethod
    def update_post(post_id, data):
        """Update a ride share post"""
        update_data = {
            "title": data.get("title"),
            "description": data.get("description"),
            "from_location": data.get("from_location"),
            "to_location": data.get("to_location"),
            "departure_date": data.get("departure_date"),
            "departure_time": data.get("departure_time"),
            "available_seats": int(data.get("available_seats", 1)),
            "price": float(data.get("price", 0)),
            "vehicle_type": data.get("vehicle_type"),
            "is_free": data.get("is_free"),
            "fee_amount": float(data.get("fee_amount", 0)) if data.get("fee_amount") is not None else None,
            "payment_method": data.get("payment_method"),
            "payment_number": data.get("payment_number"),
            "updated_at": datetime.utcnow()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = db.ride_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def update_status(post_id, status):
        """Update the status of a ride share post"""
        result = db.ride_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def delete_post(post_id):
        """Delete a ride share post"""
        result = db.ride_posts.delete_one({"_id": ObjectId(post_id)})
        return result.deleted_count > 0
