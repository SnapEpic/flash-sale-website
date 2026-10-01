import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Order } from '../models/Order.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest, notFound } from '../utils/AppError.js'
import { createPendingOrder, publicOrder } from '../services/orderService.js'

const router = Router()
router.use(protect)

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient name.').max(80),
  phone: z.string().trim().regex(/^[+]?[\d\s-]{10,15}$/, 'Enter a valid phone number.'),
  line1: z.string().trim().min(3, 'Enter the street address.').max(120),
  line2: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().min(2, 'Enter the city.').max(60),
  state: z.string().trim().min(2, 'Enter the state.').max(60),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{4,10}$/, 'Enter a valid postal code.'),
  country: z.string().trim().min(2).max(60).default('India'),
})
const createSchema = z.object({ reservationId: z.string().uuid('Invalid reservation.'), shippingAddress: addressSchema })

// POST /api/orders  -> PENDING order tied to the Redis reservation. Payment comes next (/api/payment/*).
router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const order = await createPendingOrder({ user: req.user, reservationId: req.body.reservationId, shippingAddress: req.body.shippingAddress })
  res.status(201).json({ order: publicOrder(order) })
}))

// Only orders the customer actually completed or attempted to pay for; abandoned carts stay out of the list.
router.get('/', asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id, paymentStatus: { $in: ['PAID', 'REFUNDED'] } }).sort({ createdAt: -1 }).limit(50)
  res.json({ orders: orders.map(publicOrder) })
}))

/* ---- admin (declared before /:id so "admin" is not treated as an id) ---- */
router.get('/admin/all', adminOnly, asyncHandler(async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200).populate('user', 'name email')
  res.json({ orders: orders.map((o) => ({ ...publicOrder(o), customer: o.user ? { name: o.user.name, email: o.user.email } : null })) })
}))

const FLOW = { CONFIRMED: ['PROCESSING'], PROCESSING: ['SHIPPED'], SHIPPED: ['DELIVERED'] }
router.patch('/:id/status', adminOnly, validate(z.object({ status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED']) })), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found.')
  const order = await Order.findById(req.params.id)
  if (!order) throw notFound('Order not found.')
  if (order.paymentStatus !== 'PAID') throw badRequest('Only paid orders can move forward.', 'NOT_PAID')
  if (!FLOW[order.orderStatus]?.includes(req.body.status)) throw badRequest(`Cannot move an order from ${order.orderStatus} to ${req.body.status}.`, 'BAD_TRANSITION')
  order.orderStatus = req.body.status
  await order.save()
  res.json({ order: publicOrder(order) })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found.')
  const order = await Order.findById(req.params.id)
  if (!order || (String(order.user) !== String(req.user._id) && req.user.role !== 'ADMIN')) throw notFound('Order not found.')
  res.json({ order: publicOrder(order) })
}))

export default router
