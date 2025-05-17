from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, DESCENDING

client = MongoClient('mongodb://localhost:27017/')
db = client.bracu_circle

class Message:
    @staticmethod
    def create_message(data):
        """Create a new message"""
        # Get sender information to store with the message
        sender = db.users.find_one({"_id": ObjectId(data["sender_id"])})
        sender_name = ""
        if sender:
            sender_name = f"{sender.get('first_name', '')} {sender.get('last_name', '')}".strip()
            if not sender_name:
                sender_name = sender.get("email", "")
                
        # Get receiver information
        receiver = db.users.find_one({"_id": ObjectId(data["receiver_id"])})
        receiver_name = ""
        if receiver:
            receiver_name = f"{receiver.get('first_name', '')} {receiver.get('last_name', '')}".strip()
            if not receiver_name:
                receiver_name = receiver.get("email", "")
        
        message = {
            "sender_id": ObjectId(data["sender_id"]),
            "receiver_id": ObjectId(data["receiver_id"]),
            "sender_name": sender_name,
            "receiver_name": receiver_name,
            "content": data["content"],
            "item_id": ObjectId(data["item_id"]) if data.get("item_id") else None,
            "item_type": data.get("item_type"),  # Type of item (marketplace, ride, etc.)
            "item_title": data.get("item_title"),  # Title of the item for display
            "image_url": data.get("image_url"),  # Support for image attachments
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
                "created_at": datetime.utcnow(),
                "hidden_for": []  # Track users who have deleted this conversation
            }
            db.conversations.insert_one(conversation)
        else:
            # If the conversation was previously deleted by either user, unhide it
            update_data = {
                "last_message": data["content"],
                "last_message_time": datetime.utcnow()
            }
            
            # Only remove the sender from hidden_for when a new message is sent
            # This ensures the sender can see the conversation again
            # The receiver will only see it if they haven't deleted it previously
            db.conversations.update_one(
                {"_id": conversation["_id"]},
                {
                    "$set": update_data,
                    "$pull": {"hidden_for": ObjectId(data["sender_id"])}
                }
            )
        
        result = db.messages.insert_one(message)
        return str(result.inserted_id) if result.inserted_id else None

    @staticmethod
    def get_user_conversations(user_id):
        """Get all conversations for a user"""
        # Only show conversations that aren't hidden for this user
        conversations = list(db.conversations.find({
            "$or": [
                {"participant1_id": ObjectId(user_id)},
                {"participant2_id": ObjectId(user_id)}
            ],
            "$or": [
                {"hidden_for": {"$exists": False}},  # For backward compatibility with old records
                {"hidden_for": {"$ne": ObjectId(user_id)}}  # Not hidden for this user
            ]
        }).sort("last_message_time", DESCENDING))
        
        # Process conversations
        for conv in conversations:
            conv["_id"] = str(conv["_id"])
            
            # Get other participant's details
            other_id = conv["participant2_id"] if conv["participant1_id"] == ObjectId(user_id) else conv["participant1_id"]
            other_user = db.users.find_one({"_id": other_id})
            
            if other_user:
                # Format the name properly using first_name and last_name
                other_name = f"{other_user.get('first_name', '')} {other_user.get('last_name', '')}".strip()
                if not other_name:
                    other_name = other_user.get("email", "Unknown User")
                    
                conv["other_participant"] = {
                    "id": str(other_user["_id"]),
                    "name": other_name,
                    "email": other_user.get("email", "")
                }
            
            # Check for unread messages
            unread_count = db.messages.count_documents({
                "sender_id": other_id,
                "receiver_id": ObjectId(user_id),
                "read": False
            })
            conv["unread"] = unread_count > 0
            conv["unread_count"] = unread_count
            
            # Convert ObjectIds to strings
            conv["participant1_id"] = str(conv["participant1_id"])
            conv["participant2_id"] = str(conv["participant2_id"])
            
            # Add hidden_for information if it exists
            if "hidden_for" in conv:
                conv["hidden_for"] = [str(user_id) for user_id in conv["hidden_for"]]
            else:
                conv["hidden_for"] = []
            
        return conversations

    @staticmethod
    def get_conversation_messages(user_id, other_user_id):
        """Get messages between two users"""
        # Ensure that only messages between these two specific users are returned
        # This prevents privacy issues where users can see messages not meant for them
        messages = list(db.messages.find({
            "$and": [
                # Either user_id is the sender OR user_id is the receiver
                # This ensures the current user is part of the conversation
                {
                    "$or": [
                        {"sender_id": ObjectId(user_id)},
                        {"receiver_id": ObjectId(user_id)}
                    ]
                },
                # AND either other_user_id is the sender OR other_user_id is the receiver
                # This ensures the other user is part of the conversation
                {
                    "$or": [
                        {"sender_id": ObjectId(other_user_id)},
                        {"receiver_id": ObjectId(other_user_id)}
                    ]
                }
            ]
        }).sort("created_at", 1))  # Sort in ascending order to show oldest messages first
        
        # Process messages
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            msg["sender_id"] = str(msg["sender_id"])
            msg["receiver_id"] = str(msg["receiver_id"])
            if "item_id" in msg and msg["item_id"]:
                msg["item_id"] = str(msg["item_id"])
                
            # Add sender and receiver information for better UI display
            sender = db.users.find_one({"_id": ObjectId(msg["sender_id"])})
            if sender:
                # Format name properly using first_name and last_name
                sender_name = f"{sender.get('first_name', '')} {sender.get('last_name', '')}".strip()
                if not sender_name:
                    sender_name = sender.get("email", "Unknown User")
                msg["sender_name"] = sender_name
                msg["sender_email"] = sender.get("email", "")
                
            # Also add receiver information
            receiver = db.users.find_one({"_id": ObjectId(msg["receiver_id"])})
            if receiver:
                receiver_name = f"{receiver.get('first_name', '')} {receiver.get('last_name', '')}".strip()
                if not receiver_name:
                    receiver_name = receiver.get("email", "Unknown User")
                msg["receiver_name"] = receiver_name
                msg["receiver_email"] = receiver.get("email", "")
            
            # Mark message as read if user is receiver
            if str(msg["receiver_id"]) == user_id and not msg["read"]:
                db.messages.update_one(
                    {"_id": ObjectId(msg["_id"])},
                    {"$set": {"read": True}}
                )
                msg["read"] = True
                
        return messages

    @staticmethod
    def get_message_by_id(message_id):
        """Get a message by its ID"""
        try:
            message = db.messages.find_one({"_id": ObjectId(message_id)})
            if message:
                message["_id"] = str(message["_id"])
                message["sender_id"] = str(message["sender_id"])
                message["receiver_id"] = str(message["receiver_id"])
                if message.get("item_id"):
                    message["item_id"] = str(message["item_id"])
            return message
        except Exception as e:
            print(f"Error getting message: {str(e)}")
            return None
            
    @staticmethod
    def mark_message_read(message_id, user_id):
        """Mark a message as read"""
        try:
            # Find the message and verify it belongs to the user
            message = db.messages.find_one({
                "_id": ObjectId(message_id),
                "receiver_id": ObjectId(user_id),
                "read": False
            })
            
            if not message:
                return False
                
            # Update the message
            result = db.messages.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": {"read": True}}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error marking message as read: {str(e)}")
            return False
            
    @staticmethod
    def mark_conversation_read(user_id, other_user_id):
        """Mark all messages in a conversation as read"""
        try:
            # Update all unread messages from the other user to this user
            result = db.messages.update_many(
                {
                    "sender_id": ObjectId(other_user_id),
                    "receiver_id": ObjectId(user_id),
                    "read": False
                },
                {"$set": {"read": True}}
            )
            
            return result.modified_count
        except Exception as e:
            print(f"Error marking conversation as read: {str(e)}")
            return 0
            
    @staticmethod
    def hide_conversation_for_user(conversation_id, user_id):
        """Hide a conversation for a specific user without deleting messages"""
        try:
            # Add the user to the hidden_for array
            result = db.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$addToSet": {"hidden_for": ObjectId(user_id)}}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error hiding conversation: {str(e)}")
            return False
            
    @staticmethod
    def check_conversation_hidden_status(conversation_id):
        """Check if a conversation is hidden for both users"""
        try:
            conversation = db.conversations.find_one({"_id": ObjectId(conversation_id)})
            if not conversation:
                return False, 0
                
            # Get the hidden_for array or empty list if it doesn't exist
            hidden_for = conversation.get("hidden_for", [])
            
            # Get participant IDs
            participant1_id = conversation["participant1_id"]
            participant2_id = conversation["participant2_id"]
            
            # Check if both participants have hidden the conversation
            participant1_hidden = participant1_id in hidden_for
            participant2_hidden = participant2_id in hidden_for
            
            return participant1_hidden and participant2_hidden, len(hidden_for)
        except Exception as e:
            print(f"Error checking conversation hidden status: {str(e)}")
            return False, 0
