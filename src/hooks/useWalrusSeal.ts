/**
 * useWalrusSeal.ts
 * Walrus Seal — threshold encryption for NFT content gating.
 * Docs: https://docs.walrus.site/seal/
 *
 * Flow:
 * 1. Creator encrypts file with Seal before uploading to Walrus
 * 2. The encryption policy is: "only holder of NFT object ID can decrypt"
 * 3. Buyer acquires NFT → can call Seal to decrypt the blob
 */
import { useState } from 'react'

const SEAL_SERVER = 'https://seal.walrus-testnet.walrus.space'
const WALRUS_PUB  = 'https://publisher.walrus-testnet.walrus.space'
const WALRUS_AGG  = 'https://aggregator.walrus-testnet.walrus.space'

export interface SealUploadResult {
  blobId:        string
  encryptedUrl:  string
  policyId:      string
}

export function useWalrusSeal() {
  const [encrypting, setEncrypting] = useState(false)
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  /**
   * Encrypt file via Seal and upload encrypted blob to Walrus.
   * nftObjectId: the on-chain NFT object that will gate decryption.
   */
  const encryptAndUpload = async (
    file: File,
    nftObjectId: string
  ): Promise<SealUploadResult | null> => {
    setEncrypting(true)
    setError(null)
    try {
      // Step 1: Get Seal encryption key for this policy
      const policyResp = await fetch(`${SEAL_SERVER}/v1/policy`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:       'sui-object',
          object_id:  nftObjectId,
          network:    'testnet',
        }),
      })

      if (!policyResp.ok) throw new Error('Seal policy creation failed')
      const { policy_id, encryption_key } = await policyResp.json()

      // Step 2: Encrypt file bytes with the key (AES-256-GCM)
      const fileBytes  = new Uint8Array(await file.arrayBuffer())
      const keyBytes   = Uint8Array.from(atob(encryption_key), c => c.charCodeAt(0))
      const iv         = crypto.getRandomValues(new Uint8Array(12))
      const cryptoKey  = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
      const encrypted  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, fileBytes)

      // Prepend IV to encrypted data
      const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
      combined.set(iv, 0)
      combined.set(new Uint8Array(encrypted), iv.byteLength)

      // Step 3: Upload encrypted blob to Walrus
      const uploadResp = await fetch(`${WALRUS_PUB}/v1/blobs?epochs=5`, {
        method: 'PUT',
        body:   combined,
      })

      if (!uploadResp.ok) throw new Error('Walrus upload failed')
      const uploadResult = await uploadResp.json()
      const blobId = uploadResult.newlyCreated?.blobObject?.blobId
               || uploadResult.alreadyCertified?.blobId

      return {
        blobId,
        encryptedUrl: `${WALRUS_AGG}/v1/blobs/${blobId}`,
        policyId:     policy_id,
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seal encryption failed')
      return null
    } finally {
      setEncrypting(false)
    }
  }

  /**
   * Decrypt a Seal-encrypted blob. Requires proof the caller owns the NFT.
   * walletAddress: the connected Sui wallet that holds the NFT
   */
  const decryptBlob = async (
    blobId:      string,
    policyId:    string,
    nftObjectId: string,
    walletAddr:  string
  ): Promise<Blob | null> => {
    setDecrypting(true)
    setError(null)
    try {
      // Step 1: Request decryption key from Seal
      const keyResp = await fetch(`${SEAL_SERVER}/v1/decrypt`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          policy_id:    policyId,
          blob_id:      blobId,
          requester:    walletAddr,
          object_id:    nftObjectId,
          network:      'testnet',
        }),
      })

      if (!keyResp.ok) throw new Error('Decryption key request failed: do you own this NFT?')
      const { decryption_key } = await keyResp.json()

      // Step 2: Fetch encrypted blob from Walrus
      const blobResp = await fetch(`${WALRUS_AGG}/v1/blobs/${blobId}`)
      if (!blobResp.ok) throw new Error('Blob fetch failed')
      const encData = new Uint8Array(await blobResp.arrayBuffer())

      // Step 3: Decrypt
      const iv         = encData.slice(0, 12)
      const ciphertext = encData.slice(12)
      const keyBytes   = Uint8Array.from(atob(decryption_key), c => c.charCodeAt(0))
      const cryptoKey  = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
      const decrypted  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext)

      return new Blob([decrypted])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decryption failed')
      return null
    } finally {
      setDecrypting(false)
    }
  }

  return { encryptAndUpload, decryptBlob, encrypting, decrypting, error }
}
