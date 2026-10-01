import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    blurb: { type: String, default: '' },
    image: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const Category = mongoose.model('Category', categorySchema)
