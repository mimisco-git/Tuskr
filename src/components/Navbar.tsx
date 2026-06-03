import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import { useAuthState } from '../hooks/useAuthState'
import s from './Navbar.module.css'

/* ─────────────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────────────── */
const ChevronDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

/* ─────────────────────────────────────────────────────────────────────
   NAV DATA
───────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    label: 'Explore',
    sections: [
      { heading: 'Discover', links: [
        { label: 'Browse NFTs',    to: '/marketplace' },
        { label: 'Collections',   to: '/collections' },
        { label: 'Live Auctions', to: '/auction' },
        { label: 'Activity',      to: '/activity' },
      ]},
      { heading: 'Account', links: [
        { label: 'My Profile',    to: '/profile' },
        { label: 'Leaderboard',   to: '/leaderboard' },
        { label: 'Dashboard',     to: '/dashboard' },
      ]},
    ],
  },
  {
    label: 'Create',
    sections: [
      { heading: 'Mint', links: [
        { label: 'Mint an NFT',   to: '/mint' },
        { label: 'AI Generator',  to: '/mint/ai' },
        { label: 'Batch Mint',    to: '/mint/batch' },
        { label: 'List for Sale', to: '/list' },
      ]},
      { heading: 'Ecosystem', links: [
        { label: 'Walrus Docs',   href: 'https://docs.wal.app' },
        { label: 'Sui Docs',      href: 'https://docs.sui.io' },
        { label: 'GitHub',        href: 'https://github.com/mimisco-git/Tuskr' },
      ]},
    ],
  },
  {
    label: 'Community',
    sections: [
      { heading: 'Connect', links: [
        { label: 'Activity Feed',   to: '/activity' },
        { label: 'Leaderboard',     to: '/leaderboard' },
        { label: 'My Profile',      to: '/profile' },
      ]},
      { heading: 'Built on', links: [
        { label: 'Sui Foundation',  href: 'https://sui.io' },
        { label: 'Walrus Protocol', href: 'https://walrus.xyz' },
        { label: 'DeepSurge',       href: 'https://deepsurge.xyz' },
      ]},
    ],
  },
]

/* ─────────────────────────────────────────────────────────────────────
   ACCOUNT DROPDOWN
───────────────────────────────────────────────────────────────────── */
function AccountMenu({ onClose }: { onClose: () => void }) {
  const auth     = useAuthState()
  const navigate = useNavigate()
  const { mutate: disconnectWallet } = useDisconnectWallet()
  const [copied, setCopied] = useState(false)

  const effectiveGoogle = auth.google ?? auth.linkedGoogleForWallet
  const effectiveWallet = auth.wallet ?? auth.linkedWalletForGoogle
  const displayName     = effectiveGoogle?.name
    ?? (auth.wallet ? `${auth.wallet.slice(0,6)}…${auth.wallet.slice(-4)}` : 'Account')
  const initials = displayName.slice(0,2).toUpperCase()

  const copy = (v: string) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const go = (path: string) => { navigate(path); onClose() }

  return (
    <div className={s.acctMenu}>
      {/* Avatar + name */}
      <div className={s.acctHeader}>
        {effectiveGoogle?.picture
          ? <img src={effectiveGoogle.picture} className={s.acctAvatar} alt=""/>
          : <div className={s.acctInitials}>{initials}</div>
        }
        <div>
          <div className={s.acctName}>{displayName}</div>
          {effectiveGoogle && <div className={s.acctEmail}>{effectiveGoogle.email}</div>}
        </div>
      </div>

      <div className={s.acctDivider}/>

      {/* Google row */}
      <div className={s.acctRow}>
        <GoogleIcon/>
        <div className={s.acctRowText}>
          <span className={s.acctRowLabel}>Google</span>
          <span className={s.acctRowVal}>
            {effectiveGoogle ? effectiveGoogle.email : 'Not connected'}
          </span>
        </div>
        {effectiveGoogle
          ? <span className={s.acctDot}/>
          : <a href="/zklogin" className={s.acctLink} onClick={e => { e.preventDefault(); go('/zklogin') }}>Connect</a>
        }
      </div>

      {/* Wallet row */}
      <div className={s.acctRow}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6z"/>
          <path d="M20 12h-6a2 2 0 1 0 0 4h6"/>
        </svg>
        <div className={s.acctRowText}>
          <span className={s.acctRowLabel}>Sui Wallet</span>
          <span className={s.acctRowVal}>
            {effectiveWallet
              ? `${effectiveWallet.slice(0,8)}…${effectiveWallet.slice(-6)}`
              : 'Not connected'
            }
          </span>
        </div>
        {effectiveWallet && (
          <button className={s.acctCopy} onClick={() => copy(effectiveWallet)}>
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>

      {/* Connect wallet button if not connected */}
      {!auth.wallet && (
        <div className={s.acctConnectWrap}><ConnectButton/></div>
      )}

      <div className={s.acctDivider}/>

      {/* Actions */}
      <button className={s.acctAction} onClick={() => go('/profile')}>My Profile</button>
      <button className={s.acctAction} onClick={() => go('/mint')}>Mint NFT</button>

      <div className={s.acctDivider}/>

      {/* Sign-out / disconnect */}
      {auth.wallet && (
        <button className={`${s.acctAction} ${s.acctActionDanger}`}
          onClick={() => { disconnectWallet(); onClose() }}>
          Disconnect Wallet
        </button>
      )}
      {auth.google && (
        <button className={`${s.acctAction} ${s.acctActionDanger}`}
          onClick={() => { auth.signOutGoogle(); onClose() }}>
          Sign out of Google
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN NAVBAR
───────────────────────────────────────────────────────────────────── */
export default function Navbar() {
  const location = useLocation()
  const auth     = useAuthState()
  const account  = useCurrentAccount()

  const [openNav,  setOpenNav]  = useState<string | null>(null)
  const [openAcct, setOpenAcct] = useState(false)
  const [mobileOpen, setMobile] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const acctRef = useRef<HTMLDivElement>(null)
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSignedIn = !!(account || auth.google)
  const effectiveGoogle = auth.google ?? auth.linkedGoogleForWallet
  const effectiveWallet = auth.wallet ?? auth.linkedWalletForGoogle

  const displayName = effectiveGoogle?.name
    ?? (auth.wallet ? `${auth.wallet.slice(0,6)}…${auth.wallet.slice(-4)}` : '')
  const initials = displayName.slice(0,2).toUpperCase()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    setOpenNav(null); setOpenAcct(false); setMobile(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (!openAcct) return
    const h = (e: MouseEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) {
        setOpenAcct(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openAcct])

  const hoverOpen  = (label: string) => { if (timer.current) clearTimeout(timer.current); setOpenNav(label) }
  const hoverClose = () => { timer.current = setTimeout(() => setOpenNav(null), 150) }
  const hoverStay  = () => { if (timer.current) clearTimeout(timer.current) }

  return (
    <>
      <div className={s.topBar}/>
      <header className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
        <div className={s.inner}>

          {/* Logo */}
          <Link to="/" className={s.logo}>tuskr</Link>

          {/* Desktop nav */}
          <nav className={s.desktopNav}>
            {NAV_ITEMS.map(item => (
              <div key={item.label} className={s.navItem}
                onMouseEnter={() => hoverOpen(item.label)}
                onMouseLeave={hoverClose}>
                <button className={`${s.navTrigger} ${openNav === item.label ? s.navTriggerActive : ''}`}>
                  {item.label}
                  <span className={`${s.navChevron} ${openNav === item.label ? s.navChevronOpen : ''}`}>
                    <ChevronDown/>
                  </span>
                </button>

                {openNav === item.label && (
                  <div className={s.megaMenu} onMouseEnter={hoverStay} onMouseLeave={hoverClose}>
                    {item.sections.map(sec => (
                      <div key={sec.heading} className={s.megaSection}>
                        <div className={s.megaHeading}>{sec.heading}</div>
                        {sec.links.map(lnk => (
                          'href' in lnk
                            ? <a key={lnk.label} href={lnk.href} target="_blank"
                                rel="noopener noreferrer" className={s.megaLink}>
                                {lnk.label}
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                              </a>
                            : <Link key={lnk.label} to={lnk.to!} className={s.megaLink}>
                                {lnk.label}
                              </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop right */}
          <div className={s.desktopRight}>
            {isSignedIn ? (
              <div ref={acctRef} className={s.acctWrap}>
                <button className={s.acctPill} onClick={() => setOpenAcct(v => !v)}>
                  {effectiveGoogle?.picture
                    ? <img src={effectiveGoogle.picture} className={s.pillImg} alt=""/>
                    : <div className={s.pillInitials}>{initials || '?'}</div>
                  }
                  <span className={s.pillName}>{displayName}</span>
                  <span className={`${s.pillChev} ${openAcct ? s.pillChevOpen : ''}`}><ChevronDown/></span>
                </button>
                {openAcct && <AccountMenu onClose={() => setOpenAcct(false)}/>}
              </div>
            ) : (
              <div className={s.authBtns}>
                <Link to="/zklogin" className={s.googleBtn}>
                  <GoogleIcon/><span>Sign in</span>
                </Link>
                <ConnectButton/>
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button
            className={`${s.burger} ${mobileOpen ? s.burgerOpen : ''}`}
            onClick={() => setMobile(v => !v)}
            aria-label="Toggle menu"
          >
            <span/><span/><span/>
          </button>
        </div>

        {/* ── MOBILE DRAWER ── */}
        {mobileOpen && (
          <div className={s.drawer}>
            <div className={s.drawerScroll}>

              {/* Identity card */}
              {isSignedIn ? (
                <div className={s.drawerIdCard}>
                  <div className={s.drawerIdRow}>
                    {effectiveGoogle?.picture
                      ? <img src={effectiveGoogle.picture} className={s.drawerAvatar} alt=""/>
                      : <div className={s.drawerInitials}>{initials || '?'}</div>
                    }
                    <div>
                      <div className={s.drawerIdName}>{displayName}</div>
                      {effectiveGoogle && <div className={s.drawerIdEmail}>{effectiveGoogle.email}</div>}
                    </div>
                  </div>

                  {effectiveWallet && (
                    <div className={s.drawerAddr}>
                      {effectiveWallet.slice(0,10)}…{effectiveWallet.slice(-6)}
                    </div>
                  )}

                  {!auth.wallet && (
                    <div className={s.drawerConnectRow}><ConnectButton/></div>
                  )}
                  {!auth.google && !auth.linkedGoogleForWallet && (
                    <Link to="/zklogin" className={s.drawerGoogleLink} onClick={() => setMobile(false)}>
                      <GoogleIcon/> Connect Google
                    </Link>
                  )}

                  <div className={s.drawerIdActions}>
                    <Link to="/profile" className={s.drawerIdBtn} onClick={() => setMobile(false)}>Profile</Link>
                    {auth.google && (
                      <button className={`${s.drawerIdBtn} ${s.drawerIdBtnRed}`}
                        onClick={() => { auth.signOutGoogle(); setMobile(false) }}>
                        Sign out
                      </button>
                    )}
                    {auth.wallet && (
                      <DisconnectBtn onDone={() => setMobile(false)}/>
                    )}
                  </div>
                </div>
              ) : (
                <div className={s.drawerAuthCard}>
                  <Link to="/zklogin" className={s.drawerGoogleBtn} onClick={() => setMobile(false)}>
                    <GoogleIcon/> Sign in with Google
                  </Link>
                  <div className={s.drawerConnectRow}><ConnectButton/></div>
                </div>
              )}

              {/* Quick actions */}
              <div className={s.drawerQuick}>
                <Link to="/marketplace" className={`${s.drawerQuickBtn} ${s.drawerQuickPrimary}`} onClick={() => setMobile(false)}>Explore NFTs</Link>
                <Link to="/mint/ai"     className={s.drawerQuickBtn} onClick={() => setMobile(false)}>AI Generator</Link>
                <Link to="/mint"        className={s.drawerQuickBtn} onClick={() => setMobile(false)}>Mint NFT</Link>
              </div>

              {/* Nav links */}
              {NAV_ITEMS.map(item => (
                <div key={item.label} className={s.drawerSection}>
                  <div className={s.drawerSectionTitle}>{item.label}</div>
                  {item.sections.map(sec => (
                    <div key={sec.heading} className={s.drawerGroup}>
                      <div className={s.drawerGroupLabel}>{sec.heading}</div>
                      {sec.links.map(lnk => (
                        'href' in lnk
                          ? <a key={lnk.label} href={lnk.href} target="_blank"
                              rel="noopener noreferrer" className={s.drawerLink}
                              onClick={() => setMobile(false)}>
                              {lnk.label} ↗
                            </a>
                          : <Link key={lnk.label} to={lnk.to!} className={s.drawerLink}
                              onClick={() => setMobile(false)}>
                              {lnk.label}
                            </Link>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  )
}

// Needs to be inside dapp-kit context
function DisconnectBtn({ onDone }: { onDone: () => void }) {
  const { mutate: disconnect } = useDisconnectWallet()
  return (
    <button className={`${s.drawerIdBtn} ${s.drawerIdBtnRed}`}
      onClick={() => { disconnect(); onDone() }}>
      Disconnect wallet
    </button>
  )
}
