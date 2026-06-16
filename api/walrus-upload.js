import https from 'https'
import http  from 'http'

function rawRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib    = parsed.protocol === 'https:' ? https : http
    const req    = lib.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method, headers, timeout: 20000 },
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

const PUBLISHERS = [
  'https://publisher.walrus-testnet.walrus.space',
  'https://walrus-testnet-publisher.redundex.com',
  'https://wal-publisher-testnet.staketab.org',
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const network  = req.query.network  || 'testnet'
  const epochs   = req.query.epochs   || '5'
  const sendTo   = req.query.send_to  || ''   // user wallet address

  // Read body
  const chunks = []
  await new Promise((ok, fail) => {
    req.on('data',  c => chunks.push(c))
    req.on('end',   ok)
    req.on('error', fail)
  })
  const body        = Buffer.concat(chunks)
  const contentType = req.headers['content-type'] || 'application/octet-stream'

  const publishers = network === 'testnet' ? PUBLISHERS : ['https://publisher.walrus.space']

  let lastError = ''
  for (const base of publishers) {
    try {
      // Build query params
      let query = `epochs=${epochs}&permanent=true`
      if (sendTo) query += `&send_object_to=${sendTo}`

      const url = `${base}/v1/blobs?${query}`
      console.log(`[walrus] trying ${base}`)

      const r = await rawRequest(url, 'PUT', {
        'Content-Type':   contentType,
        'Content-Length': body.length,
      }, body)

      const text = r.body.toString()
      console.log(`[walrus] ${base} → ${r.status}: ${text.slice(0, 100)}`)

      if (r.status === 200 || r.status === 201) {
        res.setHeader('Content-Type', 'application/json')
        res.status(200).send(r.body)
        return
      }

      lastError = `${base} → ${r.status}: ${text.slice(0, 300)}`
    } catch (e) {
      lastError = `${base} → ${String(e)}`
      console.warn('[walrus]', lastError)
    }
  }

  res.status(500).json({ error: `Upload failed: ${lastError}` })
}
