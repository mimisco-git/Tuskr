/**
 * AI image generation proxy — fetches from Pollinations.ai server-side.
 * Eliminates browser CORS issues when the agent generates NFT images.
 *
 * GET /api/generate-image?prompt=...&model=turbo&seed=12345&width=512&height=512
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  const { prompt, model = 'turbo', seed = '1', width = '512', height = '512' } = req.query

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' })
  }

  const encoded = encodeURIComponent(`${prompt}, NFT digital art, vibrant, ultra detailed, 4k`)
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${model}`

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Tuskr-NFT/1.0' },
      signal: AbortSignal.timeout(90_000),
    })

    if (!r.ok) {
      return res.status(502).json({ error: `Pollinations returned ${r.status}` })
    }

    const ct = r.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      return res.status(502).json({ error: `Unexpected content-type: ${ct}` })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length < 5000) {
      return res.status(502).json({ error: 'Response too small — likely an error page' })
    }

    res.setHeader('Content-Type', ct)
    res.setHeader('Content-Length', buf.length)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(buf)
  } catch (err) {
    const msg = err?.name === 'TimeoutError' ? 'Pollinations timed out' : String(err)
    res.status(502).json({ error: msg })
  }
}
