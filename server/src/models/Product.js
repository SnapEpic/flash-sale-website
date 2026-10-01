import mongoose from 'mongoose'

const colorSchema = new mongoose.Schema({ name: { type: String, required: true }, hex: { type: String, required: true } }, { _id: false })

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true, sparse: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '' },
    brand: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    colors: { type: [colorSchema], default: [] },
    sizes: { type: [String], default: ['One size'] },
    // Units not yet sold. While a flash sale is running, Redis holds the *available* count
    // (this number minus units currently reserved by shoppers who are checking out).
    stock: { type: Number, required: true, min: 0 },
    totalStock: { type: Number, required: true, min: 1 },
    sold: { type: Number, default: 0 }, // persistent count of paid units
    isFlashSale: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

productSchema.index({ brand: 1 })
productSchema.index({ name: 1 })

productSchema.pre('validate', function (next) {
  if (this.originalPrice > 0) this.discount = Math.max(0, Math.round((1 - this.price / this.originalPrice) * 100))
  next()
})

export const Product = mongoose.model('Product', productSchema)
