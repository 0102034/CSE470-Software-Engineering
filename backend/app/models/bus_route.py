from datetime import datetime
from bson import ObjectId
from app.db import db

class BusRoute:
    @staticmethod
    def create_route(data):
        """Create a new bus route"""
        route = {
            "bus_name": data["bus_name"],
            "route_name": data["route_name"],
            "from_location": data["from_location"],
            "to_location": data["to_location"],
            "stops": data.get("stops", []),
            "departure_times": data["departure_times"],  # List of times
            "fare": float(data["fare"]),
            "bus_type": data.get("bus_type", "Regular"),  # Regular, AC, Premium
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.bus_routes.insert_one(route)
        return str(result.inserted_id)
    
    @staticmethod
    def get_all_routes(filter_criteria=None):
        """Get all bus routes with optional filtering"""
        query = {}
        
        if filter_criteria:
            if "bus_name" in filter_criteria and filter_criteria["bus_name"]:
                query["bus_name"] = {"$regex": filter_criteria["bus_name"], "$options": "i"}
            
            if "from_location" in filter_criteria and filter_criteria["from_location"]:
                query["from_location"] = {"$regex": filter_criteria["from_location"], "$options": "i"}
            
            if "to_location" in filter_criteria and filter_criteria["to_location"]:
                query["to_location"] = {"$regex": filter_criteria["to_location"], "$options": "i"}
            
            if "bus_type" in filter_criteria and filter_criteria["bus_type"]:
                query["bus_type"] = filter_criteria["bus_type"]
        
        routes = list(db.bus_routes.find(query).sort("bus_name", 1))
        
        # Convert ObjectId to string for JSON serialization
        for route in routes:
            route["_id"] = str(route["_id"])
        
        return routes
    
    @staticmethod
    def get_route_by_id(route_id):
        """Get a bus route by ID"""
        route = db.bus_routes.find_one({"_id": ObjectId(route_id)})
        
        if route:
            route["_id"] = str(route["_id"])
        
        return route
    
    @staticmethod
    def update_route(route_id, data):
        """Update a bus route"""
        update_data = {
            "bus_name": data.get("bus_name"),
            "route_name": data.get("route_name"),
            "from_location": data.get("from_location"),
            "to_location": data.get("to_location"),
            "stops": data.get("stops"),
            "departure_times": data.get("departure_times"),
            "fare": float(data.get("fare", 0)),
            "bus_type": data.get("bus_type"),
            "updated_at": datetime.utcnow()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = db.bus_routes.update_one(
            {"_id": ObjectId(route_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def delete_route(route_id):
        """Delete a bus route"""
        result = db.bus_routes.delete_one({"_id": ObjectId(route_id)})
        return result.deleted_count > 0
    
    @staticmethod
    def seed_initial_routes():
        """Seed initial bus routes in Dhaka centered around BRAC University"""
        # Check if routes already exist
        if db.bus_routes.count_documents({}) > 0:
            return False
        
        initial_routes = [
            {
                "bus_name": "Dhaka Chaka",
                "route_name": "Badda-Gulshan-Mohakhali",
                "from_location": "Merul Badda (BRAC University)",
                "to_location": "Mohakhali",
                "stops": ["Merul Badda", "Gulshan 1", "Gulshan 2", "Mohakhali"],
                "departure_times": ["07:30", "08:30", "09:30", "12:30", "15:30", "17:30", "18:30"],
                "fare": 30.0,
                "bus_type": "AC"
            },
            {
                "bus_name": "Dhaka Metro",
                "route_name": "Badda-Rampura-Malibagh",
                "from_location": "Merul Badda (BRAC University)",
                "to_location": "Malibagh",
                "stops": ["Merul Badda", "Rampura", "Malibagh"],
                "departure_times": ["08:00", "09:00", "10:00", "13:00", "16:00", "18:00", "19:00"],
                "fare": 25.0,
                "bus_type": "Regular"
            },
            {
                "bus_name": "Green Dhaka",
                "route_name": "Badda-Banani-Airport",
                "from_location": "Merul Badda (BRAC University)",
                "to_location": "Airport",
                "stops": ["Merul Badda", "Gulshan 1", "Banani", "Airport"],
                "departure_times": ["07:00", "08:00", "09:00", "12:00", "15:00", "17:00", "19:00"],
                "fare": 40.0,
                "bus_type": "AC"
            },
            {
                "bus_name": "BRTC",
                "route_name": "Badda-Motijheel",
                "from_location": "Merul Badda (BRAC University)",
                "to_location": "Motijheel",
                "stops": ["Merul Badda", "Rampura", "Malibagh", "Kakrail", "Motijheel"],
                "departure_times": ["07:15", "08:15", "09:15", "12:15", "15:15", "17:15", "18:15"],
                "fare": 35.0,
                "bus_type": "Regular"
            },
            {
                "bus_name": "Dhaka Express",
                "route_name": "Badda-Uttara",
                "from_location": "Merul Badda (BRAC University)",
                "to_location": "Uttara",
                "stops": ["Merul Badda", "Gulshan", "Banani", "Airport", "Uttara"],
                "departure_times": ["07:45", "08:45", "09:45", "12:45", "15:45", "17:45", "19:45"],
                "fare": 45.0,
                "bus_type": "Premium"
            }
        ]
        
        for route_data in initial_routes:
            route_data["created_at"] = datetime.utcnow()
            route_data["updated_at"] = datetime.utcnow()
        
        db.bus_routes.insert_many(initial_routes)
        return True
