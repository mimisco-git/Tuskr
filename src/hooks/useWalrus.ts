/**
 * useWalrus — uploads blobs via our Vercel proxy which handles CORS.
 * The proxy calls the Walrus publisher server-side, so no CORS error.
 */
import { useState } from 'react'

export interface WalrusUploadResult {
  blobId:   string
  blobUrl:  string
  mediaUrl: string
}

const AGGREGATOR: Record<string, string> = {
  mainnet: 'https://aggregator.walrus.space',
  testnet: 'https://aggregator.walrus-testnet.walrus.space',
}

function getNetwork(): string {
  try {
    const saved = localStorage.getItem('tuskr_network')
    if (saved === 'testnet' || saved === 'mainnet') return saved
  } catch {}
  return import.meta.env.VITE_NETWORK === 'testnet' ? 'testnet' : 'mainnet'
}

export function useWalrus() {
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const uploadBlob = async (file: File, walletAddress?: string): Promise<WalrusUploadResult | null> => {
    setUploading(true)
    setError(null)

    const network = getNetwork()
    const agg     = AGGREGATOR[network] ?? AGGREGATOR.mainnet

    try {
      // Build upload URL — send_to transfers the blob object to the user's wallet
      const sendTo = walletAddress ? `&send_to=${walletAddress}` : ''
      const uploadUrl = `/api/walrus-upload?network=${network}&epochs=5${sendTo}`

      // Call our Vercel proxy — avoids CORS entirely
      const response = await fetch(
        uploadUrl,
        {
          method:  'PUT',
          body:    file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        }
      )

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        throw new Error(`Upload failed (${response.status}): ${errBody.slice(0, 120)}`)
      }

      const result = await response.json()

      const blobId =
        result.newlyCreated?.blobObject?.blobId ||
        result.alreadyCertified?.blobId

      if (!blobId) {
        throw new Error(`No blob ID returned. Response: ${JSON.stringify(result).slice(0, 120)}`)
      }

      const mediaUrl = `${agg}/v1/blobs/${blobId}`
      return { blobId, blobUrl: mediaUrl, mediaUrl }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Walrus upload failed'
      setError(msg)
      console.error('[useWalrus] upload error:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  const getMediaUrl = (blobId: string) => {
    const network = getNetwork()
    const agg = AGGREGATOR[network] ?? AGGREGATOR.mainnet
    return `${agg}/v1/blobs/${blobId}`
  }

  return { uploadBlob, getMediaUrl, uploading, error }
}
