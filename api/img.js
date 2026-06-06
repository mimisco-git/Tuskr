/**
 * Image proxy — fetches NFT images server-side to bypass
 * hotlink protection, CORS restrictions, and rate limiting.
 * Usage: /api/img?url=<encoded_image_url>
 */
import https from 'https'
import http  from 'http'

export default async function handler(req, res) {
  const { url } = req.query
  if (!url) { res.status(400).send('Missing url param'); return }

  let target
  try { target = decodeURIComponent(url) }
  catch { res.status(400).send('Bad url param'); return }

  // Only allow http/https
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    res.status(400).send('Only http/https allowed'); return
  }

  // Resolve IPFS and Arweave
  if (target.startsWith('ipfs://')) target = `https://cloudflare-ipfs.com/ipfs/${target.slice(7)}`
  if (target.startsWith('ar://'))   target = `https://arweave.net/${target.slice(5)}`

  const lib = target.startsWith('https://') ? https : http

  try {
    await new Promise((resolve, reject) => {
      const request = lib.get(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Tuskr/1.0)',
          'Referer':    'https://www.tradeport.xyz/',
          'Accept':     'image/*,*/*',
        }
      }, (imgRes) => {
        // Follow redirects
        if (imgRes.statusCode === 301 || imgRes.statusCode === 302) {
          const redirectUrl = imgRes.headers.location
          if (redirectUrl) {
            res.redirect(imgRes.statusCode, `/api/img?url=${encodeURIComponent(redirectUrl)}`)
          } else {
            res.status(502).send('Bad redirect'); 
          }
          resolve(null)
          return
        }

        if (imgRes.statusCode !== 200) {
          res.status(imgRes.statusCode || 502).send('Image fetch failed')
          resolve(null)
          return
        }

        const contentType = imgRes.headers['content-type'] || 'image/jpeg'
        res.setHeader('Content-Type', contentType)
        res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24h
        res.setHeader('Access-Control-Allow-Origin', '*')
        imgRes.pipe(res)
        imgRes.on('end', resolve)
        imgRes.on('error', reject)
      })
      request.on('error', reject)
      request.setTimeout(10000, () => { request.destroy(); reject(new Error('timeout')) })
    })
  } catch (err) {
    if (!res.headersSent) res.status(502).send(`Proxy error: ${err.message}`)
  }
}
