from pymongo import MongoClient
import json
from bson import ObjectId
import datetime

# Custom JSON encoder to handle MongoDB types
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super(MongoJSONEncoder, self).default(obj)

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

# Get all ride share data
rides = list(db.share_rides.find())
print(f"Found {len(rides)} rides in the database")

# Print each ride
for i, ride in enumerate(rides):
    print(f"\nRide {i+1}:")
    print(json.dumps(ride, indent=2, cls=MongoJSONEncoder))

# Check if the collection exists
collections = db.list_collection_names()
print(f"\nAvailable collections: {collections}")

# Count documents in each collection
for collection in collections:
    count = db[collection].count_documents({})
    print(f"Collection '{collection}' has {count} documents")
