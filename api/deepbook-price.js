/**
 * DeepBook Price API — SUI/USDC live price
 * Primary:  DeepBook V3 mainnet indexer (Mysten Labs)
 * Fallback: CoinGecko public API
 *
 * Uses native fetch (Node 18+) — more reliable in Vercel than https module.
 */

// DeepBook V3 mainnet SUI/USDC pool
const POOL_ID = '0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407'

let cache = { price: null, source: null, ts: 0 }
const TTL  = 30_000

async function fromDeepBook() {
  // Try the DeepBook indexer summary endpoint first — most reliable
  const endpoints = [
    `https://deepbook-indexer.mainnet.mystenlabs.com/get_level2_ticks_from_mid?pool_id=${POOL_ID}&ticks=1`,
    `https://deepbook-indexer.mainnet.mystenlabs.com/get_pools`,
  ]

  // Endpoint 1: level2 ticks
  try {
    const res  = await fetch(endpoints[0], { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const d = await res.json()
      const bid = Array.isArray(d.bids) ? Number(d.bids[0]?.[0]) : 0
      const ask = Array.isArray(d.asks) ? Number(d.asks[0]?.[0]) : 0
      if (bid > 0 && ask > 0) return parseFloat(((bid + ask) / 2).toFixed(4))
    }
  } catch { /* try next */ }

  // Endpoint 2: pool list — find SUI/USDC
  try {
    const res = await fetch(endpoints[1], { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const pools = await res.json()
      const pool  = Array.isArray(pools)
        ? pools.find(p => p.pool_id === POOL_ID ||
            (p.base_type?.includes('SUI') && p.quote_type?.includes('usdc')))
        : null
      const mid = Number(pool?.mid_price ?? pool?.best_bid ?? 0)
      if (mid > 0) return parseFloat(mid.toFixed(4))
    }
  } catch { /* fall through */ }

  throw new Error('DeepBook unavailable')
}

async function fromCoinGecko() {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd',
    { signal: AbortSignal.timeout(6000) }
  )
  if (!res.ok) throw new Error('CoinGecko error')
  const d = await res.json()
  const p = d?.sui?.usd
  if (!p) throw new Error('No CoinGecko price')
  return parseFloat(Number(p).toFixed(4))
}

async function fromBinance() {
  const res = await fetch(
    'https://api.binance.com/api/v3/ticker/price?symbol=SUIUSDT',
    { signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error('Binance error')
  const d = await res.json()
  const p = Number(d.price)
  if (!p) throw new Error('No Binance price')
  return parseFloat(p.toFixed(4))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')

  // Serve from cache if fresh
  if (cache.price && (Date.now() - cache.ts < TTL)) {
    return res.json({ price: cache.price, source: cache.source, cached: true })
  }

  // Try each source in order
  const sources = [
    { fn: fromDeepBook,  label: 'DeepBook'  },
    { fn: fromCoinGecko, label: 'CoinGecko' },
    { fn: fromBinance,   label: 'Binance'   },
  ]

  for (const { fn, label } of sources) {
    try {
      const price = await fn()
      if (price > 0) {
        cache = { price, source: label, ts: Date.now() }
        return res.json({ price, source: label, cached: false })
      }
    } catch { /* try next source */ }
  }

  // All failed — return last cached value or error
  if (cache.price) {
    return res.json({ price: cache.price, source: cache.source + ' (stale)', cached: true })
  }
  return res.status(503).json({ error: 'Price unavailable', price: null })
}
