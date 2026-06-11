import https from 'https'
import http  from 'http'

function rawRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib    = parsed.protocol === 'https:' ? https : http
    const req    = lib.request(
      {
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method,
        headers,
        timeout:  30000,
      },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end',  () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }))
      }
    )
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (body) req.write(body)
    req.end()
  })
}

// Multiple publishers — try each until one works
const TESTNET_PUBLISHERS = [
  'https://publisher.walrus-testnet.walrus.space',
  'https://walrus-testnet-publisher.redundex.com',
  'https://wal-publisher-testnet.staketab.org',
  'https://walrus-testnet.blockscope.net',
]

const MAINNET_PUBLISHERS = [
  'https://publisher.walrus.space',
  'https://walrus-publisher.redundex.com',
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'PUT' && req.method !== 'POST') {
    res.status(405).json({ error: 'PUT or POST only' }); return
  }

  const network    = req.query.network || 'testnet'
  const epochs     = req.query.epochs  || '5'
  const publishers = network === 'testnet' ? TESTNET_PUBLISHERS : MAINNET_PUBLISHERS

  // Read body
  const chunks = []
  await new Promise((ok, fail) => {
    req.on('data',  c => chunks.push(c))
    req.on('end',   ok)
    req.on('error', fail)
  })
  const body        = Buffer.concat(chunks)
  const contentType = req.headers['content-type'] || 'application/octet-stream'

  // Try each publisher until one succeeds
  let lastError = ''
  for (const base of publishers) {
    try {
      const url = `${base}/v1/blobs?epochs=${epochs}`
      console.log(`[walrus-upload] trying ${base}`)

      const result = await rawRequest(url, 'PUT', {
        'Content-Type':   contentType,
        'Content-Length': body.length,
      }, body)

      if (result.status === 200 || result.status === 201) {
        res.setHeader('Content-Type', 'application/json')
        res.status(200).send(result.body)
        return
      }

      // Non-success — try next publisher
      lastError = `${base} returned ${result.status}: ${result.body.toString().slice(0, 200)}`
      console.warn('[walrus-upload]', lastError)

    } catch (err) {
      lastError = `${base} error: ${String(err)}`
      console.warn('[walrus-upload]', lastError)
    }
  }

  // All publishers failed
  res.status(500).json({ error: `All Walrus publishers failed. Last: ${lastError}` })
}
