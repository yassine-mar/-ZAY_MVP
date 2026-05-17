'use strict';

const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const FOLDER_MAP = {
  items: 'zay/items',
  avatars: 'zay/avatars',
  sellers: 'zay/sellers',
};

const TRANSFORMATIONS = {
  items:   { width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
  avatars: { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' },
  sellers: { width: 1200, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
};

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer.memoryStorage()
 * @param {string} folder - One of: 'items' | 'avatars' | 'sellers'
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadImage = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER_MAP[folder] || 'zay/misc',
        transformation: TRANSFORMATIONS[folder],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(new AppError(500, 'UPLOAD_FAILED', 'Image upload failed'));
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });

/**
 * Delete an image from Cloudinary by public_id.
 * Failures are logged but do not throw — orphaned assets are acceptable.
 */
const deleteImage = async (publicId) => {
  // TODO: cloudinary.uploader.destroy(publicId)
  throw new Error('Not implemented');
};

module.exports = { uploadImage, deleteImage };
