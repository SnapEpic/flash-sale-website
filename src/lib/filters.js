export const DEFAULT_FILTERS = { categories: [], maxPrice: 600, minDiscount: 0, minRating: 0, availability: 'all' }

export const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'newest', label: 'Newest' },
]

export function applyFilters(products, f) {
  return products.filter((p) =>
    (!f.categories.length || f.categories.includes(p.category)) &&
    p.price <= f.maxPrice &&
    p.discount >= f.minDiscount &&
    p.rating >= f.minRating &&
    (f.availability === 'all' || (f.availability === 'low' ? p.stock <= 12 : p.stock > 12)),
  )
}

export function sortProducts(products, sort) {
  const list = [...products]
  switch (sort) {
    case 'price-asc': return list.sort((a, b) => a.price - b.price)
    case 'price-desc': return list.sort((a, b) => b.price - a.price)
    case 'discount': return list.sort((a, b) => b.discount - a.discount)
    case 'newest': return list.sort((a, b) => a.daysOld - b.daysOld)
    default: return list.sort((a, b) => b.sold - a.sold)
  }
}

export const isFiltered = (f) =>
  f.categories.length > 0 || f.maxPrice < DEFAULT_FILTERS.maxPrice || f.minDiscount > 0 || f.minRating > 0 || f.availability !== 'all'
