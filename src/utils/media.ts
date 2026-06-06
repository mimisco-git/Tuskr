/**
 * media.ts — URL normalisation for Sui/Walrus NFT images
 */

const WALRUS_AGG   = 'https://aggregator.walrus.space/v1/blobs/'
const WALRUS_TEST  = 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/'
const IPFS_GW      = 'https://nftstorage.link/ipfs/'
const ARWEAVE_GW   = 'https://arweave.net/'

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  const u = url.trim()
  if (!u || u === 'null' || u === 'undefined') return ''

  // data: URIs — render directly
  if (u.startsWith('data:')) return u

  // Walrus relative paths  →  absolute aggregator URL
  if (u.startsWith('/walrus-blob/'))  return WALRUS_AGG  + u.replace('/walrus-blob/',  '')
  if (u.startsWith('/walrus/'))       return WALRUS_AGG  + u.replace('/walrus/',        '')
  if (u.startsWith('/blob/'))         return WALRUS_AGG  + u.replace('/blob/',          '')
  if (u.startsWith('/v1/blobs/'))     return WALRUS_AGG  + u.replace('/v1/blobs/',      '')

  // IPFS
  if (u.startsWith('ipfs://')) return IPFS_GW + u.slice(7).replace(/^\/+/, '')
  if (u.startsWith('Qm') || u.startsWith('bafy') || u.startsWith('bafk') || u.startsWith('bafybe')) {
    return IPFS_GW + u
  }

  // Arweave
  if (u.startsWith('ar://')) return ARWEAVE_GW + u.slice(5)

  // Protocol-relative
  if (u.startsWith('//')) return 'https:' + u

  // Valid HTTP/HTTPS
  if (u.startsWith('http://') || u.startsWith('https://')) return u

  // ── Reject everything else ──────────────────────────────────
  // Move type identifiers:  0x123::module::Type
  if (u.includes('::')) return ''
  // Sui object IDs with version:  0xabc:1
  if (u.includes(':') && /^0x/.test(u)) return ''
  // Bare hex address
  if (/^0x[0-9a-fA-F]+$/.test(u)) return ''
  // Other relative paths
  if (u.startsWith('/')) return ''

  // Unknown — reject
  return ''
}

export function proxyUrl(resolved: string): string {
  if (!resolved) return ''
  return `/api/img?url=${encodeURIComponent(resolved)}`
}

/** Route any image through TradePort's public CDN — handles hotlink + CORS */
export function tradeportImg(url: string): string {
  if (!url) return ''
  return `https://img.tradeport.gg?url=${encodeURIComponent(url)}&mime-type=image`
}
