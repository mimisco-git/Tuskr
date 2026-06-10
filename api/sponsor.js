/**
 * Enoki sponsored transaction proxy
 * Uses the PRIVATE Enoki key server-side to sponsor gas for users
 * Called from the frontend when minting — user signs, we pay gas
 */
import https from 'https'

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const data   = typeof body === 'string' ? body : JSON.stringify(body)
    const req    = https.request(
      {
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers:  { ...headers, 'Content-Length': Buffer.byteLength(data) },
      },
      res => {
        let out = ''
        res.on('data', c => { out += c })
        res.on('end',  () => resolve({ status: res.statusCode, body: out }))
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return }

  const PRIVATE_KEY = process.env.ENOKI_PRIVATE_KEY || ''
  if (!PRIVATE_KEY) {
    res.status(500).json({ error: 'ENOKI_PRIVATE_KEY not configured' })
    return
  }

  const { action, ...body } = req.body || {}

  // Two actions: create and execute
  const path = action === 'execute'
    ? '/v1/transaction-blocks/sponsor/execute'
    : '/v1/transaction-blocks/sponsor'

  try {
    const result = await post(
      `https://api.enoki.mystenlabs.com${path}`,
      {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PRIVATE_KEY}`,
      },
      JSON.stringify(body)
    )
    res.setHeader('Content-Type', 'application/json')
    res.status(result.status).send(result.body)
  } catch (err) {
    res.status(500).json({ error: 'Sponsor proxy failed', detail: String(err) })
  }
}
