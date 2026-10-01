import { Router } from 'express'
import { cloudinary, cloudinaryConfigured } from '../config/cloudinary.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { imageUpload } from '../middleware/upload.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError, badRequest } from '../utils/AppError.js'

const router = Router()

const toCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'dropline/products', resource_type: 'image', transformation: [{ width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] },
      (err, result) => (err ? reject(err) : resolve(result)),
    )
    stream.end(file.buffer)
  })

// POST /api/uploads/images  (multipart, field name "images") -> [{ url, publicId }]
router.post('/images', protect, adminOnly, imageUpload.array('images', 6), asyncHandler(async (req, res) => {
  if (!cloudinaryConfigured()) throw new AppError(503, 'Image uploads are not configured on this server yet.', 'UPLOADS_NOT_CONFIGURED')
  if (!req.files?.length) throw badRequest('Attach at least one image in the "images" field.', 'NO_FILE')
  try {
    const results = await Promise.all(req.files.map(toCloudinary))
    res.status(201).json({ images: results.map((r) => ({ url: r.secure_url, publicId: r.public_id, width: r.width, height: r.height })) })
  } catch (err) {
    console.error('[cloudinary] upload failed:', err?.message || err)
    throw new AppError(502, 'Image upload failed. Please try again.', 'UPLOAD_FAILED')
  }
}))

export default router
