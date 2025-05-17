from flask import current_app, g

def get_db():
    """Get the MongoDB database connection.
    The connection is unique for each request and will be reused if this is called again.
    """
    # In the __init__.py file, we already set up app.db as the MongoDB connection
    # This function just provides a consistent interface for getting the database
    return current_app.db

def get_collection(collection_name):
    """Get a specific MongoDB collection.
    
    Args:
        collection_name: The name of the collection to get
        
    Returns:
        The requested MongoDB collection
    """
    db = get_db()
    return db[collection_name]

def init_app(app):
    """Register database functions with the Flask app.
    
    No special teardown is needed for MongoDB as the connection pooling
    is handled by the MongoClient.
    """
    # MongoDB connections are managed by the MongoClient in __init__.py
    # No additional setup needed here
    pass
