from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.ride_controller import RideController

ride_bp = Blueprint('rides', __name__)
ride_controller = RideController()

@ride_bp.route('/offers', methods=['POST'])
@jwt_required()
def create_ride_offer():
    return ride_controller.create_ride_offer()

@ride_bp.route('/requests', methods=['POST'])
@jwt_required()
def create_ride_request():
    return ride_controller.create_ride_request()

@ride_bp.route('/<ride_id>', methods=['GET'])
@jwt_required()
def get_ride(ride_id):
    return ride_controller.get_ride(ride_id)

@ride_bp.route('', methods=['GET'])
@jwt_required()
def get_rides():
    return ride_controller.get_rides()

@ride_bp.route('/<ride_id>/contact', methods=['GET'])
@jwt_required()
def contact_ride_creator(ride_id):
    return ride_controller.contact_ride_creator(ride_id)
