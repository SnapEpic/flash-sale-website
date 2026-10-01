import mongoose from 'mongoose'

export const ORDER_STATUS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
export const PAYMENT_STATUS = ['PENDING', 'PAID', 'FAILED', 'REFUNDED']

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot: an order must keep showing what the customer bought even if the product changes later.
    name: String,
    brand: String,
    image: String,
    color: String,
    size: String,
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
  },
  { _id: false },
)

const addressSchema = new mongoose.Schema(
  {
    fullName: String, phone: String, line1: String, line2: String,
    city: String, state: String, postalCode: String, country: { type: String, default: 'India' },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [itemSchema], required: true },
    shippingAddress: addressSchema,
    subtotal: { type: Number, required: true }, // sum of sale prices
    discount: { type: Number, required: true }, // savings vs original prices
    shipping: { type: Number, required: true },
    total: { type: Number, required: true }, // subtotal + shipping (USD, as shown in the UI)
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'PENDING' },
    orderStatus: { type: String, enum: ORDER_STATUS, default: 'PENDING' },
    paymentId: { type: String, index: true, sparse: true }, // Razorpay payment id
    razorpayOrderId: { type: String, index: true, sparse: true },
    amountPaise: Number, // what Razorpay actually charges (INR paise)
    currency: { type: String, default: 'INR' },
    reservationId: { type: String, unique: true, sparse: true }, // Redis reservation that holds the stock
    source: { type: String, enum: ['cart', 'buyNow'], default: 'cart' },
    failureReason: String,
    paidAt: Date,
  },
  { timestamps: true },
)

orderSchema.index({ user: 1, createdAt: -1 })

export const Order = mongoose.model('Order', orderSchema)
