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
    { label: 'Collections',  to: '/collections' },
    { label: 'Live Auctions',to: '/auction' },
    { label: 'Activity',     to: '/activity' },
    { label: 'Leaderboard',  to: '/leaderboard' },
  ]},
  { label: 'Create',    sub: [
    { label: 'Mint NFT',     to: '/mint' },
    { label: 'AI Generator', to: '/mint/ai' },
    { label: 'Batch Mint',   to: '/mint/batch' },
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

  const isSignedIn = !!wallet

  /* best display name */
  const displayName = wallet ? wallet.address.slice(0,8)+'...' : ''
  const initials    = displayName.slice(0,2).toUpperCase() || '?'

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
                  {google.pic
                    ? <img src={google.pic} className={s.pillAva} alt="" />
                    : <span className={s.pillIni}>{initials}</span>}
                  <span className={s.pillName}>{displayName}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity:.5, transition:'transform .2s', transform: acctOpen?'rotate(180deg)':'none' }}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>

                {acctOpen && (
                  <div className={s.acctDrop}>
                    {/* header */}
                    <div className={s.acctHead}>
                      {google.pic ? <img src={google.pic} className={s.acctAva} alt="" /> : <span className={s.acctIni}>{initials}</span>}
                      <div>
                        <div className={s.acctName}>{displayName}</div>
                        {google.email && <div className={s.acctEmail}>{google.email}</div>}
                      </div>
                    </div>
                    <div className={s.acctDivider} />

                    {/* wallet */}
                    {wallet ? (
                      <div className={s.acctRow}>
                        <span className={s.acctRowDot} />
                        <div>
                          <div className={s.acctRowLabel}>Sui Wallet</div>
                          <div className={s.acctRowVal}>{wallet.address.slice(0,10)}...{wallet.address.slice(-6)}</div>
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
                    {google.isLoggedIn && (
                      <button className={`${s.acctAction} ${s.acctActionRed}`} onClick={() => { google.signOut(); setAcctOpen(false) }}>
                        Sign out of Google
                      </button>
                    )}
                    {wallet && (
                      <button className={`${s.acctAction} ${s.acctActionRed}`} onClick={() => { disconnect(); setAcctOpen(false) }}>
                        Disconnect Wallet
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={s.authRow}>
                <Link to="/zklogin" className={s.signInBtn}><GIcon />Sign in</Link>
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
          MOBILE DRAWER — must be OUTSIDE <header>
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

            {/* Auth card */}
            {isSignedIn ? (
              <div className={s.idCard}>
                <div className={s.idRow}>
                  {google.pic
                    ? <img src={google.pic} className={s.idAva} alt="" />
                    : <span className={s.idIni}>{initials}</span>}
                  <div>
                    <div className={s.idName}>{displayName}</div>
                    {google.email && <div className={s.idEmail}>{google.email}</div>}
                  </div>
                </div>
                {wallet && (
                  <div className={s.idAddr}>{wallet.address.slice(0,14)}...{wallet.address.slice(-8)}</div>
                )}
                {!wallet && (
                  <div className={s.idConnectWrap}><ConnectButton /></div>
                )}
                {!google.isLoggedIn && (
                  <Link to="/zklogin" className={s.idGoogleBtn} onClick={() => setMobile(false)}>
                    <GIcon /> Connect Google
                  </Link>
                )}
                <div className={s.idActions}>
                  <Link to="/profile" className={s.idBtn} onClick={() => setMobile(false)}>Profile</Link>
                  {google.isLoggedIn && (
                    <button className={`${s.idBtn} ${s.idBtnRed}`} onClick={() => { google.signOut(); setMobile(false) }}>Sign out</button>
                  )}
                  {wallet && (
                    <button className={`${s.idBtn} ${s.idBtnRed}`} onClick={() => { disconnect(); setMobile(false) }}>Disconnect</button>
                  )}
                </div>
              </div>
            ) : (
              <div className={s.authCard}>
                <p className={s.authCardTitle}>Join Tuskr</p>
                <Link to="/zklogin" className={s.authGoogleBtn} onClick={() => setMobile(false)}>
                  <GIcon /> Sign in with Google
                </Link>
                <div className={s.authWalletWrap}><ConnectButton /></div>
              </div>
            )}

            {/* Quick links */}
            <div className={s.quickRow}>
              <Link to="/marketplace" className={`${s.quickBtn} ${s.quickPrimary}`} onClick={() => setMobile(false)}>Explore</Link>
              <Link to="/mint/ai"     className={s.quickBtn} onClick={() => setMobile(false)}>AI Mint</Link>
              <Link to="/mint"        className={s.quickBtn} onClick={() => setMobile(false)}>Mint</Link>
            </div>

            {/* Nav sections */}
            {LINKS.map(section => (
              <div key={section.label} className={s.navSection}>
                <div className={s.navSectionTitle}>{section.label}</div>
                {section.sub.map(lnk =>
                  'href' in lnk
                    ? <a key={lnk.label} href={lnk.href} target="_blank" rel="noopener noreferrer"
                        className={s.navLink} onClick={() => setMobile(false)}>
                        {lnk.label} <span>↗</span>
                      </a>
                    : <Link key={lnk.label} to={lnk.to!} className={s.navLink} onClick={() => setMobile(false)}>
                        {lnk.label}
                      </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
