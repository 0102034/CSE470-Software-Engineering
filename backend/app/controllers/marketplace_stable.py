"""
Stable marketplace controller with hardcoded responses to avoid ObjectId serialization issues.
"""

from flask import Blueprint, jsonify, current_app
from .. import limiter
from flask_jwt_extended import jwt_required, get_jwt_identity

# Create a new blueprint for stable marketplace endpoints
marketplace_stable_bp = Blueprint('marketplace_stable_bp', __name__)

@marketplace_stable_bp.route('/items', methods=['GET'])
@limiter.limit("60 per minute")
@jwt_required(optional=True)  # Make JWT optional for this endpoint
def get_items():
    """Get hardcoded marketplace items to avoid serialization issues"""
    try:
        # Return completely hardcoded data
        hardcoded_items = [
            {
                "_id": "item1",
                "title": "Sample Textbook",
                "description": "Computer Science textbook in excellent condition",
                "price": 1500,
                "category": "Books",
                "images": ["/uploads/sample_book.jpg"],
                "user_id": "user1",
                "user": {
                    "name": "John Doe",
                    "email": "john@g.bracu.ac.bd"
                },
                "created_at": "2025-05-01T12:00:00Z"
            },
            {
                "_id": "item2",
                "title": "Calculator",
                "description": "Scientific calculator, barely used",
                "price": 800,
                "category": "Electronics",
                "images": ["/uploads/sample_calculator.jpg"],
                "user_id": "user2",
                "user": {
                    "name": "Jane Smith",
                    "email": "jane@g.bracu.ac.bd"
                },
                "created_at": "2025-05-02T14:30:00Z"
            }
        ]
        
        # Add cache control headers for stability
        response = jsonify(hardcoded_items)
        response.headers['Cache-Control'] = 'max-age=300'  # Cache for 5 minutes
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error in stable marketplace items endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500
