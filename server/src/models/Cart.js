import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  color: { type: String, required: true },
  size: { type: String, required: true },
  qty: { type: Number, required: true, min: 1, max: 10 },
  priceAtAdd: { type: Number, required: true }, // used only to tell the shopper "price changed"
})

const cartSchema = new mongoose.Schema(
  { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, items: [itemSchema] },
  { timestamps: true },
)

export const Cart = mongoose.model('Cart', cartSchema)
