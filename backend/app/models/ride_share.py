"""
Database schema for Ride Share system
"""
from datetime import datetime
from bson import ObjectId
from app.db import get_db

class RideShare:
    """
    Handles ride share posts and bookings
    """
    
    @staticmethod
    def create_ride_post(user_id, user_email, user_name, from_location, to_location, 
                         date, time, seats_available, description=None, is_paid=False, 
                         fee_per_seat=0, payment_method=None, contact_number=None):
        """
        Create a new ride share post
        """
        db = get_db()
        ride_post = {
            "creator_id": user_id,
            "creator_email": user_email,
            "creator_name": user_name,
            "from_location": from_location,
            "to_location": to_location,
            "date": date,
            "time": time,
            "seats_available": seats_available,
            "description": description,
            "is_paid": is_paid,
            "fee_per_seat": fee_per_seat if is_paid else 0,
            "payment_method": payment_method if is_paid else None,
            "contact_number": contact_number,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.ride_posts.insert_one(ride_post)
        return str(result.inserted_id)
    
    @staticmethod
    def get_all_rides(filters=None):
        """
        Get all available rides with optional filtering
        """
        db = get_db()
        query = {"status": "active"}
        
        if filters:
            if filters.get('from'):
                query['from_location'] = {"$regex": filters['from'], "$options": 'i'}
            if filters.get('to'):
                query['to_location'] = {"$regex": filters['to'], "$options": 'i'}
            if filters.get('date'):
                query['date'] = filters['date']
        
        rides = list(db.ride_posts.find(query))
        for ride in rides:
            ride['_id'] = str(ride['_id'])
        return rides

    @staticmethod
    def get_my_rides(user_id):
        """
        Get rides posted by a specific user
        """
        db = get_db()
        rides = list(db.ride_posts.find({"creator_id": user_id}))
        for ride in rides:
            ride['_id'] = str(ride['_id'])
        return rides

    @staticmethod
    def book_ride(ride_id, user_id, user_email, user_name, seats):
        """
        Book a ride
        """
        db = get_db()
        ride = db.ride_posts.find_one({"_id": ObjectId(ride_id)})
        
        if not ride:
            raise ValueError("Ride not found")
            
        if ride['seats_available'] < seats:
            raise ValueError("Not enough seats available")
            
        booking = {
            "ride_id": ride_id,
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "seats": seats,
            "status": "confirmed",
            "date": ride['date'],
            "time": ride['time'],
            "from_location": ride['from_location'],
            "to_location": ride['to_location'],
            "creator_id": ride['creator_id'],
            "fee_per_seat": ride['fee_per_seat'],
            "payment_method": ride['payment_method'],
            "contact_number": ride['contact_number'],
            "created_at": datetime.utcnow()
        }
        
        # Update available seats
        db.ride_posts.update_one(
            {"_id": ObjectId(ride_id)},
            {"$inc": {"seats_available": -seats}}
        )
        
        result = db.bookings.insert_one(booking)
        booking["_id"] = str(result.inserted_id)
        
        return {
            "booking": booking,
            "contact_info": {
                "contact_number": ride['contact_number'],
                "payment_method": ride['payment_method']
            }
        }

    @staticmethod
    def get_my_bookings(user_id):
        """
        Get bookings made by a specific user
        """
        db = get_db()
        bookings = list(db.bookings.find({"user_id": user_id}))
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
        return bookings

    @staticmethod
    def cancel_booking(booking_id, user_id, reason):
        """
        Cancel a booking
        """
        db = get_db()
        booking = db.bookings.find_one({"_id": ObjectId(booking_id), "user_id": user_id})
        
        if not booking:
            raise ValueError("Booking not found or unauthorized")
            
        # Return seats to ride post
        db.ride_posts.update_one(
            {"_id": ObjectId(booking['ride_id'])},
            {"$inc": {"seats_available": booking['seats']}}
        )
        
        # Update booking status
        db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": {
                "status": "cancelled",
                "cancel_reason": reason,
                "cancelled_at": datetime.utcnow()
            }}
        )
        
        return True

    @staticmethod
    def delete_ride(ride_id, user_id):
        """
        Delete a ride post
        """
        db = get_db()
        result = db.ride_posts.delete_one({"_id": ObjectId(ride_id), "creator_id": user_id})
        if result.deleted_count == 0:
            raise ValueError("Ride not found or unauthorized")
        return True
            
        ride_posts = list(db.ride_posts.find(query).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for post in ride_posts:
            post['_id'] = str(post['_id'])
            
        return ride_posts
    
    @staticmethod
    def book_ride(ride_id, user_id, user_email, user_name):
        """
        Book a ride
        """
        db = get_db()
        ride_post = db.ride_posts.find_one({"_id": ObjectId(ride_id)})
        
        if not ride_post:
            return None, "Ride post not found"
        
        if ride_post['user_id'] == user_id:
            return None, "You cannot book your own ride"
        
        if ride_post['seats_available'] <= 0:
            return None, "No seats available"
        
        if any(booking['user_id'] == user_id for booking in ride_post['booked_by']):
            return None, "You have already booked this ride"
        
        booking = {
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "booking_date": datetime.utcnow(),
            "status": "pending"
        }
        
        # Update the ride post
        result = db.ride_posts.update_one(
            {"_id": ObjectId(ride_id)},
            {
                "$push": {"booked_by": booking},
                "$inc": {"seats_available": -1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            # Also create a booking record
            booking_record = {
                "ride_id": ride_id,
                "ride_details": ride_post,
                "user_id": user_id,
                "user_email": user_email,
                "user_name": user_name,
                "booking_date": datetime.utcnow(),
                "status": "pending",
                "cancellation_reason": None
            }
            db.bookings.insert_one(booking_record)
            
            return True, "Ride booked successfully"
        
        return None, "Booking failed"
    
    @staticmethod
    def cancel_booking(booking_id, user_id, cancellation_reason):
        """
        Cancel a booking
        """
        db = get_db()
        booking = db.bookings.find_one({"_id": ObjectId(booking_id), "user_id": user_id})
        
        if not booking:
            return None, "Booking not found or you don't have permission"
        
        # Update booking status
        result = db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "cancellation_reason": cancellation_reason,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            # Update the ride post to increase available seats
            db.ride_posts.update_one(
                {"_id": ObjectId(booking["ride_id"])},
                {
                    "$inc": {"seats_available": 1},
                    "$set": {
                        "booked_by.$[elem].status": "cancelled",
                        "updated_at": datetime.utcnow()
                    }
                },
                array_filters=[{"elem.user_id": user_id}]
            )
            
            return True, "Booking cancelled successfully"
        
        return None, "Cancellation failed"
    
    @staticmethod
    def get_user_bookings(user_id):
        """
        Get bookings made by a specific user
        """
        db = get_db()
        bookings = list(db.bookings.find({"user_id": user_id}).sort("booking_date", -1))
        
        # Convert ObjectId to string for JSON serialization
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
            
        return bookings
    
    @staticmethod
    def get_ride_posts_by_user(user_id):
        """
        Get ride posts created by a specific user
        """
        db = get_db()
        ride_posts = list(db.ride_posts.find({"user_id": user_id}).sort("created_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for post in ride_posts:
            post['_id'] = str(post['_id'])
            
        return ride_posts
    
    @staticmethod
    def delete_ride_post(ride_id, user_id):
        """
        Delete a ride post
        """
        db = get_db()
        ride_post = db.ride_posts.find_one({"_id": ObjectId(ride_id)})
        
        if not ride_post:
            return None, "Ride post not found"
        
        if ride_post['user_id'] != user_id:
            return None, "You don't have permission to delete this post"
        
        # Check if anyone has booked this ride
        if ride_post['booked_by'] and any(booking['status'] == 'pending' for booking in ride_post['booked_by']):
            return None, "Cannot delete ride with active bookings"
        
        result = db.ride_posts.delete_one({"_id": ObjectId(ride_id), "user_id": user_id})
        
        if result.deleted_count > 0:
            return True, "Ride post deleted successfully"
        
        return None, "Deletion failed"
    
    @staticmethod
    def update_ride_post(ride_id, user_id, updates):
        """
        Update a ride post
        """
        db = get_db()
        ride_post = db.ride_posts.find_one({"_id": ObjectId(ride_id)})
        
        if not ride_post:
            return None, "Ride post not found"
        
        if ride_post['user_id'] != user_id:
            return None, "You don't have permission to update this post"
        
        # Don't allow updating if already fully booked
        if 'seats_available' in updates and ride_post['seats_available'] <= 0:
            return None, "Cannot update a fully booked ride"
        
        # Add updated timestamp
        updates['updated_at'] = datetime.utcnow()
        
        result = db.ride_posts.update_one(
            {"_id": ObjectId(ride_id), "user_id": user_id},
            {"$set": updates}
        )
        
        if result.modified_count > 0:
            return True, "Ride post updated successfully"
        
        return None, "Update failed"
