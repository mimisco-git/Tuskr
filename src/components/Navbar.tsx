import { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@mysten/dapp-kit'
import s from './Navbar.module.css'

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

const NAV = [
  {
    label: 'Explore',
    cols: [
      {
        group: 'Marketplace',
        items: [
          { label: 'Browse NFTs',        to: '/marketplace' },
          { label: 'Collections',        to: '/collections' },
          { label: 'Live Auctions',      to: '/auction' },
          { label: 'Activity Feed',      to: '/activity' },
          { label: 'Watchlist',          to: '/watchlist' },
        ],
      },
      {
        group: 'Earn',
        items: [
          { label: 'XP Leaderboard',    to: '/leaderboard' },
          { label: 'Creator Dashboard', to: '/dashboard' },
          { label: 'My NFTs',           to: '/profile' },
        ],
      },
    ],
  },
  {
    label: 'Create',
    cols: [
      {
        group: 'Mint',
        items: [
          { label: 'Mint an NFT',    to: '/mint' },
          { label: 'AI Generator',   to: '/mint/ai' },
          { label: 'Batch Mint',     to: '/mint/batch' },
          { label: 'List for Sale',  to: '/list' },
        ],
      },
      {
        group: 'Technology',
        items: [
          { label: 'Walrus Storage', href: 'https://docs.wal.app',               ext: true },
          { label: 'Walrus Seal',    href: 'https://docs.wal.app/walrus-seal',    ext: true },
          { label: 'Sui Blockchain', href: 'https://docs.sui.io',                 ext: true },
          { label: 'GitHub',         href: 'https://github.com/mimisco-git/Tuskr',ext: true },
        ],
      },
    ],
  },
  {
    label: 'Community',
    cols: [
      {
        group: 'Tuskr',
        items: [
          { label: 'XP Leaderboard', to: '/leaderboard' },
          { label: 'Activity Feed',  to: '/activity' },
          { label: 'My Profile',     to: '/profile' },
        ],
      },
      {
        group: 'Built on',
        items: [
          { label: 'Sui Foundation',  href: 'https://sui.io',          ext: true },
          { label: 'Walrus Protocol', href: 'https://walrus.xyz',       ext: true },
          { label: 'Mysten Labs',     href: 'https://mystenlabs.com',   ext: true },
          { label: 'DeepSurge',       href: 'https://deepsurge.xyz',    ext: true },
        ],
      },
    ],
  },
]

export default function Navbar() {
  const location = useLocation()
  const [open,    setOpen]    = useState<string | null>(null)
  const [mobile,  setMobile]  = useState(false)
  const [scrolled,setScrolled]= useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    setOpen(null)
    setMobile(false)
  }, [location.pathname])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobile])

  const openMenu  = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(label)
  }
  const closeMenu = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }
  const keepOpen  = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

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
              <div
                key={item.label}
                className={s.item}
                onMouseEnter={() => openMenu(item.label)}
                onMouseLeave={closeMenu}
              >
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
                  <div
                    className={s.dropdown}
                    onMouseEnter={keepOpen}
                    onMouseLeave={closeMenu}
                  >
                    <div
                      className={s.dropGrid}
                      style={{ gridTemplateColumns: `repeat(${item.cols.length}, 1fr)` }}
                    >
                      {item.cols.map(col => (
                        <div key={col.group} className={s.dropCol}>
                          <div className={s.dropGroup}>{col.group}</div>
                          {col.items.map(link =>
                            'href' in link ? (
                              <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.dropLink}
                              >
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

        {/* ═══ MOBILE MENU ═══
          Flat layout — all links visible immediately.
          No sub-navigation: cleaner UX on small screens.
          Sections grouped with labels, no extra clicks needed.
        */}
        {mobile && (
          <div className={s.mobile}>
            <div className={s.mobileScroll}>

              {/* Quick actions at top */}
              <div className={s.mobileQuick}>
                <Link to="/mint"        className={s.mobileQuickBtn} onClick={() => setMobile(false)}>Mint NFT</Link>
                <Link to="/mint/ai"     className={s.mobileQuickBtn} onClick={() => setMobile(false)}>AI Generator</Link>
                <Link to="/marketplace" className={`${s.mobileQuickBtn} ${s.mobileQuickPrimary}`} onClick={() => setMobile(false)}>Browse NFTs</Link>
              </div>

              {/* All nav sections flat */}
              {NAV.map(section => (
                <div key={section.label} className={s.mobileSection}>
                  <div className={s.mobileSectionTitle}>{section.label}</div>
                  {section.cols.map(col => (
                    <div key={col.group} className={s.mobileGroup}>
                      <div className={s.mobileGroupLabel}>{col.group}</div>
                      {col.items.map(link =>
                        'href' in link ? (
                          <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.mobileLink}
                            onClick={() => setMobile(false)}
                          >
                            {link.label}
                            <span className={s.mobileLinkArrow}>↗</span>
                          </a>
                        ) : (
                          <Link
                            key={link.label}
                            to={link.to!}
                            className={s.mobileLink}
                            onClick={() => setMobile(false)}
                          >
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
