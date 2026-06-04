// Uses Node.js built-in https — works on ALL Node versions, no fetch needed

const https = require('https')

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed   = new URL(url)
    const postData = typeof body === 'string' ? body : JSON.stringify(body)

    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  {
        ...headers,
        'Content-Length': Buffer.byteLength(postData),
      },
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { res.status(400).json({ error: 'Bad JSON' }); return }
  }
  if (!body || !body.query) {
    res.status(400).json({ error: 'Missing query' }); return
  }

  try {
    const result = await httpsPost(
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
    res.status(500).json({ error: 'Proxy failed', detail: err.message })
  }
}
