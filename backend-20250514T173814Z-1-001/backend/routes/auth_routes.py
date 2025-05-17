from flask import Blueprint, request, jsonify
from controllers.auth_controller import register_user

import sys

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
def register():
    print('Register endpoint hit', file=sys.stderr)
    data = request.form.to_dict()
    file = request.files.get('id_card')
    print('Data received:', data, file=sys.stderr)
    result, status = register_user(data, file)
    print('Result:', result, 'Status:', status, file=sys.stderr)
    return jsonify(result), status
