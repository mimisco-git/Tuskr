import { useRef, useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ConnectButton } from '@mysten/dapp-kit'
import s from './Navbar.module.css'

/* ── Icons ── */
function Arrow({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" fill="none" aria-hidden>
      <path d="M9 0H0V1H9V0Z" fill="currentColor"/>
      <path d="M8.3 0L0 8.3L0.7 9L9 0.7L8.3 0Z" fill="currentColor"/>
      <path d="M9 0H8V9H9V0Z" fill="currentColor"/>
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden>
      <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

/* ── Google user state ── */
interface GoogleUser {
  email: string
  name: string
  picture: string
  address: string
}

function useGoogleUser() {
  const [user, setUser] = useState<GoogleUser | null>(null)

  const refresh = useCallback(() => {
    const address = localStorage.getItem('zklogin_address')
    const email   = localStorage.getItem('zklogin_email')
    const token   = localStorage.getItem('zklogin_id_token')

    if (address && email) {
      let picture = ''
      let name = email.split('@')[0]
      try {
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          picture = payload.picture || ''
          name    = payload.name    || name
        }
      } catch {}
      setUser({ email, name, picture, address })
    } else {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [refresh])

  const signOut = useCallback(() => {
    ['zklogin_address','zklogin_email','zklogin_id_token','zklogin_nonce'].forEach(
      k => localStorage.removeItem(k)
    )
    setUser(null)
    window.dispatchEvent(new Event('storage'))
  }, [])

  return { user, signOut, refresh }
}

/* ── Nav data ── */
const NAV = [
  {
    label: 'Explore',
    cols: [
      { group: 'Marketplace', items: [
        { label: 'Browse NFTs',        to: '/marketplace' },
        { label: 'Collections',        to: '/collections' },
        { label: 'Live Auctions',      to: '/auction' },
        { label: 'Activity Feed',      to: '/activity' },
        { label: 'Watchlist',          to: '/watchlist' },
      ]},
      { group: 'Earn', items: [
        { label: 'XP Leaderboard',    to: '/leaderboard' },
        { label: 'Creator Dashboard', to: '/dashboard' },
        { label: 'My NFTs',           to: '/profile' },
      ]},
    ],
  },
  {
    label: 'Create',
    cols: [
      { group: 'Mint', items: [
        { label: 'Mint an NFT',    to: '/mint' },
        { label: 'AI Generator',   to: '/mint/ai' },
        { label: 'Batch Mint',     to: '/mint/batch' },
        { label: 'List for Sale',  to: '/list' },
      ]},
      { group: 'Technology', items: [
        { label: 'Walrus Storage', href: 'https://docs.wal.app',                ext: true },
        { label: 'Walrus Seal',    href: 'https://docs.wal.app/walrus-seal',    ext: true },
        { label: 'Sui Blockchain', href: 'https://docs.sui.io',                 ext: true },
        { label: 'GitHub',         href: 'https://github.com/mimisco-git/Tuskr',ext: true },
      ]},
    ],
  },
  {
    label: 'Community',
    cols: [
      { group: 'Tuskr', items: [
        { label: 'XP Leaderboard', to: '/leaderboard' },
        { label: 'Activity Feed',  to: '/activity' },
        { label: 'My Profile',     to: '/profile' },
      ]},
      { group: 'Built on', items: [
        { label: 'Sui Foundation',  href: 'https://sui.io',        ext: true },
        { label: 'Walrus Protocol', href: 'https://walrus.xyz',     ext: true },
        { label: 'Mysten Labs',     href: 'https://mystenlabs.com', ext: true },
        { label: 'DeepSurge',       href: 'https://deepsurge.xyz',  ext: true },
      ]},
    ],
  },
]

/* ── Google profile pill ── */
function GooglePill({ user, signOut }: { user: GoogleUser; signOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const initials = user.name.slice(0, 2).toUpperCase()

  return (
    <div className={s.googlePill} ref={ref}>
      <button className={s.googlePillBtn} onClick={() => setOpen(v => !v)}>
        {user.picture
          ? <img src={user.picture} alt={user.name} className={s.googleAvatar}/>
          : <span className={s.googleInitials}>{initials}</span>
        }
        <span className={s.googlePillName}>{user.name.split(' ')[0]}</span>
        <span className={`${s.googlePillChevron} ${open ? s.googlePillChevronOpen : ''}`}>
          <ChevronDown/>
        </span>
      </button>

      {open && (
        <div className={s.googleDropdown}>
          {/* Profile header */}
          <div className={s.googleDropHeader}>
            {user.picture
              ? <img src={user.picture} alt={user.name} className={s.googleDropAvatar}/>
              : <span className={s.googleDropInitials}>{initials}</span>
            }
            <div>
              <div className={s.googleDropName}>{user.name}</div>
              <div className={s.googleDropEmail}>{user.email}</div>
            </div>
          </div>

          {/* Sui address */}
          <div className={s.googleDropAddr}>
            <span className={s.googleDropAddrLabel}>Sui address (zkLogin)</span>
            <span className={s.googleDropAddrVal}>
              {user.address.slice(0, 10)}…{user.address.slice(-6)}
            </span>
          </div>

          <div className={s.googleDropDivider}/>

          {/* Actions */}
          <button className={s.googleDropAction} onClick={() => { navigate('/profile'); setOpen(false) }}>
            My Profile
          </button>
          <button className={s.googleDropAction} onClick={() => { signOut(); setOpen(false) }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Main Navbar ── */
export default function Navbar() {
  const location  = useLocation()
  const [open,    setOpen]    = useState<string | null>(null)
  const [mobile,  setMobile]  = useState(false)
  const [scrolled,setScrolled]= useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user, signOut } = useGoogleUser()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setOpen(null); setMobile(false) }, [location.pathname])
  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobile])

  const openMenu  = (label: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(label) }
  const closeMenu = () => { closeTimer.current = setTimeout(() => setOpen(null), 120) }
  const keepOpen  = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }

  return (
    <>
      <div className={s.rainbow}/>
      <header className={`${s.nav} ${scrolled ? s.scrolled : ''}`}>
        <div className={s.inner}>

          {/* Logo */}
          <Link to="/" className={s.logo} aria-label="tuskr home">
            <span className={s.logoText}>tuskr</span>
          </Link>

          {/* Desktop nav */}
          <nav className={s.links} aria-label="Main">
            {NAV.map(item => (
              <div key={item.label} className={s.item}
                onMouseEnter={() => openMenu(item.label)} onMouseLeave={closeMenu}>
                <button className={`${s.navBtn} ${open === item.label ? s.navBtnActive : ''}`}
                  aria-expanded={open === item.label}>
                  {item.label}
                  <span className={`${s.chevron} ${open === item.label ? s.chevronOpen : ''}`}>
                    <ChevronDown/>
                  </span>
                </button>

                {open === item.label && (
                  <div className={s.dropdown} onMouseEnter={keepOpen} onMouseLeave={closeMenu}>
                    <div className={s.dropGrid}
                      style={{ gridTemplateColumns: `repeat(${item.cols.length}, 1fr)` }}>
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
                                <span>{link.label}</span>
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

          {/* Right */}
          <div className={s.right}>
            {user
              ? <GooglePill user={user} signOut={signOut}/>
              : (
                <Link to="/zklogin" className={s.zkBtn} title="Sign in with Google">
                  <GoogleIcon/>
                  <span className={s.zkBtnLabel}>Sign in</span>
                </Link>
              )
            }
            {/* ConnectButton always in normal flow — never inside a positioned overlay */}
            <div className={s.walletWrap}>
              <ConnectButton/>
            </div>
            <button
              className={`${s.menuBtn} ${mobile ? s.menuBtnOpen : ''}`}
              onClick={() => setMobile(v => !v)}
              aria-label={mobile ? 'Close menu' : 'Open menu'}
              aria-expanded={mobile}
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

              {/* Google user section in mobile menu */}
              {user ? (
                <div className={s.mobileUserSection}>
                  <div className={s.mobileUserHeader}>
                    {user.picture
                      ? <img src={user.picture} alt={user.name} className={s.mobileUserAvatar}/>
                      : <span className={s.mobileUserInitials}>{user.name.slice(0,2).toUpperCase()}</span>
                    }
                    <div>
                      <div className={s.mobileUserName}>{user.name}</div>
                      <div className={s.mobileUserEmail}>{user.email}</div>
                    </div>
                  </div>
                  <div className={s.mobileUserAddr}>
                    {user.address.slice(0, 12)}…{user.address.slice(-6)}
                  </div>
                  <div className={s.mobileWalletRow}>
                    <span className={s.mobileWalletLabel}>Link Sui wallet:</span>
                    <div className={s.mobileConnectBtn}><ConnectButton/></div>
                  </div>
                  <button className={s.mobileSignOut} onClick={() => { signOut(); setMobile(false) }}>
                    Sign out
                  </button>
                </div>
              ) : (
                <Link to="/zklogin" className={s.mobileGoogleBtn} onClick={() => setMobile(false)}>
                  <GoogleIcon/>
                  Sign in with Google
                </Link>
              )}

              {/* Quick actions */}
              <div className={s.mobileQuick}>
                <Link to="/mint"        className={s.mobileQuickBtn} onClick={() => setMobile(false)}>Mint NFT</Link>
                <Link to="/mint/ai"     className={s.mobileQuickBtn} onClick={() => setMobile(false)}>AI Generator</Link>
                <Link to="/marketplace" className={`${s.mobileQuickBtn} ${s.mobileQuickPrimary}`} onClick={() => setMobile(false)}>Browse NFTs</Link>
              </div>

              {NAV.map(section => (
                <div key={section.label} className={s.mobileSection}>
                  <div className={s.mobileSectionTitle}>{section.label}</div>
                  {section.cols.map(col => (
                    <div key={col.group} className={s.mobileGroup}>
                      <div className={s.mobileGroupLabel}>{col.group}</div>
                      {col.items.map(link =>
                        'href' in link ? (
                          <a key={link.label} href={link.href} target="_blank"
                            rel="noopener noreferrer" className={s.mobileLink} onClick={() => setMobile(false)}>
                            {link.label}<span className={s.mobileLinkArrow}>↗</span>
                          </a>
                        ) : (
                          <Link key={link.label} to={link.to!} className={s.mobileLink} onClick={() => setMobile(false)}>
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
