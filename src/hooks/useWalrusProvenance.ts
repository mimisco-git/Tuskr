/**
 * useWalrusProvenance
 *
 * Walrus-backed NFT ownership history.
 * After every buy or sell, the dApp appends an entry to a Walrus provenance blob.
 * The blob ID is stored in localStorage keyed by NFT object ID.
 * On load, fetch and display the provenance trail.
 *
 * This makes Tuskr NFTs have a permanent, verifiable ownership history on Walrus —
 * something IPFS-based NFT markets cannot provide.
 */
import { useState, useCallback } from 'react'

const PUBLISHER  = 'https://publisher.walrus-testnet.walrus.space'
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
const KEY = (nftId: string) => `tuskr_prov_${nftId}`

export interface ProvenanceEntry {
  event:    'mint' | 'sale' | 'list' | 'delist' | 'transfer'
  from:     string
  to:       string
  price?:   string
  txDigest: string
  ts:       string
}

async function fetchBlob(blobId: string): Promise<ProvenanceEntry[] | null> {
  try {
    const r = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function pushBlob(data: ProvenanceEntry[]): Promise<string | null> {
  const publishers = [PUBLISHER, 'https://walrus-testnet-publisher.bartestnet.com']
  for (const pub of publishers) {
    try {
      const r = await fetch(`${pub}/v1/blobs?epochs=5`, {
        method: 'PUT',
        body: new Blob([JSON.stringify(data)], { type: 'application/json' }),
        signal: AbortSignal.timeout(20000),
      })
      if (!r.ok) continue
      const d = await r.json()
      return d.newlyCreated?.blobObject?.blobId || d.alreadyCertified?.blobId || null
    } catch { continue }
  }
  return null
}

export function useWalrusProvenance(nftId: string | undefined) {
  const [trail,   setTrail]   = useState<ProvenanceEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [blobId,  setBlobId]  = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!nftId) return
    const stored = localStorage.getItem(KEY(nftId))
    if (!stored) return
    setBlobId(stored)
    setLoading(true)
    const data = await fetchBlob(stored)
    if (data) setTrail(data)
    setLoading(false)
  }, [nftId])

  const append = useCallback(async (entry: ProvenanceEntry) => {
    if (!nftId) return
    const existing = blobId ? (await fetchBlob(blobId) ?? []) : []
    const updated  = [...existing, entry]
    const newId    = await pushBlob(updated)
    if (newId) {
      localStorage.setItem(KEY(nftId), newId)
      setBlobId(newId)
      setTrail(updated)
    }
  }, [nftId, blobId])

  return { trail, loading, blobId, load, append }
}
