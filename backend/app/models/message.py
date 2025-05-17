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
            "post_id": ObjectId(data["post_id"]),
            "post_type": data["post_type"],  # 'marketplace' or 'ride_share'
            "attachment_url": data.get("attachment_url"),
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
    def get_conversations_by_post(user_id, post_id, post_type):
        """Get conversations related to a specific post"""
        # Find messages related to this post
        messages = list(db.messages.find({
            "post_id": ObjectId(post_id),
            "post_type": post_type,
            "$or": [
                {"sender_id": ObjectId(user_id)},
                {"receiver_id": ObjectId(user_id)}
            ]
        }).sort("created_at", DESCENDING))
        
        # Extract unique conversation partners
        conversation_partners = set()
        for msg in messages:
            if str(msg["sender_id"]) == user_id:
                conversation_partners.add(str(msg["receiver_id"]))
            else:
                conversation_partners.add(str(msg["sender_id"]))
        
        # Get conversation details for each partner
        conversations = []
        for partner_id in conversation_partners:
            # Get partner details
            partner = db.users.find_one({"_id": ObjectId(partner_id)})
            if not partner:
                continue
                
            # Get latest message
            latest_message = db.messages.find_one({
                "post_id": ObjectId(post_id),
                "post_type": post_type,
                "$or": [
                    {
                        "sender_id": ObjectId(user_id),
                        "receiver_id": ObjectId(partner_id)
                    },
                    {
                        "sender_id": ObjectId(partner_id),
                        "receiver_id": ObjectId(user_id)
                    }
                ]
            }, sort=[("created_at", DESCENDING)])
            
            # Create conversation object
            conversation = {
                "_id": str(ObjectId()),  # Generate a unique ID
                "participant1_id": user_id,
                "participant2_id": partner_id,
                "post_id": post_id,
                "post_type": post_type,
                "other_participant": {
                    "id": partner_id,
                    "name": partner.get("name", "Unknown"),
                    "email": partner.get("email", "")
                },
                "last_message": latest_message["content"] if latest_message else "",
                "last_message_time": latest_message["created_at"] if latest_message else datetime.utcnow()
            }
            
            conversations.append(conversation)
            
        return sorted(conversations, key=lambda x: x["last_message_time"], reverse=True)
        
    @staticmethod
    def get_user_conversations(user_id):
        """Get all conversations for a user"""
        conversations = list(db.conversations.find({
            "$or": [
                {"participant1_id": ObjectId(user_id)},
                {"participant2_id": ObjectId(user_id)}
            ]
        }).sort("last_message_time", DESCENDING))
        
        # Get the latest message for each conversation
        for conv in conversations:
            # Get the latest message
            latest_message = db.messages.find_one({
                "$or": [
                    {
                        "sender_id": ObjectId(conv["participant1_id"]),
                        "receiver_id": ObjectId(conv["participant2_id"])
                    },
                    {
                        "sender_id": ObjectId(conv["participant2_id"]),
                        "receiver_id": ObjectId(conv["participant1_id"])
                    }
                ]
            }, sort=[("created_at", DESCENDING)])
            
            if latest_message:
                conv["latest_message"] = {
                    "content": latest_message["content"],
                    "sender_id": str(latest_message["sender_id"]),
                    "created_at": latest_message["created_at"],
                    "post_type": latest_message.get("post_type", ""),
                    "post_id": str(latest_message["post_id"]) if latest_message.get("post_id") else None,
                    "attachment_url": latest_message.get("attachment_url")
                }
        
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
    def get_conversation_messages(user_id, other_user_id, post_id=None):
        """Get messages between two users
        
        Args:
            user_id (str): The ID of the current user
            other_user_id (str): The ID of the other user in the conversation
            post_id (str, optional): If provided, filter messages by post_id
        """
        query = {
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
        }
        
        # Add post_id filter if provided
        if post_id:
            query["post_id"] = ObjectId(post_id)
            
        messages = list(db.messages.find(query).sort("created_at", DESCENDING))
        
        # Process messages
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            msg["sender_id"] = str(msg["sender_id"])
            msg["receiver_id"] = str(msg["receiver_id"])
            if msg.get("post_id"):
                msg["post_id"] = str(msg["post_id"])
            
            # Mark message as read if user is receiver
            if str(msg["receiver_id"]) == user_id and not msg["read"]:
                db.messages.update_one(
                    {"_id": ObjectId(msg["_id"])},
                    {"$set": {"read": True}}
                )
                msg["read"] = True
                
        return messages
