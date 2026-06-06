/**
 * resolveMediaUrl — converts IPFS, Arweave and other protocol URLs
 * to browser-loadable HTTPS gateway URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''

  const u = url.trim()

  if (u.startsWith('https://') || u.startsWith('http://')) return u

  if (u.startsWith('ipfs://')) {
    const cid = u.slice(7)
    return `https://cloudflare-ipfs.com/ipfs/${cid}`
  }

  if (u.startsWith('ar://')) {
    return `https://arweave.net/${u.slice(5)}`
  }

  // Bare CID
  if (u.startsWith('Qm') || u.startsWith('bafybe') || u.startsWith('bafkre') || u.startsWith('bafy')) {
    return `https://cloudflare-ipfs.com/ipfs/${u}`
  }

  return u
}
