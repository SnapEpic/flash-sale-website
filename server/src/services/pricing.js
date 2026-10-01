import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { env } from '../config/env.js'
import { getLiveStock } from './stock.js'
import { isSaleLive } from './saleClock.js'
import { badRequest, conflict } from '../utils/AppError.js'

export const MAX_QTY = 10

/**
 * The server decides prices. The browser only says WHAT it wants (product, colour, size, qty);
 * names, prices and availability are always looked up here, never trusted from the request.
 * items: [{ productId, color, size, qty }]  ->  priced lines (throws on anything invalid)
 */
export async function priceLines(items) {
  if (!Array.isArray(items) || !items.length) throw badRequest('Your bag is empty.', 'EMPTY_CART')
  const ids = [...new Set(items.map((i) => String(i.productId)))]
  if (ids.some((id) => !mongoose.isValidObjectId(id))) throw badRequest('One of the products is invalid.', 'INVALID_PRODUCT')

  const products = await Product.find({ _id: { $in: ids } }).lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const live = await getLiveStock(products)
  const saleLive = await isSaleLive()

  return items.map((i) => {
    const p = byId.get(String(i.productId))
    if (!p) throw badRequest('One of the products in your bag is no longer available.', 'PRODUCT_UNAVAILABLE')
    if (!Number.isInteger(i.qty) || i.qty < 1 || i.qty > MAX_QTY) throw badRequest(`Quantity must be between 1 and ${MAX_QTY}.`, 'INVALID_QTY')
    if (!p.colors.some((c) => c.name === i.color)) throw badRequest(`"${i.color}" is not an option for ${p.name}.`, 'INVALID_OPTION')
    if (!p.sizes.includes(i.size)) throw badRequest(`"${i.size}" is not an option for ${p.name}.`, 'INVALID_OPTION')
    if (p.isFlashSale && !saleLive) throw conflict('The flash sale has ended.', 'SALE_ENDED')
    const available = live.get(String(p._id)) ?? 0
    if (available < 1) throw conflict(`"${p.name}" is sold out.`, 'OUT_OF_STOCK')
    if (available < i.qty) throw conflict(`Only ${available} of "${p.name}" left.`, 'OUT_OF_STOCK')
    return {
      productId: String(p._id), name: p.name, brand: p.brand, image: p.images[0] || '',
      color: i.color, size: i.size, qty: i.qty, price: p.price, originalPrice: p.originalPrice,
    }
  })
}

const round2 = (n) => Math.round(n * 100) / 100

export function totalsOf(lines) {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0))
  const original = round2(lines.reduce((s, l) => s + l.originalPrice * l.qty, 0))
  const shipping = subtotal === 0 || subtotal >= env.freeShippingAt ? 0 : env.shippingFee
  return { subtotal, discount: round2(original - subtotal), shipping, total: round2(subtotal + shipping) }
}

// Razorpay wants the smallest currency unit (paise) as an integer.
export const toPaise = (usdTotal) => Math.round(usdTotal * env.usdToInr * 100)
