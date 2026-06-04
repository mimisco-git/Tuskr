// Uses Node.js built-in https — no fetch dependency

const https = require('https')
const http  = require('http')

function rawRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed   = new URL(url)
    const lib      = parsed.protocol === 'https:' ? https : http
    const options  = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers,
    }

    const req = lib.request(options, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }))
    })

    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'PUT' && req.method !== 'POST') {
    res.status(405).json({ error: 'PUT or POST only' }); return
  }

  const network = req.query.network || 'mainnet'
  const epochs  = req.query.epochs  || '5'

  const PUBLISHERS = {
    mainnet: 'https://publisher.walrus.space',
    testnet: 'https://publisher.walrus-testnet.walrus.space',
  }
  const base = PUBLISHERS[network] || PUBLISHERS.mainnet

  // Collect raw body
  const chunks = []
  await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(c))
    req.on('end', resolve)
    req.on('error', reject)
  })
  const body = Buffer.concat(chunks)

  try {
    const result = await rawRequest(
      `${base}/v1/blobs?epochs=${epochs}`,
      'PUT',
      {
        'Content-Type':   req.headers['content-type'] || 'application/octet-stream',
        'Content-Length': body.length,
      },
      body
    )

    res.setHeader('Content-Type', 'application/json')
    res.status(result.status).send(result.body)
  } catch (err) {
    res.status(500).json({ error: 'Walrus proxy failed', detail: err.message })
  }
}
