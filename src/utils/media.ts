/**
 * Media URL utilities for Tuskr NFT Marketplace
 * Handles IPFS, Arweave, and standard URLs
 * Uses multiple IPFS gateways for reliability
 */

// Multiple IPFS gateways in order of reliability
const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
]

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  const u = url.trim()

  if (u.startsWith('https://') || u.startsWith('http://')) return u

  if (u.startsWith('ipfs://')) {
    const cid = u.replace('ipfs://', '').replace(/^\/+/, '')
    return `${IPFS_GATEWAYS[0]}${cid}`
  }

  if (u.startsWith('ar://')) return `https://arweave.net/${u.slice(5)}`

  // Bare CIDs
  if (u.startsWith('Qm') || u.startsWith('bafy') || u.startsWith('bafk') || u.startsWith('bafybe')) {
    return `${IPFS_GATEWAYS[0]}${u}`
  }

  return u
}

/** Get next IPFS gateway URL to try after failure */
export function getNextGatewayUrl(currentUrl: string): string | null {
  for (let i = 0; i < IPFS_GATEWAYS.length - 1; i++) {
    if (currentUrl.includes(IPFS_GATEWAYS[i])) {
      const cid = currentUrl.replace(IPFS_GATEWAYS[i], '')
      return `${IPFS_GATEWAYS[i + 1]}${cid}`
    }
  }
  return null // No more gateways to try
}

/** Route through our Vercel image proxy as last resort */
export function proxyUrl(url: string): string {
  if (!url) return ''
  return `/api/img?url=${encodeURIComponent(url)}`
}
