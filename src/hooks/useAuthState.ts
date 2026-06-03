/**
 * useAuthState — single source of truth for linked identities
 *
 * Storage schema in localStorage:
 *   tuskr_link_w2g_{walletAddr}  = JSON GoogleInfo   (wallet → linked Google)
 *   tuskr_link_g2w_{email}       = walletAddress string (Google → linked wallet)
 *
 * Rules:
 *   - When both wallet + Google are active simultaneously → auto-save link
 *   - Navbar shows ONE identity based on what is active
 *   - If linked account exists, show it as secondary info (not as a button)
 *   - Profile page handles manual linking / unlinking
 */

import { useEffect, useState, useCallback } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'

export interface GoogleInfo {
  email: string
  name: string
  picture: string
  suiAddress: string   // zkLogin derived address
}

export interface AuthState {
  // Active sessions
  wallet: string | null          // connected wallet address (from dapp-kit)
  google: GoogleInfo | null      // signed-in Google user

  // Linked accounts (persisted)
  linkedGoogleForWallet: GoogleInfo | null  // Google linked to current wallet
  linkedWalletForGoogle: string | null      // Wallet addr linked to current Google

  // Derived
  isLinked: boolean              // wallet + Google are linked to each other
  displayName: string            // best name to show
  displayAvatar: string          // best avatar URL

  // Actions
  saveLink: () => void
  removeLink: () => void
  signOutGoogle: () => void
  refresh: () => void
}

function readGoogle(): GoogleInfo | null {
  const suiAddress = localStorage.getItem('zklogin_address')
  const email      = localStorage.getItem('zklogin_email')
  const token      = localStorage.getItem('zklogin_id_token')
  if (!suiAddress || !email) return null
  let name = email.split('@')[0], picture = ''
  try {
    if (token) {
      const p = JSON.parse(atob(token.split('.')[1]))
      name = p.name || name
      picture = p.picture || ''
    }
  } catch {}
  return { email, name, picture, suiAddress }
}

function readLinkedGoogle(walletAddr: string): GoogleInfo | null {
  try {
    const raw = localStorage.getItem(`tuskr_link_w2g_${walletAddr}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function readLinkedWallet(email: string): string | null {
  return localStorage.getItem(`tuskr_link_g2w_${email}`)
}

function writeLink(walletAddr: string, google: GoogleInfo) {
  localStorage.setItem(`tuskr_link_w2g_${walletAddr}`, JSON.stringify(google))
  localStorage.setItem(`tuskr_link_g2w_${google.email}`, walletAddr)
}

function deleteLink(walletAddr: string | null, email: string | null) {
  if (walletAddr) localStorage.removeItem(`tuskr_link_w2g_${walletAddr}`)
  if (email)      localStorage.removeItem(`tuskr_link_g2w_${email}`)
}

export function useAuthState(): AuthState {
  const account = useCurrentAccount()
  const wallet  = account?.address ?? null

  const [google,   setGoogle]   = useState<GoogleInfo | null>(null)
  const [lgfw,     setLgfw]     = useState<GoogleInfo | null>(null)  // linked Google for wallet
  const [lwfg,     setLwfg]     = useState<string | null>(null)      // linked wallet for Google

  const refresh = useCallback(() => {
    const g = readGoogle()
    setGoogle(g)
    if (wallet) setLgfw(readLinkedGoogle(wallet))
    else        setLgfw(null)
    if (g)      setLwfg(readLinkedWallet(g.email))
    else        setLwfg(null)
  }, [wallet])

  useEffect(() => {
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [refresh])

  // Auto-save link when both are active simultaneously
  useEffect(() => {
    if (wallet && google) {
      writeLink(wallet, google)
      setLgfw(google)
      setLwfg(wallet)
    }
  }, [wallet, google?.email])

  const saveLink = useCallback(() => {
    if (wallet && google) writeLink(wallet, google)
    refresh()
  }, [wallet, google, refresh])

  const removeLink = useCallback(() => {
    deleteLink(wallet, google?.email ?? lgfw?.email ?? null)
    setLgfw(null); setLwfg(null)
    window.dispatchEvent(new Event('storage'))
  }, [wallet, google, lgfw])

  const signOutGoogle = useCallback(() => {
    ['zklogin_address','zklogin_email','zklogin_id_token','zklogin_nonce']
      .forEach(k => localStorage.removeItem(k))
    setGoogle(null); setLwfg(null)
    window.dispatchEvent(new Event('storage'))
  }, [])

  // Best display info — prefer Google name/picture, fall back to wallet
  const effectiveGoogle = google ?? lgfw
  const isLinked = !!(wallet && effectiveGoogle)

  const displayName = effectiveGoogle?.name
    ?? (wallet ? `${wallet.slice(0,6)}…${wallet.slice(-4)}` : '')

  const displayAvatar = effectiveGoogle?.picture ?? ''

  return {
    wallet,
    google,
    linkedGoogleForWallet: lgfw,
    linkedWalletForGoogle: lwfg,
    isLinked,
    displayName,
    displayAvatar,
    saveLink,
    removeLink,
    signOutGoogle,
    refresh,
  }
}
