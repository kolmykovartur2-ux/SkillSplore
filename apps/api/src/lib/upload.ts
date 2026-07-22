import multer from 'multer';
import { badRequest } from './errors.js';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const DOC_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_TYPES.has(file.mimetype)) {
      return cb(badRequest('Avatar must be a PNG, JPEG, WEBP or GIF image.'));
    }
    cb(null, true);
  },
});

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!DOC_TYPES.has(file.mimetype)) {
      return cb(badRequest('Documents must be a PDF, PNG or JPEG.'));
    }
    cb(null, true);
  },
});
