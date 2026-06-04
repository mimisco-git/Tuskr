// CommonJS syntax — safest for Vercel Node.js functions

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return }

  const apiKey  = 'CVdbun0.5cda839c66e800e174ac0a5ec1dc1a2c'
  const apiUser = 'Tuskr'

  // Parse body — handle both already-parsed object and raw string
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) }
    catch { res.status(400).json({ error: 'Bad JSON body' }); return }
  }
  if (!body || !body.query) {
    res.status(400).json({ error: 'Missing query in body' }); return
  }

  try {
    const response = await fetch('https://api.indexer.xyz/graphql', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    apiKey,
        'x-api-user':   apiUser,
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    
    // Always return status + body so frontend can debug
    res.setHeader('Content-Type', 'application/json')
    res.status(response.status).send(text)
  } catch (err) {
    res.status(500).json({
      error: 'Proxy fetch failed',
      detail: err.message,
    })
  }
}
