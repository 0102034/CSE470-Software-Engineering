import os
from werkzeug.utils import secure_filename
import uuid

def save_image(file, folder):
    """
    Save an uploaded image to the specified folder
    
    Args:
        file: The uploaded file object
        folder: The subfolder to save the image in (e.g., 'marketplace', 'lost-found')
        
    Returns:
        str: The relative URL path to the saved image
    """
    if not file:
        return None
        
    # Get file extension
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    # Only allow image files
    if ext not in {'png', 'jpg', 'jpeg', 'gif'}:
        raise ValueError('Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed.')
    
    # Create unique filename
    unique_filename = f"{uuid.uuid4()}.{ext}"
    
    # Create folder if it doesn't exist
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', folder)
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder, exist_ok=True)
    
    # Save the file
    file_path = os.path.join(upload_folder, unique_filename)
    file.save(file_path)
    
    # Return relative URL path
    return f"/uploads/{folder}/{unique_filename}" 