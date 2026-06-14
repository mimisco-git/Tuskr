/**
 * DeepBook Price API
 * Fetches live SUI/USDC price from DeepBook V3 — Sui's native on-chain order book
 * Primary:  DeepBook Indexer (Mysten Labs public endpoint)
 * Fallback: CoinGecko public API
 */
import https from 'https'

// DeepBook V3 Mainnet — SUI/USDC pool
// Source: https://docs.sui.io/standards/deepbookv3/contract-information
const DEEPBOOK_INDEXER = 'deepbook-indexer.mainnet.mystenlabs.com'
const SUI_USDC_POOL    = '0x4e2ca3988246e1d50b9bf209abb9c1cbfec65bd95afdacc620a36c67bdb8452f'

// Simple in-memory cache (30 second TTL for Vercel serverless)
let cache = { price: null, ts: 0 }
const TTL = 30_000

function httpsGet(host, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path, method: 'GET', headers: { 'Accept': 'application/json' }, timeout: 8000 },
      res => {
        let out = ''
        res.on('data', c => out += c)
        res.on('end', () => { try { resolve(JSON.parse(out)) } catch(e) { reject(e) } })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

async function getPriceFromDeepBook() {
  // DeepBook Indexer — get best bid/ask for SUI/USDC pool
  const data = await httpsGet(
    DEEPBOOK_INDEXER,
    `/get_level2_ticks_from_mid?pool_id=${SUI_USDC_POOL}&ticks=1`
  )
  // Returns { bids: [[price, qty]], asks: [[price, qty]] }
  // Price is in USDC per SUI (6 decimals tick)
  const bids = data.bids?.[0]
  const asks = data.asks?.[0]
  if (bids && asks) {
    const mid = (Number(bids[0]) + Number(asks[0])) / 2
    return Math.round(mid * 1000) / 1000  // 3 decimal places
  }
  throw new Error('No DeepBook price data')
}

async function getPriceFromCoinGecko() {
  const data = await httpsGet(
    'api.coingecko.com',
    '/api/v3/simple/price?ids=sui&vs_currencies=usd'
  )
  const price = data?.sui?.usd
  if (!price) throw new Error('No CoinGecko price')
  return price
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=30')

  // Serve from cache if fresh
  if (cache.price && (Date.now() - cache.ts < TTL)) {
    return res.json({ price: cache.price, source: cache.source, cached: true })
  }

  let price, source

  // 1. Try DeepBook first
  try {
    price  = await getPriceFromDeepBook()
    source = 'DeepBook'
  } catch(e) {
    console.warn('[DeepBook] price fetch failed, falling back to CoinGecko:', e.message)
    // 2. Fall back to CoinGecko
    try {
      price  = await getPriceFromCoinGecko()
      source = 'CoinGecko'
    } catch(e2) {
      return res.status(503).json({ error: 'Price unavailable', price: null })
    }
  }

  cache = { price, source, ts: Date.now() }
  return res.json({ price, source, cached: false })
}
