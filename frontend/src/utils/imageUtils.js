/**
 * Utility functions for handling images in the application
 */

/**
 * Formats an image URL by ensuring it has the proper prefix
 * If the URL already starts with http/https, it's returned as is
 * Otherwise, the backend server URL is prepended
 * 
 * @param {string} imageUrl - The image URL to format
 * @param {string} defaultImage - Optional default image to use if imageUrl is empty
 * @returns {string} The formatted image URL
 */
export const formatImageUrl = (imageUrl, defaultImage = '') => {
  if (!imageUrl) return defaultImage;
  
  // If the URL already starts with http/https, return it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Otherwise, prepend the backend server URL
  return `http://localhost:5000${imageUrl}`;
};

/**
 * Selects the first available image from an array or object
 * and formats it properly with the backend URL if needed
 * 
 * @param {Object} item - The item containing images
 * @param {string} defaultImage - Optional default image to use if no images are found
 * @returns {string} The formatted image URL
 */
export const getItemImage = (item, defaultImage = '') => {
  if (!item) return defaultImage;
  
  // Check for images array
  if (item.images && item.images.length > 0) {
    return formatImageUrl(item.images[0], defaultImage);
  }
  
  // Check for single image property
  if (item.image) {
    return formatImageUrl(item.image, defaultImage);
  }
  
  return defaultImage;
};
