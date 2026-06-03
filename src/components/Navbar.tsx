import { useRef, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ConnectButton } from '@mysten/dapp-kit'
import { useAuthState } from '../hooks/useAuthState'
import s from './Navbar.module.css'

/* ── Icons ── */
const ChevronDown = () => (
  <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden>
    <path d="M1 1L5.5 5.5L10 1" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const Arrow = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 9 9" fill="none" aria-hidden>
    <path d="M9 0H0V1H9V0Z" fill="currentColor"/>
    <path d="M8.3 0L0 8.3L0.7 9L9 0.7L8.3 0Z" fill="currentColor"/>
    <path d="M9 0H8V9H9V0Z" fill="currentColor"/>
  </svg>
)
const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)
const WalletIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M20 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6z"/>
    <path d="M20 12h-6a2 2 0 1 0 0 4h6"/>
  </svg>
)
const LinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

/* ── Nav data ── */
const NAV = [
  { label: 'Explore', cols: [
    { group: 'Marketplace', items: [
      { label: 'Browse NFTs',        to: '/marketplace' },
      { label: 'Collections',        to: '/collections' },
      { label: 'Live Auctions',      to: '/auction' },
      { label: 'Activity Feed',      to: '/activity' },
    ]},
    { group: 'Earn', items: [
      { label: 'XP Leaderboard',    to: '/leaderboard' },
      { label: 'Creator Dashboard', to: '/dashboard' },
      { label: 'My NFTs',           to: '/profile' },
    ]},
  ]},
  { label: 'Create', cols: [
    { group: 'Mint', items: [
      { label: 'Mint an NFT',    to: '/mint' },
      { label: 'AI Generator',   to: '/mint/ai' },
      { label: 'Batch Mint',     to: '/mint/batch' },
      { label: 'List for Sale',  to: '/list' },
    ]},
    { group: 'Technology', items: [
      { label: 'Walrus Storage', href: 'https://docs.wal.app', ext: true },
      { label: 'Sui Blockchain', href: 'https://docs.sui.io',  ext: true },
      { label: 'GitHub',         href: 'https://github.com/mimisco-git/Tuskr', ext: true },
    ]},
  ]},
  { label: 'Community', cols: [
    { group: 'Tuskr', items: [
      { label: 'XP Leaderboard', to: '/leaderboard' },
      { label: 'Activity Feed',  to: '/activity' },
      { label: 'My Profile',     to: '/profile' },
    ]},
    { group: 'Built on', items: [
      { label: 'Sui Foundation',  href: 'https://sui.io',         ext: true },
      { label: 'Walrus Protocol', href: 'https://walrus.xyz',     ext: true },
      { label: 'Mysten Labs',     href: 'https://mystenlabs.com', ext: true },
      { label: 'DeepSurge',       href: 'https://deepsurge.xyz',  ext: true },
    ]},
  ]},
]

/* ── Identity Pill ── */
function IdentityPill({ auth, onOpen }: {
  auth: ReturnType<typeof useAuthState>
  onOpen: () => void
}) {
  const { wallet, google, linkedGoogleForWallet, linkedWalletForGoogle,
          isLinked, displayName, displayAvatar } = auth

  const effectiveGoogle = google ?? linkedGoogleForWallet
  const effectiveWallet = wallet ?? linkedWalletForGoogle
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <button className={s.pill} onClick={onOpen} aria-label="Account menu">
      {/* Avatar */}
      {displayAvatar
        ? <img src={displayAvatar} alt={displayName} className={s.pillAvatar}/>
        : <span className={s.pillInitials}>{initials || '?'}</span>
      }

      {/* Name */}
      <span className={s.pillName}>{displayName}</span>

      {/* Linked badge */}
      {isLinked && (
        <span className={s.pillLinked} title="Wallet + Google linked">
          <LinkIcon/>
        </span>
      )}

      <span className={s.pillChevron}><ChevronDown/></span>
    </button>
  )
}

/* ── Account Dropdown ── */
function AccountDropdown({ auth, onClose }: {
  auth: ReturnType<typeof useAuthState>
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { wallet, google, linkedGoogleForWallet, linkedWalletForGoogle,
          isLinked, displayName, displayAvatar, signOutGoogle, removeLink } = auth

  const effectiveGoogle = google ?? linkedGoogleForWallet
  const effectiveWallet = wallet ?? linkedWalletForGoogle
  const initials = displayName.slice(0, 2).toUpperCase()

  const [copied, setCopied] = useState(false)
  const copy = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const goProfile = () => { navigate('/profile'); onClose() }

  return (
    <div className={s.dropdown}>
      {/* Header */}
      <div className={s.dropHead}>
        {displayAvatar
          ? <img src={displayAvatar} alt={displayName} className={s.dropAvatar}/>
          : <span className={s.dropInitials}>{initials || '?'}</span>
        }
        <div className={s.dropHeadInfo}>
          <span className={s.dropName}>{displayName}</span>
          {effectiveGoogle && <span className={s.dropEmail}>{effectiveGoogle.email}</span>}
        </div>
        {isLinked && (
          <span className={s.dropLinkedBadge} title="Accounts linked">
            <LinkIcon/> Linked
          </span>
        )}
      </div>

      {/* Google account row */}
      {/* Google row: show email if known, show sign-in if not actively signed in */}
      <div className={`${s.dropRow} ${!auth.google && !effectiveGoogle ? s.dropRowAction : ''}`}
        onClick={!auth.google && !effectiveGoogle ? () => { navigate('/zklogin'); onClose() } : undefined}>
        <span className={s.dropRowIcon}><GoogleIcon/></span>
        <div className={s.dropRowInfo}>
          <span className={s.dropRowLabel}>
            {effectiveGoogle ? 'Google · zkLogin' : 'Google · not connected'}
          </span>
          {effectiveGoogle
            ? <span className={s.dropRowVal}>{effectiveGoogle.email}</span>
            : <span className={s.dropRowLink}>Sign in with Google →</span>
          }
        </div>
        {effectiveGoogle && <span className={s.dropRowDot}/>}
      </div>

      {/* Wallet row */}
      {/* Wallet row: show address if known, ALWAYS show ConnectButton if not actively connected */}
      <div className={s.dropRow}>
        <span className={s.dropRowIcon}><WalletIcon/></span>
        <div className={s.dropRowInfo}>
          <span className={s.dropRowLabel}>
            {effectiveWallet
              ? `Sui Wallet${isLinked ? ' · linked to Google' : ''}`
              : 'Sui Wallet · not connected'}
          </span>
          {effectiveWallet && (
            <button className={s.addrBtn} onClick={() => copy(effectiveWallet)}>
              <span className={s.dropRowVal}>
                {effectiveWallet.slice(0,8)}…{effectiveWallet.slice(-6)}
              </span>
              <span className={s.copyHint}>{copied ? '✓' : 'Copy'}</span>
            </button>
          )}
          {/* Always show ConnectButton when wallet not actively connected */}
          {!auth.wallet && (
            <div className={s.dropConnectWrap}><ConnectButton/></div>
          )}
        </div>
        {effectiveWallet && <span className={s.dropRowDot}/>}
      </div>

      <div className={s.dropDivider}/>

      {/* Actions */}
      <button className={s.dropAction} onClick={goProfile}>My Profile</button>
      {isLinked && (
        <button className={`${s.dropAction} ${s.dropActionMuted}`} onClick={() => { removeLink(); onClose() }}>
          Unlink accounts
        </button>
      )}
      {google && (
        <button className={`${s.dropAction} ${s.dropActionDanger}`}
          onClick={() => { signOutGoogle(); onClose() }}>
          Sign out of Google
        </button>
      )}
    </div>
  )
}

/* ── Main Navbar ── */
export default function Navbar() {
  const location   = useLocation()
  const auth       = useAuthState()
  const [open,     setOpen]    = useState<string | null>(null)
  const [mobile,   setMobile]  = useState(false)
  const [acctOpen, setAcctOpen]= useState(false)
  const [scrolled, setScrolled]= useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSignedIn = !!(auth.wallet || auth.google)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setOpen(null); setMobile(false); setAcctOpen(false) }, [location.pathname])
  useEffect(() => { document.body.style.overflow = mobile ? 'hidden' : '' }, [mobile])

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAcctOpen(false)
      }
    }
    if (acctOpen) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [acctOpen])

  const openNav  = (l: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(l) }
  const closeNav = () => { closeTimer.current = setTimeout(() => setOpen(null), 120) }
  const keepNav  = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }

  return (
    <>
      <div className={s.rainbow}/>
      <header className={`${s.nav} ${scrolled ? s.scrolled : ''}`}>
        <div className={s.inner}>

          {/* Logo */}
          <Link to="/" className={s.logo} aria-label="Tuskr home">
            <span className={s.logoText}>tuskr</span>
          </Link>

          {/* Desktop nav links */}
          <nav className={s.links} aria-label="Main">
            {NAV.map(item => (
              <div key={item.label} className={s.item}
                onMouseEnter={() => openNav(item.label)} onMouseLeave={closeNav}>
                <button
                  className={`${s.navBtn} ${open === item.label ? s.navBtnActive : ''}`}
                  aria-expanded={open === item.label}
                >
                  {item.label}
                  <span className={`${s.chevron} ${open === item.label ? s.chevronOpen : ''}`}>
                    <ChevronDown/>
                  </span>
                </button>

                {open === item.label && (
                  <div className={s.megaDrop} onMouseEnter={keepNav} onMouseLeave={closeNav}>
                    <div className={s.dropGrid}
                      style={{ gridTemplateColumns: `repeat(${item.cols.length},1fr)` }}>
                      {item.cols.map(col => (
                        <div key={col.group} className={s.dropCol}>
                          <div className={s.dropGroup}>{col.group}</div>
                          {col.items.map(link =>
                            'href' in link ? (
                              <a key={link.label} href={link.href} target="_blank"
                                rel="noopener noreferrer" className={s.dropLink}>
                                <span>{link.label}</span>
                                <span className={s.extIcon}><Arrow size={8}/></span>
                              </a>
                            ) : (
                              <Link key={link.label} to={link.to!} className={s.dropLink}>
                                {link.label}
                              </Link>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side */}
          <div className={s.right}>
            {isSignedIn ? (
              /* Signed in: one pill for everything */
              <div className={s.pillWrap} ref={dropRef}>
                <IdentityPill auth={auth} onOpen={() => setAcctOpen(v => !v)}/>
                {acctOpen && (
                  <AccountDropdown auth={auth} onClose={() => setAcctOpen(false)}/>
                )}
              </div>
            ) : (
              /* Not signed in: show both options */
              <div className={s.authOptions}>
                <Link to="/zklogin" className={s.googleSignIn}>
                  <GoogleIcon/>
                  <span className={s.googleSignInLabel}>Sign in</span>
                </Link>
                <ConnectButton/>
              </div>
            )}

            {/* Hamburger */}
            <button
              className={`${s.menuBtn} ${mobile ? s.menuBtnOpen : ''}`}
              onClick={() => setMobile(v => !v)}
              aria-label={mobile ? 'Close menu' : 'Open menu'}
            >
              <span className={s.menuIcon}>
                <span className={`${s.bar} ${mobile ? s.barTop : ''}`}/>
                <span className={`${s.bar} ${mobile ? s.barMid : ''}`}/>
                <span className={`${s.bar} ${mobile ? s.barBot : ''}`}/>
              </span>
              {mobile ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobile && (
          <div className={s.mobile}>
            <div className={s.mobileScroll}>

              {/* Identity card */}
              {isSignedIn ? (
                <div className={s.mobileIdCard}>
                  <div className={s.mobileIdHeader}>
                    {auth.displayAvatar
                      ? <img src={auth.displayAvatar} alt="" className={s.mobileIdAvatar}/>
                      : <span className={s.mobileIdInitials}>
                          {auth.displayName.slice(0,2).toUpperCase()}
                        </span>
                    }
                    <div>
                      <div className={s.mobileIdName}>{auth.displayName}</div>
                      {auth.google && <div className={s.mobileIdEmail}>{auth.google.email}</div>}
                    </div>
                    {auth.isLinked && (
                      <span className={s.mobileLinkedBadge}><LinkIcon/> Linked</span>
                    )}
                  </div>

                  {/* Wallet */}
                  {(auth.wallet ?? auth.linkedWalletForGoogle) && (
                    <div className={s.mobileAddrRow}>
                      <WalletIcon/>
                      <span className={s.mobileAddr}>
                        {((auth.wallet ?? auth.linkedWalletForGoogle) as string).slice(0,10)}…
                        {((auth.wallet ?? auth.linkedWalletForGoogle) as string).slice(-6)}
                      </span>
                    </div>
                  )}

                  {/* Link prompts */}
                  {!auth.google && !auth.linkedGoogleForWallet && (
                    <Link to="/zklogin" className={s.mobileLinkBtn}
                      onClick={() => setMobile(false)}>
                      <GoogleIcon/> Link Google account
                    </Link>
                  )}
                  {!auth.wallet && !auth.linkedWalletForGoogle && (
                    <div className={s.mobileLinkConnect}><ConnectButton/></div>
                  )}

                  {/* Actions */}
                  <div className={s.mobileIdActions}>
                    <Link to="/profile" className={s.mobileActionBtn}
                      onClick={() => setMobile(false)}>
                      My Profile
                    </Link>
                    {auth.google && (
                      <button className={`${s.mobileActionBtn} ${s.mobileActionDanger}`}
                        onClick={() => { auth.signOutGoogle(); setMobile(false) }}>
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={s.mobileAuthCard}>
                  <p className={s.mobileAuthTitle}>Sign in to Tuskr</p>
                  <Link to="/zklogin" className={s.mobileGoogleBtn}
                    onClick={() => setMobile(false)}>
                    <GoogleIcon/> Sign in with Google
                  </Link>
                  <div className={s.mobileConnectWrap}><ConnectButton/></div>
                </div>
              )}

              {/* Quick links */}
              <div className={s.mobileQuick}>
                <Link to="/mint"        className={s.mobileQuickBtn} onClick={() => setMobile(false)}>Mint NFT</Link>
                <Link to="/mint/ai"     className={s.mobileQuickBtn} onClick={() => setMobile(false)}>AI Generator</Link>
                <Link to="/marketplace" className={`${s.mobileQuickBtn} ${s.mobileQuickPrimary}`} onClick={() => setMobile(false)}>Explore</Link>
              </div>

              {/* Full nav */}
              {NAV.map(section => (
                <div key={section.label} className={s.mobileSection}>
                  <div className={s.mobileSectionTitle}>{section.label}</div>
                  {section.cols.map(col => (
                    <div key={col.group} className={s.mobileGroup}>
                      <div className={s.mobileGroupLabel}>{col.group}</div>
                      {col.items.map(link =>
                        'href' in link ? (
                          <a key={link.label} href={link.href} target="_blank"
                            rel="noopener noreferrer" className={s.mobileLink}
                            onClick={() => setMobile(false)}>
                            {link.label} <span className={s.mobileLinkArrow}>↗</span>
                          </a>
                        ) : (
                          <Link key={link.label} to={link.to!} className={s.mobileLink}
                            onClick={() => setMobile(false)}>
                            {link.label}
                          </Link>
                        )
                      )}
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
