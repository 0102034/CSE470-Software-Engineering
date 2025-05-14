from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, DESCENDING

client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

class Message:
    @staticmethod
    def create_message(data):
        """Create a new message"""
        message = {
            "sender_id": ObjectId(data["sender_id"]),
            "receiver_id": ObjectId(data["receiver_id"]),
            "content": data["content"],
            "item_id": ObjectId(data["item_id"]) if data.get("item_id") else None,
            "read": False,
            "created_at": datetime.utcnow()
        }
        
        # Create or get conversation
        conversation = db.conversations.find_one({
            "$or": [
                {
                    "participant1_id": ObjectId(data["sender_id"]),
                    "participant2_id": ObjectId(data["receiver_id"])
                },
                {
                    "participant1_id": ObjectId(data["receiver_id"]),
                    "participant2_id": ObjectId(data["sender_id"])
                }
            ]
        })
        
        if not conversation:
            conversation = {
                "participant1_id": ObjectId(data["sender_id"]),
                "participant2_id": ObjectId(data["receiver_id"]),
                "last_message": data["content"],
                "last_message_time": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            db.conversations.insert_one(conversation)
        else:
            db.conversations.update_one(
                {"_id": conversation["_id"]},
                {
                    "$set": {
                        "last_message": data["content"],
                        "last_message_time": datetime.utcnow()
                    }
                }
            )
        
        result = db.messages.insert_one(message)
        return str(result.inserted_id) if result.inserted_id else None

    @staticmethod
    def get_user_conversations(user_id):
        """Get all conversations for a user"""
        conversations = list(db.conversations.find({
            "$or": [
                {"participant1_id": ObjectId(user_id)},
                {"participant2_id": ObjectId(user_id)}
            ]
        }).sort("last_message_time", DESCENDING))
        
        # Process conversations
        for conv in conversations:
            conv["_id"] = str(conv["_id"])
            
            # Get other participant's details
            other_id = conv["participant2_id"] if conv["participant1_id"] == ObjectId(user_id) else conv["participant1_id"]
            other_user = db.users.find_one({"_id": other_id})
            
            if other_user:
                conv["other_participant"] = {
                    "id": str(other_user["_id"]),
                    "name": other_user.get("name", "Unknown"),
                    "email": other_user.get("email", "")
                }
            
            # Convert ObjectIds to strings
            conv["participant1_id"] = str(conv["participant1_id"])
            conv["participant2_id"] = str(conv["participant2_id"])
            
        return conversations

    @staticmethod
    def get_conversation_messages(user_id, other_user_id):
        """Get messages between two users"""
        messages = list(db.messages.find({
            "$or": [
                {
                    "sender_id": ObjectId(user_id),
                    "receiver_id": ObjectId(other_user_id)
                },
                {
                    "sender_id": ObjectId(other_user_id),
                    "receiver_id": ObjectId(user_id)
                }
            ]
        }).sort("created_at", DESCENDING))
        
        # Process messages
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            msg["sender_id"] = str(msg["sender_id"])
            msg["receiver_id"] = str(msg["receiver_id"])
            if msg["item_id"]:
                msg["item_id"] = str(msg["item_id"])
            
            # Mark message as read if user is receiver
            if str(msg["receiver_id"]) == user_id and not msg["read"]:
                db.messages.update_one(
                    {"_id": ObjectId(msg["_id"])},
                    {"$set": {"read": True}}
                )
                msg["read"] = True
                
        return messages
