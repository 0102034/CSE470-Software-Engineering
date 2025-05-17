from datetime import datetime
from bson import ObjectId
from app.db import db

class RidePost:
    @staticmethod
    def create_post(data):
        """Create a new ride share post"""
        try:
            # Ensure all required fields have values
            user_id = data.get("user_id")
            if not user_id:
                raise ValueError("User ID is required")
            
            # Convert user_id to ObjectId if it's a string
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            
            # Prepare post data
            post = {
                "user_id": user_id,
                "title": data.get("title", f"Ride from {data.get('from_location')} to {data.get('to_location')}"),
                "description": data.get("description", ""),
                "from_location": data.get("from_location"),
                "to_location": data.get("to_location"),
                "departure_date": data.get("departure_date"),
                "departure_time": data.get("departure_time"),
                "available_seats": int(data.get("available_seats", 1)),
                "price": float(data.get("price", 0)),
                "vehicle_type": data.get("vehicle_type", "Car"),
                "status": data.get("status", "active"),
                "user_name": data.get("user_name", ""),
                "user_email": data.get("user_email", ""),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Check if collections exist, create if not
            collections = db.list_collection_names()
            if "ride_posts" not in collections:
                db.create_collection("ride_posts")
                print("Created ride_posts collection")
            
            # Insert into ride_posts collection
            result = db.ride_posts.insert_one(post)
            post_id = str(result.inserted_id)
            
            # Also insert into share_rides collection for backward compatibility
            if "share_rides" not in collections:
                db.create_collection("share_rides")
                print("Created share_rides collection")
            
            # Create a copy of the post with the same _id for share_rides
            share_ride_post = post.copy()
            share_ride_post["_id"] = result.inserted_id  # Use the same ID
            
            try:
                db.share_rides.insert_one(share_ride_post)
                print(f"Post {post_id} inserted into both collections")
            except Exception as e:
                print(f"Error inserting into share_rides: {str(e)}")
            
            return post_id
        except Exception as e:
            print(f"Error in create_post: {str(e)}")
            raise
    
    @staticmethod
    def get_all_posts(filter_criteria=None):
        """Get all ride share posts with optional filtering"""
        try:
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
            
            # Check collections and combine results from both collections
            collections = db.list_collection_names()
            posts = []
            post_ids_seen = set()  # Track seen post IDs to avoid duplicates
            
            # First check ride_posts collection (primary)
            if "ride_posts" in collections:
                cursor = db.ride_posts.find(query).sort("created_at", -1)
                for post in cursor:
                    post_id = str(post["_id"])
                    if post_id not in post_ids_seen:
                        post_ids_seen.add(post_id)
                        
                        post_dict = {}
                        for key, value in post.items():
                            if key == "_id" or key == "user_id":
                                post_dict[key] = str(value)
                            elif isinstance(value, datetime):
                                post_dict[key] = value.isoformat()
                            else:
                                post_dict[key] = value
                        posts.append(post_dict)
                
                print(f"Retrieved {len(posts)} ride posts from ride_posts collection")
            
            # Then check share_rides collection for any posts not already included
            if "share_rides" in collections:
                share_rides_count_before = len(posts)
                cursor = db.share_rides.find(query).sort("created_at", -1)
                for post in cursor:
                    post_id = str(post["_id"])
                    if post_id not in post_ids_seen:
                        post_ids_seen.add(post_id)
                        
                        post_dict = {}
                        for key, value in post.items():
                            if key == "_id" or key == "user_id":
                                post_dict[key] = str(value)
                            elif isinstance(value, datetime):
                                post_dict[key] = value.isoformat()
                            else:
                                post_dict[key] = value
                        posts.append(post_dict)
                
                share_rides_count = len(posts) - share_rides_count_before
                print(f"Retrieved {share_rides_count} additional ride posts from share_rides collection")
            
            # If no posts found in either collection, check if we need to migrate data
            if len(posts) == 0:
                # Check if there's a legacy collection that might have posts
                if "share_rides" in collections and "ride_posts" not in collections:
                    print("No ride_posts collection found but share_rides exists. Creating ride_posts collection...")
                    db.create_collection("ride_posts")
                    
                    # Migrate data from share_rides to ride_posts
                    share_rides_cursor = db.share_rides.find()
                    for ride in share_rides_cursor:
                        # Insert into ride_posts with the same _id
                        try:
                            db.ride_posts.insert_one(ride)
                        except Exception as e:
                            print(f"Error migrating ride: {str(e)}")
                    
                    # Try fetching again
                    return RidePost.get_all_posts(filter_criteria)
            
            print(f"Total ride posts retrieved: {len(posts)}")
            return posts
            
        except Exception as e:
            print(f"Error in get_all_posts: {str(e)}")
            return []
    
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
        try:
            # Convert post_id to ObjectId
            post_id_obj = ObjectId(post_id)
            
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
            
            # Update in ride_posts collection
            result1 = db.ride_posts.update_one(
                {"_id": post_id_obj},
                {"$set": update_data}
            )
            
            # Also update in share_rides collection for consistency
            result2 = db.share_rides.update_one(
                {"_id": post_id_obj},
                {"$set": update_data}
            )
            
            # Log the update results
            print(f"Update results - ride_posts: {result1.modified_count}, share_rides: {result2.modified_count}")
            
            return result1.modified_count > 0 or result2.modified_count > 0
        except Exception as e:
            print(f"Error updating ride post: {str(e)}")
            raise e
    
    @staticmethod
    def update_status(post_id, status):
        """Update the status of a ride share post"""
        try:
            # Convert post_id to ObjectId
            post_id_obj = ObjectId(post_id)
            
            update_data = {
                "status": status, 
                "updated_at": datetime.utcnow()
            }
            
            # Update in ride_posts collection
            result1 = db.ride_posts.update_one(
                {"_id": post_id_obj},
                {"$set": update_data}
            )
            
            # Also update in share_rides collection for consistency
            result2 = db.share_rides.update_one(
                {"_id": post_id_obj},
                {"$set": update_data}
            )
            
            # Log the update results
            print(f"Status update results - ride_posts: {result1.modified_count}, share_rides: {result2.modified_count}")
            
            return result1.modified_count > 0 or result2.modified_count > 0
        except Exception as e:
            print(f"Error updating ride post status: {str(e)}")
            raise e
    
    @staticmethod
    def delete_post(post_id):
        """Delete a ride share post"""
        try:
            # Convert post_id to ObjectId
            post_id_obj = ObjectId(post_id)
            
            # Delete from ride_posts collection
            result1 = db.ride_posts.delete_one({"_id": post_id_obj})
            
            # Also delete from share_rides collection for consistency
            result2 = db.share_rides.delete_one({"_id": post_id_obj})
            
            # Log the delete results
            print(f"Delete results - ride_posts: {result1.deleted_count}, share_rides: {result2.deleted_count}")
            
            return result1.deleted_count > 0 or result2.deleted_count > 0
        except Exception as e:
            print(f"Error deleting ride post: {str(e)}")
            raise e
