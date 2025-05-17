from datetime import datetime
from bson import ObjectId
from app.db import db

class Booking:
    @staticmethod
    def create_booking(data):
        """Create a new booking for a ride or bus"""
        booking = {
            "user_id": ObjectId(data["user_id"]),
            "user_name": data["user_name"],
            "user_email": data["user_email"],
            "post_id": ObjectId(data["post_id"]),
            "post_type": data["post_type"],  # "ride" or "bus"
            "post_title": data["post_title"],
            "post_creator_id": ObjectId(data["post_creator_id"]),
            "post_creator_name": data["post_creator_name"],
            "post_creator_email": data["post_creator_email"],
            "from_location": data["from_location"],
            "to_location": data["to_location"],
            "departure_date": data.get("departure_date"),
            "departure_time": data["departure_time"],
            "seats_booked": int(data.get("seats_booked", 1)),
            "total_fare": float(data["total_fare"]),
            "status": "confirmed",  # confirmed, completed, cancelled
            "cancellation_reason": None,
            "payment_method": data.get("payment_method", None),
            "payment_status": data.get("payment_status", "pending"),  # pending, completed, not_required
            "booking_timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.bookings.insert_one(booking)
        booking_id = str(result.inserted_id)
        
        # Update the post status to booked if it's a ride post
        if data["post_type"] == "ride":
            db.ride_posts.update_one(
                {"_id": ObjectId(data["post_id"])},
                {"$set": {"status": "booked", "updated_at": datetime.utcnow()}}
            )
        
        return booking_id
    
    @staticmethod
    def get_user_bookings(user_id):
        """Get all bookings made by a user"""
        bookings = list(db.bookings.find({"user_id": ObjectId(user_id)}).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for booking in bookings:
            booking["_id"] = str(booking["_id"])
            booking["user_id"] = str(booking["user_id"])
            booking["post_id"] = str(booking["post_id"])
            booking["post_creator_id"] = str(booking["post_creator_id"])
        
        return bookings
    
    @staticmethod
    def get_post_bookings(post_id):
        """Get all bookings for a specific post"""
        bookings = list(db.bookings.find({"post_id": ObjectId(post_id)}).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for booking in bookings:
            booking["_id"] = str(booking["_id"])
            booking["user_id"] = str(booking["user_id"])
            booking["post_id"] = str(booking["post_id"])
            booking["post_creator_id"] = str(booking["post_creator_id"])
        
        return bookings
    
    @staticmethod
    def get_booking_by_id(booking_id):
        """Get a booking by ID"""
        booking = db.bookings.find_one({"_id": ObjectId(booking_id)})
        
        if booking:
            booking["_id"] = str(booking["_id"])
            booking["user_id"] = str(booking["user_id"])
            booking["post_id"] = str(booking["post_id"])
            booking["post_creator_id"] = str(booking["post_creator_id"])
        
        return booking
    
    @staticmethod
    def cancel_booking(booking_id, reason):
        """Cancel a booking with a reason"""
        booking = db.bookings.find_one({"_id": ObjectId(booking_id)})
        
        if not booking:
            return False
            
        # Check if the ride is within 30 minutes of departure
        current_time = datetime.utcnow()
        departure_date = booking.get("departure_date")
        departure_time = booking.get("departure_time")
        
        if departure_date and departure_time:
            try:
                # Parse the departure date and time
                departure_str = f"{departure_date} {departure_time}"
                departure_datetime = datetime.strptime(departure_str, "%Y-%m-%d %H:%M")
                
                # Calculate time difference in minutes
                time_diff = (departure_datetime - current_time).total_seconds() / 60
                
                # If less than 30 minutes remain, don't allow cancellation
                if time_diff < 30:
                    return {"success": False, "message": "Cannot cancel booking with less than 30 minutes remaining before departure"}
            except Exception as e:
                # If there's an error parsing the date/time, log it but continue with cancellation
                print(f"Error checking departure time: {str(e)}")
        
        result = db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "cancellation_reason": reason,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # If this is a ride post booking, update the post status back to active
        if booking["post_type"] == "ride":
            db.ride_posts.update_one(
                {"_id": ObjectId(booking["post_id"])},
                {"$set": {"status": "active", "updated_at": datetime.utcnow()}}
            )
        
        return result.modified_count > 0
    
    @staticmethod
    def complete_booking(booking_id):
        """Mark a booking as completed"""
        result = db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": "completed",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
