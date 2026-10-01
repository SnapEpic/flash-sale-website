import multer from 'multer'
import { badRequest } from '../utils/AppError.js'

// Files are held in memory just long enough to stream them to Cloudinary; nothing is written to disk or MongoDB.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => (/^image\/(jpe?g|png|webp|avif|gif)$/.test(file.mimetype) ? cb(null, true) : cb(badRequest('Only JPG, PNG, WebP, AVIF or GIF images are allowed.', 'BAD_FILE_TYPE'))),
})
