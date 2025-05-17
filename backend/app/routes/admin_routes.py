from flask import Blueprint, jsonify, request
from app.models.ride import Ride
from app.models.booking import Booking
from app.auth import admin_required
from app.db import db
from bson import ObjectId
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/statistics', methods=['GET'])
@admin_required
def get_statistics():
    """Get comprehensive statistics for the admin dashboard"""
    try:
        statistics = {
            "users": {
                "total": 0,
                "verified": 0,
                "pending": 0
            },
            "marketplace": {
                "total_items": 0,
                "active": 0,
                "sold": 0
            },
            "rideshare": {
                "total": 0,
                "active": 0,
                "completed": 0,
                "cancelled": 0
            },
            "lostfound": {
                "total": 0,
                "lost": 0,
                "found": 0,
                "resolved": 0
            }
        }
        
        # Get database connection
        try:
            # User statistics
            statistics["users"]["total"] = db.users.count_documents({})
            statistics["users"]["verified"] = db.users.count_documents({"verification_status": "approved"})
            statistics["users"]["pending"] = db.users.count_documents({"verification_status": "pending"})
        except Exception as e:
            print(f"Error getting user statistics: {e}")
        
        try:
            # Marketplace statistics - check if collection exists
            if "marketplace_items" in db.list_collection_names():
                statistics["marketplace"]["total_items"] = db.marketplace_items.count_documents({})
                statistics["marketplace"]["active"] = db.marketplace_items.count_documents({"status": "active"})
                statistics["marketplace"]["sold"] = db.marketplace_items.count_documents({"status": "sold"})
        except Exception as e:
            print(f"Error getting marketplace statistics: {e}")
        
        try:
            # Ride share statistics - check if collection exists
            if "rides" in db.list_collection_names():
                statistics["rideshare"]["total"] = db.rides.count_documents({})
                statistics["rideshare"]["active"] = db.rides.count_documents({"status": "available"})
                statistics["rideshare"]["completed"] = db.rides.count_documents({"status": "completed"})
                statistics["rideshare"]["cancelled"] = db.rides.count_documents({"status": "cancelled"})
        except Exception as e:
            print(f"Error getting rideshare statistics: {e}")
        
        try:
            # Lost & Found statistics - use the correct collection name
            if "lost_found_items" in db.list_collection_names():
                statistics["lostfound"]["total"] = db.lost_found_items.count_documents({})
                statistics["lostfound"]["lost"] = db.lost_found_items.count_documents({"item_type": "lost"})
                statistics["lostfound"]["found"] = db.lost_found_items.count_documents({"item_type": "found"})
                statistics["lostfound"]["resolved"] = db.lost_found_items.count_documents({"status": "resolved"})
        except Exception as e:
            print(f"Error getting lost & found statistics: {e}")
        
        return jsonify(statistics), 200
    except Exception as e:
        print(f"Error in get_statistics: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/rides', methods=['GET'])
@admin_required
def get_all_rides():
    try:
        # Get all rides with enhanced information
        pipeline = [
            {
                "$lookup": {
                    "from": "users",
                    "localField": "creator_id",
                    "foreignField": "_id",
                    "as": "creator"
                }
            },
            {"$unwind": "$creator"},
            {
                "$project": {
                    "from_location": 1,
                    "to_location": 1,
                    "date": 1,
                    "seats": 1,
                    "is_paid": 1,
                    "fee": 1,
                    "payment_method": 1,
                    "contact_number": 1,
                    "status": 1,
                    "created_at": 1,
                    "bookings": 1,
                    "creator": {
                        "name": "$creator.name",
                        "email": "$creator.email"
                    }
                }
            }
        ]
        
        rides = list(db.rides.aggregate(pipeline))
        
        # Calculate statistics
        stats = {
            "total": len(rides),
            "active": len([r for r in rides if r.get("status") == "available"]),
            "cancelled": len([r for r in rides if r.get("status") == "cancelled"]),
            "completed": len([r for r in rides if r.get("status") == "completed"])
        }
        
        return jsonify({
            "rides": rides,
            "stats": stats
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/rides/<ride_id>', methods=['DELETE'])
@admin_required
def delete_ride(ride_id):
    try:
        # Delete all bookings for this ride
        db.bookings.delete_many({"ride_id": ObjectId(ride_id)})
        
        # Delete the ride
        result = db.rides.delete_one({"_id": ObjectId(ride_id)})
        
        if result.deleted_count:
            return jsonify({"message": "Ride and associated bookings deleted successfully"}), 200
        return jsonify({"error": "Ride not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/rides/<ride_id>/block', methods=['POST'])
@admin_required
def block_ride(ride_id):
    try:
        result = db.rides.update_one(
            {"_id": ObjectId(ride_id)},
            {"$set": {"status": "blocked"}}
        )
        
        if result.modified_count:
            return jsonify({"message": "Ride blocked successfully"}), 200
        return jsonify({"error": "Ride not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/bookings', methods=['GET'])
@admin_required
def get_all_bookings():
    try:
        pipeline = [
            {
                "$lookup": {
                    "from": "rides",
                    "localField": "ride_id",
                    "foreignField": "_id",
                    "as": "ride"
                }
            },
            {"$unwind": "$ride"},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {"$unwind": "$user"},
            {
                "$project": {
                    "status": 1,
                    "created_at": 1,
                    "cancellation_reason": 1,
                    "ride": {
                        "from_location": "$ride.from_location",
                        "to_location": "$ride.to_location",
                        "date": "$ride.date"
                    },
                    "user": {
                        "name": "$user.name",
                        "email": "$user.email"
                    }
                }
            }
        ]
        
        bookings = list(db.bookings.aggregate(pipeline))
        return jsonify(bookings), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Lost & Found routes
@admin_bp.route('/lost-found', methods=['GET'])
@admin_required
def get_all_lost_found():
    try:
        # Get all lost & found items with enhanced information
        pipeline = [
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {"$unwind": "$user"},
            {
                "$project": {
                    "title": 1,
                    "description": 1,
                    "category": 1,
                    "location": 1,
                    "date": 1,
                    "type": 1,
                    "status": 1,
                    "created_at": 1,
                    "user": {
                        "name": "$user.name",
                        "email": "$user.email",
                        "phone": "$user.phone"
                    },
                    "contact_info": "$user.phone"
                }
            }
        ]
        
        items = list(db.lost_found.aggregate(pipeline))
        
        # Calculate statistics
        stats = {
            "total": len(items),
            "lost": len([i for i in items if i.get("type") == "lost"]),
            "found": len([i for i in items if i.get("type") == "found"]),
            "resolved": len([i for i in items if i.get("status") == "resolved"])
        }
        
        return jsonify({
            "items": items,
            "stats": stats
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/lost-items', methods=['GET'])
@admin_required
def get_lost_items():
    try:
        # Get only lost items
        pipeline = [
            {"$match": {"type": "lost"}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {"$unwind": "$user"},
            {
                "$project": {
                    "title": 1,
                    "description": 1,
                    "category": 1,
                    "location": 1,
                    "date": 1,
                    "image": 1,
                    "status": 1,
                    "created_at": 1,
                    "user": {
                        "name": "$user.name",
                        "email": "$user.email"
                    }
                }
            }
        ]
        
        items = list(db.lost_found.aggregate(pipeline))
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/found-items', methods=['GET'])
@admin_required
def get_found_items():
    try:
        # Get only found items
        pipeline = [
            {"$match": {"type": "found"}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {"$unwind": "$user"},
            {
                "$project": {
                    "title": 1,
                    "description": 1,
                    "category": 1,
                    "location": 1,
                    "date": 1,
                    "image": 1,
                    "status": 1,
                    "created_at": 1,
                    "user": {
                        "name": "$user.name",
                        "email": "$user.email"
                    }
                }
            }
        ]
        
        items = list(db.lost_found.aggregate(pipeline))
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/lost-found/<item_id>', methods=['DELETE'])
@admin_required
def delete_lost_found_item(item_id):
    try:
        result = db.lost_found.delete_one({"_id": ObjectId(item_id)})
        
        if result.deleted_count:
            return jsonify({"message": "Item deleted successfully"}), 200
        return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/lost-found/<item_id>', methods=['PUT', 'PATCH'])
@admin_bp.route('/admin/lost-found/<item_id>', methods=['PUT', 'PATCH'])
@admin_bp.route('/admin/lost-items/<item_id>', methods=['PUT', 'PATCH'])
@admin_bp.route('/lost-items/<item_id>', methods=['PUT', 'PATCH'])
@admin_required
def update_lost_found_item(item_id):
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['title', 'description', 'category', 'location']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Prepare update data
        update_data = {
            "title": data['title'],
            "description": data['description'],
            "category": data['category'],
            "location": data['location'],
            "updated_at": datetime.utcnow()
        }
        
        # Optional fields
        if 'status' in data:
            update_data['status'] = data['status']
        
        # Update the item
        result = db.lost_found.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": update_data}
        )
        
        if result.modified_count:
            # Get the updated item
            updated_item = db.lost_found.find_one({"_id": ObjectId(item_id)})
            if updated_item:
                updated_item['_id'] = str(updated_item['_id'])
                updated_item['user_id'] = str(updated_item['user_id'])
                return jsonify({
                    "message": "Item updated successfully",
                    "item": updated_item
                }), 200
            return jsonify({"message": "Item updated successfully"}), 200
        
        return jsonify({"error": "Item not found or no changes made"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/bus-routes', methods=['GET'])
@admin_required
def get_bus_routes():
    try:
        bus_routes = list(db.bus_routes.find())
        
        # Convert ObjectId to string
        for route in bus_routes:
            route['_id'] = str(route['_id'])
        
        return jsonify(bus_routes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/bus-routes', methods=['POST'])
@admin_required
def create_bus_route():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'route', 'schedule']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        new_route = {
            'name': data['name'],
            'route': data['route'],
            'schedule': data['schedule'],
            'created_at': datetime.utcnow()
        }
        
        result = db.bus_routes.insert_one(new_route)
        
        return jsonify({
            "message": "Bus route created successfully",
            "route_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
