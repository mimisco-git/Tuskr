import { useState } from 'react'

const WALRUS_PUBLISHER_URL = 'https://publisher.walrus.space'
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus.space'

export interface WalrusUploadResult {
  blobId: string
  blobUrl: string
  mediaUrl: string
}

export function useWalrus() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadBlob = async (file: File): Promise<WalrusUploadResult | null> => {
    setUploading(true)
    setError(null)

    try {
      const epochs = 5
      const response = await fetch(
        `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}`,
        {
          method: 'PUT',
          body: file,
        }
      )

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()

      const blobId =
        result.newlyCreated?.blobObject?.blobId ||
        result.alreadyCertified?.blobId

      if (!blobId) {
        throw new Error('No blob ID returned from Walrus')
      }

      return {
        blobId,
        blobUrl: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
        mediaUrl: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const getMediaUrl = (blobId: string) =>
    `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`

  return { uploadBlob, getMediaUrl, uploading, error }
}
