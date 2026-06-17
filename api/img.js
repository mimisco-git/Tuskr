/**
 * Image proxy — ALL NFT images route through here.
 * This solves: 403, CORS, hotlink protection, ERR_NAME_NOT_RESOLVED
 */
import https from 'https'
import http  from 'http'

const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/'

function normalizeUrl(raw) {
  if (!raw || raw === 'null' || raw === 'undefined') return null

  let url = raw.trim()

  // Reject Move type identifiers (0x..::module::Type)
  if (url.includes('::') && !url.startsWith('http')) return null
  // Reject relative paths
  if (url.startsWith('/') && !url.startsWith('//')) return null
  // Reject bare hex addresses
  if (/^0x[0-9a-fA-F]+$/.test(url)) return null

  // data URLs — return as-is (no proxy needed)
  if (url.startsWith('data:')) return url

  // IPFS
  if (url.startsWith('ipfs://')) return IPFS_GATEWAY + url.replace('ipfs://', '').replace(/^\/+/, '')

  // Arweave
  if (url.startsWith('ar://')) return 'https://arweave.net/' + url.slice(5)

  // Bare CID
  if (/^(Qm|bafy|bafk|bafybe)/.test(url)) return IPFS_GATEWAY + url

  // Must be http/https at this point
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) return null

  if (url.startsWith('//')) url = 'https:' + url

  return url
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https://') ? https : http
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://www.tradeport.xyz/',
        'Accept':     'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 12000,
    }, res => {
      // Follow redirects (up to 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location
        if (loc) {
          const next = loc.startsWith('http') ? loc : new URL(loc, url).href
          return resolve({ redirect: next })
        }
      }
      const chunks = []
      res.on('data',  c => chunks.push(c))
      res.on('end',   () => resolve({
        status:      res.statusCode,
        contentType: res.headers['content-type'] || 'image/jpeg',
        body:        Buffer.concat(chunks),
      }))
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const rawUrl = req.query.url
  const target = normalizeUrl(rawUrl)

  if (!target) {
    res.status(400).json({ error: 'Invalid or unsupported URL', url: rawUrl })
    return
  }

  // data: URLs — just redirect browser directly (no proxy needed)
  if (target.startsWith('data:')) {
    res.setHeader('Location', target)
    res.status(302).end()
    return
  }

  let url = target
  let redirects = 0

  while (redirects < 4) {
    try {
      const result = await fetchImage(url)

      if (result.redirect) {
        url = result.redirect
        redirects++
        continue
      }

      if (result.status === 200) {
        // Detect real content type from magic bytes — Walrus sometimes sends wrong type
        let ct = result.contentType || ''
        const buf = result.body
        if (buf && buf.length >= 4) {
          if (buf[0]===0x89 && buf[1]===0x50 && buf[2]===0x4E && buf[3]===0x47) ct = 'image/png'
          else if (buf[0]===0xFF && buf[1]===0xD8) ct = 'image/jpeg'
          else if (buf[0]===0x47 && buf[1]===0x49 && buf[2]===0x46) ct = 'image/gif'
          else if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46) ct = 'image/webp'
          else if (!ct.startsWith('image/')) ct = 'image/jpeg'
        }
        res.setHeader('Content-Type',        ct)
        res.setHeader('Content-Disposition', 'inline')
        res.setHeader('Cache-Control',       'public, max-age=86400, stale-while-revalidate=3600')
        res.status(200).send(result.body)
        return
      }

      // Non-200 from image server
      res.status(result.status || 502).json({
        error: `Image server returned ${result.status}`,
        url,
      })
      return

    } catch (err) {
      res.status(502).json({ error: 'Fetch failed', detail: String(err), url })
      return
    }
  }

  res.status(502).json({ error: 'Too many redirects', url })
}
