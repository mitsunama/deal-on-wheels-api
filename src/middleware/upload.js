const multer = require('multer');
const HttpError = require('../utils/HttpError');

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Files stay in memory and are streamed to the bucket by the controller.
const make = (fileSize, files) =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) =>
      EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Only JPEG, PNG or WebP images allowed')),
    limits: { fileSize, files },
  });

const uploadImages = make(5 * 1024 * 1024, 10).array('images', 10); // vehicle photos
const uploadAvatar = make(2 * 1024 * 1024, 1).single('avatar');      // profile picture

module.exports = { uploadImages, uploadAvatar, EXT };
