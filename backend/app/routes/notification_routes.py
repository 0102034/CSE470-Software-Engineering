from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.notification_controller import NotificationController

notification_bp = Blueprint('notifications', __name__)
notification_controller = NotificationController()

@notification_bp.route('', methods=['POST'])
@jwt_required()
def create_notification():
    return notification_controller.create_notification()

@notification_bp.route('/page/<page>', methods=['GET'])
def get_active_notifications(page):
    return notification_controller.get_active_notifications(page)

@notification_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required()
def deactivate_notification(notification_id):
    return notification_controller.deactivate_notification(notification_id)

@notification_bp.route('/<notification_id>', methods=['PUT'])
@jwt_required()
def update_notification(notification_id):
    return notification_controller.update_notification(notification_id)

@notification_bp.route('', methods=['GET'])
@jwt_required(optional=True)  # Allow both authenticated and unauthenticated access
def get_all_notifications():
    return notification_controller.get_all_notifications()
