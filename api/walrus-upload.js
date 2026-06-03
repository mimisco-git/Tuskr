/**
 * Vercel serverless function — Walrus upload proxy
 * Bypasses CORS by proxying browser uploads to the Walrus publisher server-side
 */

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  // CORS headers so the browser can call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'PUT' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' }); return
  }

  const network = req.query.network || 'mainnet'
  const epochs  = req.query.epochs  || '5'

  const PUBLISHERS = {
    mainnet:  'https://publisher.walrus.space',
    testnet:  'https://publisher.walrus-testnet.walrus.space',
  }

  const publisherBase = PUBLISHERS[network] || PUBLISHERS.mainnet

  // Collect raw body chunks
  const chunks = []
  await new Promise((resolve, reject) => {
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', resolve)
    req.on('error', reject)
  })
  const body = Buffer.concat(chunks)

  try {
    const walrusRes = await fetch(
      `${publisherBase}/v1/blobs?epochs=${epochs}`,
      {
        method:  'PUT',
        body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/octet-stream',
        },
      }
    )

    const text = await walrusRes.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    res.status(walrusRes.status).json(data)
  } catch (err) {
    console.error('Walrus proxy error:', err)
    res.status(500).json({ error: err.message || 'Walrus upload failed' })
  }
}
