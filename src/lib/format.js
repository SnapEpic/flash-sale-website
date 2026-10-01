export const money = (n) => `$${Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2)}`
export const pad = (n) => String(n).padStart(2, '0')
