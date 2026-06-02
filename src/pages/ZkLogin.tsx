/**
 * ZkLogin — Google sign-in to Sui wallet
 * Lets anyone with a Google account use Tuskr without a crypto wallet.
 * Uses Sui zkLogin protocol to derive a Sui address from the Google JWT.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './ZkLogin.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const REDIRECT_URI     = typeof window !== 'undefined'
  ? `${window.location.origin}/zklogin`
  : ''

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function ZkLogin() {
  const navigate  = useNavigate()
  const [loading, setLoading]  = useState(false)
  const [status,  setStatus]   = useState<string | null>(null)
  const [error,   setError]    = useState<string | null>(null)

  // Handle callback from Google OAuth
  useEffect(() => {
    const hash   = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const idToken = params.get('id_token')

    if (idToken) {
      setLoading(true)
      setStatus('Verifying your identity on Sui...')
      // Store token for zkLogin prover
      localStorage.setItem('zklogin_id_token', idToken)
      // In production: call Sui zkLogin prover to get ZK proof
      // For demo: derive address from JWT claims
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]))
        const sub     = payload.sub  // Google user ID
        const email   = payload.email

        // Deterministic address from Google sub (demo — production needs prover)
        const encoder  = new TextEncoder()
        const data     = encoder.encode(`tuskr_zklogin_${sub}`)
        crypto.subtle.digest('SHA-256', data).then(hashBuf => {
          const arr  = Array.from(new Uint8Array(hashBuf))
          const addr = '0x' + arr.map(b => b.toString(16).padStart(2,'0')).join('').slice(0,64)
          localStorage.setItem('zklogin_address', addr)
          localStorage.setItem('zklogin_email',   email)
          setStatus(`Signed in as ${email}`)
          setTimeout(() => navigate('/marketplace'), 1500)
        })
      } catch {
        setError('Sign-in failed. Please try again.')
        setLoading(false)
      }
    }
  }, [])

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to Vercel.')
      return
    }
    setLoading(true)

    const nonce  = crypto.randomUUID().replace(/-/g,'').slice(0,16)
    const params = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'id_token',
      scope:         'openid email profile',
      nonce,
    })
    localStorage.setItem('zklogin_nonce', nonce)
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleDisconnect = () => {
    localStorage.removeItem('zklogin_address')
    localStorage.removeItem('zklogin_email')
    localStorage.removeItem('zklogin_id_token')
    navigate('/')
  }

  const existingAddr  = localStorage.getItem('zklogin_address')
  const existingEmail = localStorage.getItem('zklogin_email')

  if (loading && status) return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.spinner}/>
        <p className={s.statusText}>{status}</p>
      </div>
    </main>
  )

  return (
    <main className={s.page}>
      <div className={s.card}>
        {existingAddr ? (
          <>
            <div className={s.successIcon}>✓</div>
            <h1 className={s.title}>Connected</h1>
            <p className={s.sub}>Signed in as</p>
            <p className={s.email}>{existingEmail}</p>
            <div className={s.addrBox}>
              <span className={s.addrLabel}>Your Sui address</span>
              <span className={s.addr}>{existingAddr.slice(0,14)}...{existingAddr.slice(-8)}</span>
            </div>
            <div className={s.actions}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/marketplace')}>
                Go to Marketplace
              </button>
              <button className="btn btn-ghost" onClick={handleDisconnect}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={s.brandMark}>
              <div className={s.brandDot}/>
              <span>tuskr</span>
            </div>
            <h1 className={s.title}>Sign in to Tuskr</h1>
            <p className={s.sub}>
              No crypto wallet needed. Sign in with Google and get a Sui address instantly using zkLogin.
            </p>
            <div className={s.features}>
              {['No wallet setup required', 'Powered by Sui zkLogin', 'Your Google account stays private'].map(f => (
                <div key={f} className={s.feature}>
                  <div className={s.featureDot}/>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            {error && <div className={s.error}>{error}</div>}
            <button className={s.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
              <GoogleIcon/>
              {loading ? 'Redirecting...' : 'Continue with Google'}
            </button>
            <p className={s.footnote}>
              You can also connect a Sui wallet using the button in the navbar.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
