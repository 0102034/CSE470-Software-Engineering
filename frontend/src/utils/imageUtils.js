/**
 * Get the appropriate image URL for an item, handling different image storage formats
 * @param {Object} item - The item object containing image information
 * @returns {string} The URL of the first available image, or an empty string if no image is available
 */
export const getItemImage = (item) => {
  if (!item) return '';

  // Check for array of images
  if (item.images && item.images.length > 0) {
    const firstImage = item.images[0];
    return firstImage.startsWith('http') ? firstImage : `http://localhost:5000${firstImage}`;
  }

  // Check for single image
  if (item.image) {
    return item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`;
  }

  // No image available
  return '';
};
