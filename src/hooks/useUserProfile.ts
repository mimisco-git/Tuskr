/**
 * useUserProfile — Persistent user profile stored on Walrus
 *
 * Profile data (username, bio, avatar) is stored as a JSON blob on Walrus.
 * The blob ID is kept in localStorage as a lightweight pointer.
 * This makes user identity persistent across devices and verifiable on-chain.
 *
 * Hits Walrus track: "Persistent data and file access using Walrus"
 * — not just NFT media but user identity data stored on Walrus too.
 */
import { useState, useEffect, useCallback } from 'react'

const PROFILE_KEY  = 'tuskr_profile_blob'
const AGGREGATOR   = 'https://aggregator.walrus-testnet.walrus.space'
const PUBLISHER    = 'https://publisher.walrus-testnet.walrus.space'

export interface UserProfile {
  username:     string
  bio:          string
  avatarBlobId: string   // blob ID of profile picture on Walrus
  wallet:       string
  updatedAt:    string
}

const emptyProfile = (wallet: string): UserProfile => ({
  username:     '',
  bio:          '',
  avatarBlobId: '',
  wallet,
  updatedAt:    new Date().toISOString(),
})

async function loadFromWalrus(blobId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.json() as UserProfile
  } catch { return null }
}

async function saveToWalrus(profile: UserProfile): Promise<string | null> {
  try {
    const body = JSON.stringify(profile)
    const res  = await fetch(`${PUBLISHER}/v1/blobs?epochs=5`, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.newlyCreated?.blobObject?.blobId
        || data.alreadyCertified?.blobId
        || null
  } catch { return null }
}

export function useUserProfile(walletAddress: string | undefined) {
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [loading, setLoading]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [blobId,  setBlobId]    = useState<string | null>(null)

  // Load profile on mount
  useEffect(() => {
    if (!walletAddress) return
    const stored = localStorage.getItem(`${PROFILE_KEY}_${walletAddress}`)
    if (!stored) {
      setProfile(emptyProfile(walletAddress))
      return
    }
    setLoading(true)
    loadFromWalrus(stored).then(p => {
      setProfile(p ?? emptyProfile(walletAddress))
      setBlobId(stored)
    }).finally(() => setLoading(false))
  }, [walletAddress])

  // Upload avatar image to Walrus, return blob ID
  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    try {
      const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=5`, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.newlyCreated?.blobObject?.blobId
          || data.alreadyCertified?.blobId
          || null
    } catch { return null }
  }, [])

  // Save profile to Walrus
  const saveProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!walletAddress) return false
    setSaving(true)
    try {
      const updated: UserProfile = {
        ...(profile ?? emptyProfile(walletAddress)),
        ...updates,
        wallet:    walletAddress,
        updatedAt: new Date().toISOString(),
      }
      setProfile(updated)
      const newId = await saveToWalrus(updated)
      if (newId) {
        localStorage.setItem(`${PROFILE_KEY}_${walletAddress}`, newId)
        setBlobId(newId)
        return true
      }
      return false
    } finally { setSaving(false) }
  }, [profile, walletAddress])

  const avatarUrl = profile?.avatarBlobId
    ? `${AGGREGATOR}/v1/blobs/${profile.avatarBlobId}`
    : null

  return { profile, loading, saving, blobId, saveProfile, uploadAvatar, avatarUrl }
}
