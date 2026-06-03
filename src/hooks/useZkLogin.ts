/**
 * useZkLogin.ts
 * Sui zkLogin, email/Google sign-in → Sui wallet
 * Docs: https://docs.sui.io/concepts/cryptography/zklogin
 */
import { useState } from 'react'
import { getFullnodeUrl } from '@mysten/sui/client'

const PROVER_URL    = 'https://prover-dev.mystenlabs.com/v1'
const REDIRECT_URI  = typeof window !== 'undefined' ? window.location.origin + '/zklogin-callback' : ''
const NETWORK       = 'mainnet'
const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export function useZkLogin() {
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState<string | null>(
    () => localStorage.getItem('zklogin_address')
  )

  const beginLogin = () => {
    // Generate nonce and store epoch data
    const nonce = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem('zklogin_nonce', nonce)

    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'id_token',
      scope:         'openid email profile',
      nonce,
    })

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const completeLogin = async (idToken: string) => {
    setLoading(true)
    try {
      // In a real integration you would:
      // 1. Call the Sui ZK prover with the JWT
      // 2. Derive the ephemeral keypair
      // 3. Compute the Sui address from the sub + salt
      // For the demo we simulate a successful zkLogin
      const simulatedAddr = '0x' + Array.from(
        new TextEncoder().encode(idToken.slice(0, 32))
      ).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64)

      localStorage.setItem('zklogin_address', simulatedAddr)
      localStorage.setItem('zklogin_token', idToken)
      setAddress(simulatedAddr)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('zklogin_address')
    localStorage.removeItem('zklogin_token')
    localStorage.removeItem('zklogin_nonce')
    setAddress(null)
  }

  return { address, loading, beginLogin, completeLogin, logout, isLoggedIn: !!address }
}
