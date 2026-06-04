/**
 * Vercel serverless proxy for TradePort / Indexer.xyz GraphQL API
 * Keeps API credentials server-side — no CORS, no key exposure
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return }

  // Vercel exposes VITE_ vars both with and without prefix server-side
  const apiKey  = process.env.VITE_INDEXER_API_KEY
               || process.env.INDEXER_API_KEY
               || 'CVdbun0.5cda839c66e800e174ac0a5ec1dc1a2c'

  const apiUser = process.env.VITE_INDEXER_API_USER
               || process.env.INDEXER_API_USER
               || 'Tuskr'

  try {
    const response = await fetch('https://api.indexer.xyz/graphql', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    apiKey,
        'x-api-user':   apiUser,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message || 'TradePort proxy failed' })
  }
}
