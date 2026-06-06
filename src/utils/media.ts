/**
 * resolveMediaUrl — converts protocol URLs to HTTPS gateway URLs.
 * proxyUrl — wraps any image URL through our own Vercel proxy
 * to bypass hotlink protection and rate limiting.
 */

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  const u = url.trim()
  if (u.startsWith('https://') || u.startsWith('http://')) return u
  if (u.startsWith('ipfs://')) return `https://cloudflare-ipfs.com/ipfs/${u.slice(7)}`
  if (u.startsWith('ar://'))   return `https://arweave.net/${u.slice(5)}`
  if (u.startsWith('Qm') || u.startsWith('bafy') || u.startsWith('bafk')) {
    return `https://cloudflare-ipfs.com/ipfs/${u}`
  }
  return u
}

/** Wraps URL through our Vercel image proxy — use as onError fallback */
export function proxyUrl(url: string): string {
  if (!url) return ''
  return `/api/img?url=${encodeURIComponent(url)}`
}
