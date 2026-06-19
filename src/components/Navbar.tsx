import { useUserProfile } from '../hooks/useUserProfile'
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import s from './Navbar.module.css'

/* ── tiny Google G icon ── */
const GIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

/* ── network pill ── */
function NetBadge() {
  const [net, setNet] = useState<'mainnet'|'testnet'>(() => {
    try {
      const saved = localStorage.getItem('tuskr_network')
      return (saved === 'testnet' || saved === 'mainnet') ? saved : 'mainnet'
    } catch { return 'mainnet' }
  })

  const toggle = () => {
    const next = net === 'mainnet' ? 'testnet' : 'mainnet'
    setNet(next)
    try { localStorage.setItem('tuskr_network', next) } catch {}
    window.location.reload()   // simplest way to apply network switch
  }

  return (
    <button onClick={toggle} className={`${s.netBadge} ${net === 'mainnet' ? s.netMain : s.netTest}`}>
      <span className={s.netDot} />
      {net === 'mainnet' ? 'Mainnet' : 'Testnet'}
    </button>
  )
}

/* ── read google user from localStorage ── */
function useGoogleUser() {
  const [name, setName]    = useState('')
  const [email, setEmail]  = useState('')
  const [pic, setPic]      = useState('')
  const [addr, setAddr]    = useState('')

  const read = () => {
    const a = localStorage.getItem('zklogin_address') || ''
    const e = localStorage.getItem('zklogin_email')   || ''
    const t = localStorage.getItem('zklogin_id_token') || ''
    setAddr(a); setEmail(e)
    try {
      if (t) {
        const p = JSON.parse(atob(t.split('.')[1]))
        setName(p.name || e.split('@')[0])
        setPic(p.picture || '')
      } else {
        setName(e.split('@')[0])
        setPic('')
      }
    } catch {
      setName(e.split('@')[0])
      setPic('')
    }
  }

  useEffect(() => {
    read()
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])

  const signOut = () => {
    ['zklogin_address','zklogin_email','zklogin_id_token','zklogin_nonce']
      .forEach(k => localStorage.removeItem(k))
    read()
    window.dispatchEvent(new Event('storage'))
  }

  return { name, email, pic, addr, signOut, isLoggedIn: !!addr && !!email }
}

/* ── nav links ── */
const LINKS = [
  { label: 'Explore',   sub: [
    { label: 'Browse NFTs',  to: '/marketplace' },
    { label: 'Swap',         to: '/swap' },
    { label: 'Media Scanner',to: '/scanner' },
    { label: 'Collections',  to: '/collections' },
    { label: 'Live Auctions',to: '/auction' },
    { label: 'Activity',     to: '/activity' },
    { label: 'Leaderboard',  to: '/leaderboard' },
  ]},
  { label: 'Create',    sub: [
    { label: 'Mint NFT',     to: '/mint' },
    { label: 'AI Generator', to: '/mint/ai' },
    { label: 'Batch Mint',   to: '/mint/batch' },
    { label: 'Agent Wallet',    to: '/agent-wallet' },
    { label: 'List for Sale',to: '/list' },
  ]},
  { label: 'Community', sub: [
    { label: 'My Profile',       to: '/profile' },
    { label: 'Walrus Protocol',  href: 'https://walrus.xyz' },
    { label: 'Sui Blockchain',   href: 'https://sui.io' },
    { label: 'DeepSurge Hack',  href: 'https://deepsurge.xyz' },
  ]},
]

export default function Navbar() {
  const location = useLocation()
  const wallet   = useCurrentAccount()
  const [copied, setCopied] = useState(false)
  const google   = useGoogleUser()
  const { mutate: disconnect } = useDisconnectWallet()

  const [open,     setOpen]     = useState<string|null>(null)
  const [mobile,   setMobile]   = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const navTimer   = useRef<any>(null)
  const acctRef    = useRef<HTMLDivElement>(null)

  /* close everything on route change */
  useEffect(() => {
    setOpen(null)
    setMobile(false)
    setAcctOpen(false)
  }, [location.pathname])

  /* lock scroll when mobile open */
  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobile])

  /* close account dropdown on outside click */
  useEffect(() => {
    if (!acctOpen) return
    const fn = (e: MouseEvent) => {
      if (!acctRef.current?.contains(e.target as Node)) setAcctOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [acctOpen])

  /* scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const copyAddress = () => {
    if (!wallet?.address) return
    navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isSignedIn = !!wallet

  /* best display name */
  const rawDisplay  = wallet ? wallet.address.slice(0,8)+'...' : ''
  const initials    = rawDisplay.slice(0,2).toUpperCase() || '?'

  // Load Walrus profile for this wallet — gives us username + avatar
  const { profile: walrusProfile, avatarUrl } = useUserProfile(wallet?.address)
  const displayName = walrusProfile?.username || rawDisplay

  return (
    <>
      {/* Rainbow stripe */}
      <div className={s.stripe} />

      <header className={`${s.bar} ${scrolled ? s.barScrolled : ''}`}>
        <div className={s.inner}>

          {/* Logo */}
          <Link to="/" className={s.logo} onClick={() => setMobile(false)}>tuskr</Link>

          {/* Desktop center nav */}
          <nav className={s.desktopNav}>
            {LINKS.map(item => (
              <div key={item.label} className={s.navItem}
                onMouseEnter={() => { clearTimeout(navTimer.current); setOpen(item.label) }}
                onMouseLeave={() => { navTimer.current = setTimeout(() => setOpen(null), 150) }}>
                <button className={`${s.navBtn} ${open === item.label ? s.navBtnOn : ''}`}>
                  {item.label}
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink:0, transition:'transform .2s', transform: open===item.label?'rotate(180deg)':'none' }}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {open === item.label && (
                  <div className={s.drop}
                    onMouseEnter={() => clearTimeout(navTimer.current)}
                    onMouseLeave={() => { navTimer.current = setTimeout(() => setOpen(null), 150) }}>
                    {item.sub.map(lnk =>
                      'href' in lnk
                        ? <a key={lnk.label} href={lnk.href} target="_blank" rel="noopener noreferrer" className={s.dropLink}>
                            {lnk.label}
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 8L8 1M8 1H3M8 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          </a>
                        : <Link key={lnk.label} to={lnk.to!} className={s.dropLink}>{lnk.label}</Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop right */}
          <div className={s.desktopRight}>
            <NetBadge />
            {isSignedIn ? (
              <div ref={acctRef} style={{ position:'relative' }}>
                <button className={s.pill} onClick={() => setAcctOpen(v => !v)}>
                  {avatarUrl
                    ? <img src={avatarUrl} style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt="avatar"/>
                    : <span className={s.pillIni}>{initials}</span>
                  }
                  <span className={s.pillName}>{displayName}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity:.5, transition:'transform .2s', transform: acctOpen?'rotate(180deg)':'none' }}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>

                {acctOpen && (
                  <div className={s.acctDrop}>
                    {/* header */}
                    <div className={s.acctHead}>
                      {avatarUrl
                        ? <img src={avatarUrl} style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid rgba(0,212,170,0.25)' }} alt="avatar"/>
                        : <span className={s.acctIni}>{initials}</span>
                      }
                      <div>
                        <div className={s.acctName}>{displayName}</div>

                      </div>
                    </div>
                    <div className={s.acctDivider} />

                    {/* wallet */}
                    {wallet ? (
                      <div className={s.acctRow}>
                        <span className={s.acctRowDot} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={s.acctRowLabel}>Sui Wallet</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={s.acctRowVal}>{wallet.address.slice(0,10)}...{wallet.address.slice(-6)}</div>
                            <button
                              onClick={copyAddress}
                              title={copied ? 'Copied!' : 'Copy full address'}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '3px 6px', borderRadius: 6, display: 'flex', alignItems: 'center',
                                color: copied ? '#00d4aa' : 'rgba(245,245,247,0.35)',
                                transition: 'color 0.2s, background 0.2s',
                                flexShrink: 0,
                              }}
                              onMouseEnter={e => { if(!copied) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,247,0.7)' }}
                              onMouseLeave={e => { if(!copied) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,247,0.35)' }}
                            >
                              {copied ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={s.acctConnectWrap}><ConnectButton /></div>
                    )}

                    {/* Google via Enoki shows in ConnectButton wallet modal */}

                    <div className={s.acctDivider} />
                    <Link to="/profile" className={s.acctAction} onClick={() => setAcctOpen(false)}>My Profile</Link>
                    <Link to="/mint" className={s.acctAction} onClick={() => setAcctOpen(false)}>Mint NFT</Link>
                    <div className={s.acctDivider} />

                    {wallet && (
                      <button className={`${s.acctAction} ${s.acctActionRed}`} onClick={() => { disconnect(); setAcctOpen(false) }}>
                        Disconnect Wallet
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={s.beamWrap}>
                <ConnectButton />
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button
            className={`${s.burger} ${mobile ? s.burgerOn : ''}`}
            onClick={() => setMobile(v => !v)}
            aria-label={mobile ? 'Close menu' : 'Open menu'}
            aria-expanded={mobile}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

      </header>

      {/* ═══════════════════════════════════════
          MOBILE DRAWER: must be OUTSIDE <header>
          because backdrop-filter on header traps
          position:fixed children, making them invisible.
      ═══════════════════════════════════════ */}
      {mobile && (
        <div className={s.drawer}>
          <div className={s.drawerScroll}>

            {/* Network */}
            <div className={s.drawerNetRow}>
              <NetBadge />
            </div>

            {/* Nav links */}
            <nav className={s.drawerNav}>
              {LINKS.map(item => (
                <div key={item.label} className={s.drawerGroup}>
                  <span className={s.drawerGroupLabel}>{item.label}</span>
                  {item.sub.map(sub => (
                    sub.href ? (
                      <a
                        key={sub.href}
                        href={sub.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.drawerLink}
                        onClick={() => setMobile(false)}
                      >
                        {sub.label} ↗
                      </a>
                    ) : (
                      <Link
                        key={sub.to}
                        to={sub.to!}
                        className={s.drawerLink}
                        onClick={() => setMobile(false)}
                      >
                        {sub.label}
                      </Link>
                    )
                  ))}
                </div>
              ))}
            </nav>

            {/* Auth card */}
            {isSignedIn ? (
              <div className={s.idCard}>
                <div className={s.idRow}>
                  {avatarUrl
                    ? <img src={avatarUrl} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid rgba(0,212,170,0.2)' }} alt="avatar"/>
                    : <span className={s.idIni}>{initials}</span>
                  }
                  <div>
                    <div className={s.idName}>{displayName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className={s.idAddr}>{wallet?.address.slice(0,14)}...{wallet?.address.slice(-8)}</div>
                    <button
                      onClick={copyAddress}
                      title={copied ? 'Copied!' : 'Copy address'}
                      style={{
                        background: copied ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${copied ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 7, cursor: 'pointer', padding: '4px 6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: copied ? '#00d4aa' : 'rgba(245,245,247,0.5)',
                        transition: 'all 0.2s', flexShrink: 0,
                      }}
                    >
                      {copied ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  </div>
                </div>

                {/* Quick actions — same as desktop account dropdown */}
                <div className={s.acctDivider} style={{ margin: '12px 0 6px' }} />
                <Link
                  to="/profile"
                  className={s.acctAction}
                  onClick={() => setMobile(false)}
                >
                  My Profile
                </Link>
                <Link
                  to="/mint"
                  className={s.acctAction}
                  onClick={() => setMobile(false)}
                >
                  Mint NFT
                </Link>
                <div className={s.acctDivider} style={{ margin: '6px 0 6px' }} />
                {wallet && (
                  <button
                    className={`${s.acctAction} ${s.acctActionRed}`}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => { disconnect(); setMobile(false) }}
                  >
                    Disconnect Wallet
                  </button>
                )}
              </div>
            ) : (
              <div className={s.idCard}>
                <ConnectButton />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
