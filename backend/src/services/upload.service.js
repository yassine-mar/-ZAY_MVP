'use strict';

const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const FOLDER_MAP = {
  items: 'zay/items',
  avatars: 'zay/avatars',
  sellers: 'zay/sellers',
};

const TRANSFORMATIONS = {
  items:   { width: 800,  height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
  avatars: { width: 200,  height: 200, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' },
  sellers: { width: 1200, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
};

/**
 * Upload a file buffer (from multer.memoryStorage()) to Cloudinary.
 * Transformations are applied at upload time so we store the resized version.
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
        if (error) {
          logger.error('Cloudinary upload failed', { folder, error: error.message });
          return reject(new AppError(500, 'UPLOAD_FAILED', 'Image upload failed'));
        }
        return resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });

/**
 * Delete an asset from Cloudinary. Errors are caught and logged — never thrown.
 * Orphaned assets are acceptable; what we cannot accept is a failed delete
 * blocking the database update that points to the new asset.
 *
 * Returns true on success, false on failure (caller may use this for retry
 * scheduling in Phase 2 — for MVP we just log).
 */
const deleteImage = async (publicId) => {
  if (!publicId) return false;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (result?.result !== 'ok' && result?.result !== 'not found') {
      logger.warn('Cloudinary delete returned unexpected status', { publicId, result });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Cloudinary delete failed', { publicId, error: err.message });
    return false;
  }
};

module.exports = { uploadImage, deleteImage };
