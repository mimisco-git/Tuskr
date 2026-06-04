import https from 'https'
import http  from 'http'

function rawRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib    = parsed.protocol === 'https:' ? https : http
    const req    = lib.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method, headers },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end',  () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }))
      }
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'PUT' && req.method !== 'POST') {
    res.status(405).json({ error: 'PUT or POST only' }); return
  }

  const network = req.query.network || 'mainnet'
  const epochs  = req.query.epochs  || '5'
  const base    = network === 'testnet'
    ? 'https://publisher.walrus-testnet.walrus.space'
    : 'https://publisher.walrus.space'

  const chunks = []
  await new Promise((ok, fail) => {
    req.on('data',  c => chunks.push(c))
    req.on('end',   ok)
    req.on('error', fail)
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
    res.status(500).json({ error: 'Walrus proxy failed', detail: String(err) })
  }
}
