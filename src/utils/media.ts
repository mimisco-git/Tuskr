/**
 * media.ts — URL resolution for NFT images
 *
 * TradePort returns many non-image "URLs":
 *  - Move type identifiers:  0xabc::module::Type
 *  - Relative paths:         /walrus-blob/...
 *  - The string "null"
 *  - Empty strings
 *
 * We filter all of those out and only pass true HTTP/IPFS/Arweave URLs.
 */

const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
]

/** Returns a browser-loadable URL, or '' if the input is unusable */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''

  const u = url.trim()

  // Reject non-URL values
  if (!u) return ''
  if (u === 'null' || u === 'undefined') return ''
  if (u.startsWith('data:')) return u                    // data URI — valid
  if (u.includes('::') && !u.startsWith('http')) return '' // Move type ID
  if (u.startsWith('/') && !u.startsWith('//')) return '' // relative path
  if (u.startsWith('0x') && !u.startsWith('https://') && !u.startsWith('http://')) return '' // hex address

  if (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('//')) return u

  if (u.startsWith('ipfs://')) {
    const cid = u.replace('ipfs://', '').replace(/^\/+/, '')
    return `${IPFS_GATEWAYS[0]}${cid}`
  }

  if (u.startsWith('ar://')) return `https://arweave.net/${u.slice(5)}`

  // Bare CID
  if (u.startsWith('Qm') || u.startsWith('bafy') || u.startsWith('bafk')) {
    return `${IPFS_GATEWAYS[0]}${u}`
  }

  return '' // unknown format — reject
}

/** Get next IPFS gateway after current one fails */
export function getNextGatewayUrl(currentUrl: string): string | null {
  for (let i = 0; i < IPFS_GATEWAYS.length - 1; i++) {
    if (currentUrl.startsWith(IPFS_GATEWAYS[i])) {
      const cid = currentUrl.slice(IPFS_GATEWAYS[i].length)
      return `${IPFS_GATEWAYS[i + 1]}${cid}`
    }
  }
  return null
}

/** Proxy through our Vercel image server as last resort */
export function proxyUrl(url: string | null | undefined): string {
  if (!url) return ''
  return `/api/img?url=${encodeURIComponent(url)}`
}
