import https from 'https'

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const data   = typeof body === 'string' ? body : JSON.stringify(body)
    const opts   = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      method:   'POST',
      headers:  { ...headers, 'Content-Length': Buffer.byteLength(data) },
    }
    const req = https.request(opts, res => {
      let out = ''
      res.on('data', c => { out += c })
      res.on('end',  () => resolve({ status: res.statusCode, body: out }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { res.status(400).json({ error: 'Bad JSON' }); return }
  }
  if (!body?.query) { res.status(400).json({ error: 'Missing query' }); return }

  try {
    const result = await post(
      'https://api.indexer.xyz/graphql',
      {
        'Content-Type': 'application/json',
        'x-api-key':    'CVdbun0.5cda839c66e800e174ac0a5ec1dc1a2c',
        'x-api-user':   'Tuskr',
      },
      JSON.stringify(body)
    )
    res.setHeader('Content-Type', 'application/json')
    res.status(result.status).send(result.body)
  } catch (err) {
    res.status(500).json({ error: 'Proxy failed', detail: String(err) })
  }
}
