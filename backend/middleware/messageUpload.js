const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'messages');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';

    callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const isImage =
      ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension) &&
      file.mimetype.startsWith('image/');

    const isPdf = extension === '.pdf' && file.mimetype === 'application/pdf';

    if (!isImage && !isPdf) {
      return callback(
        new Error('Only JPG, PNG, GIF, WebP images and PDF files are allowed.'),
      );
    }

    callback(null, true);
  },
});

module.exports = upload;
