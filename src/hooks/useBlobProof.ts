/**
 * useBlobProof.ts
 * Verify that an NFT's media blob still exists and is certified on Walrus.
 */
import { useState, useEffect } from 'react'

const WALRUS_AGG = 'https://aggregator.walrus-testnet.walrus.space'

export type BlobStatus = 'checking' | 'verified' | 'unavailable' | 'unknown'

export interface BlobProof {
  status:       BlobStatus
  blobId:       string
  size?:        number
  contentType?: string
  epochs?:      number
  checkedAt:    Date
}

export function useBlobProof(blobId: string | undefined) {
  const [proof, setProof] = useState<BlobProof | null>(null)

  useEffect(() => {
    if (!blobId) return
    setProof({ status: 'checking', blobId, checkedAt: new Date() })

    const check = async () => {
      try {
        // HEAD request to aggregator to check blob existence
        const resp = await fetch(`${WALRUS_AGG}/v1/blobs/${blobId}`, { method: 'HEAD' })

        if (resp.ok) {
          setProof({
            status:      'verified',
            blobId,
            size:        parseInt(resp.headers.get('content-length') ?? '0'),
            contentType: resp.headers.get('content-type') ?? undefined,
            checkedAt:   new Date(),
          })
        } else {
          setProof({ status: 'unavailable', blobId, checkedAt: new Date() })
        }
      } catch {
        setProof({ status: 'unknown', blobId, checkedAt: new Date() })
      }
    }

    check()
  }, [blobId])

  return proof
}
