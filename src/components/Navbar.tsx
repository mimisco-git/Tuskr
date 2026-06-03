/**
 * Navbar — Clean, mobile-first, Walrus-inspired
 * Fixes: mobile connect buttons, network switcher with wallet prompt,
 * centered desktop nav, premium design
 */
import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ConnectButton,
  useCurrentAccount,
  useDisconnectWallet,
  useSwitchAccount,
} from '@mysten/dapp-kit'
import { useAuthState } from '../hooks/useAuthState'
import { useNetwork } from '../hooks/useNetwork'
import s from './Navbar.module.css'

/* Icons */
const Chevron = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const GoogleSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)
const WalletSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6z"/>
    <path d="M20 12h-6a2 2 0 1 0 0 4h6"/>
  </svg>
)
const ExternalSVG = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1 8L8 1M8 1H3M8 1V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* Nav data */
const NAV = [
  { label: 'Explore', items: [
    { label: 'Browse NFTs',    to: '/marketplace' },
    { label: 'Collections',   to: '/collections' },
    { label: 'Live Auctions', to: '/auction' },
    { label: 'Activity Feed', to: '/activity' },
    { label: 'Leaderboard',   to: '/leaderboard' },
  ]},
  { label: 'Create', items: [
    { label: 'Mint an NFT',   to: '/mint' },
    { label: 'AI Generator',  to: '/mint/ai' },
    { label: 'Batch Mint',    to: '/mint/batch' },
    { label: 'List for Sale', to: '/list' },
  ]},
  { label: 'Community', items: [
    { label: 'My Profile',      to: '/profile' },
    { label: 'Walrus Protocol', href: 'https://walrus.xyz' },
    { label: 'Sui Docs',        href: 'https://docs.sui.io' },
    { label: 'GitHub',          href: 'https://github.com/mimisco-git/Tuskr' },
  ]},
]

/* Network pill */
function NetPill() {
  const { network, setNetwork } = useNetwork()
  const isMain = network.name === 'mainnet'

  const toggle = () => {
    const next = isMain ? 'testnet' : 'mainnet'
    setNetwork(next)
    // Prompt user that wallet network may need to change
    if (window.confirm(
      `Switch to ${next}?\n\nYou may also need to switch your wallet to ${next} inside your wallet extension.`
    )) {
      // Network already switched via setNetwork above
    }
  }

  return (
    <button className={`${s.netPill} ${isMain ? s.netMain : s.netTest}`} onClick={toggle} title="Switch network">
      <span className={s.netDot}/>
      <span className={s.netName}>{isMain ? 'Mainnet' : 'Testnet'}</span>
    </button>
  )
}

/* Account dropdown */
function AccountDrop({ onClose }: { onClose: () => void }) {
  const auth  = useAuthState()
  const nav   = useNavigate()
  const { mutate: disconnect } = useDisconnectWallet()
  const [copied, setCopied] = useState(false)

  const effectiveGoogle = auth.google ?? auth.linkedGoogleForWallet
  const effectiveWallet = auth.wallet ?? auth.linkedWalletForGoogle
  const displayName = effectiveGoogle?.name
    ?? (auth.wallet ? `${auth.wallet.slice(0,6)}...${auth.wallet.slice(-4)}` : 'Account')
  const initials = displayName.slice(0,2).toUpperCase()

  const copy = (v: string) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const go = (to: string) => { nav(to); onClose() }

  return (
    <div className={s.drop}>
      {/* Header */}
      <div className={s.dropHead}>
        {effectiveGoogle?.picture
          ? <img src={effectiveGoogle.picture} className={s.dropAva} alt=""/>
          : <div className={s.dropIni}>{initials}</div>}
        <div className={s.dropHeadText}>
          <div className={s.dropName}>{displayName}</div>
          {effectiveGoogle && <div className={s.dropEmail}>{effectiveGoogle.email}</div>}
        </div>
      </div>
      <div className={s.dropDivider}/>

      {/* Google row */}
      <div className={s.dropRow}>
        <GoogleSVG/>
        <div className={s.dropRowBody}>
          <span className={s.dropRowLbl}>Google</span>
          {effectiveGoogle
            ? <span className={s.dropRowVal}>{effectiveGoogle.email}</span>
            : <button className={s.dropRowLink} onClick={() => go('/zklogin')}>Connect Google</button>}
        </div>
        {effectiveGoogle && <span className={s.greenDot}/>}
      </div>

      {/* Wallet row */}
      <div className={s.dropRow}>
        <WalletSVG/>
        <div className={s.dropRowBody}>
          <span className={s.dropRowLbl}>Sui Wallet</span>
          {effectiveWallet
            ? <button className={s.dropRowVal} onClick={() => copy(effectiveWallet)} style={{cursor:'pointer', background:'none', border:'none', padding:0, color:'inherit'}}>
                {effectiveWallet.slice(0,10)}...{effectiveWallet.slice(-6)}{' '}
                <span style={{color:'rgba(245,245,247,0.3)', fontSize:10}}>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            : <div className={s.dropConnectBtn}><ConnectButton/></div>}
        </div>
        {effectiveWallet && <span className={s.greenDot}/>}
      </div>

      <div className={s.dropDivider}/>
      <button className={s.dropAction} onClick={() => go('/profile')}>My Profile</button>
      <button className={s.dropAction} onClick={() => go('/mint')}>Mint NFT</button>
      <div className={s.dropDivider}/>
      {auth.wallet && (
        <button className={`${s.dropAction} ${s.dropActionRed}`}
          onClick={() => { disconnect(); onClose() }}>
          Disconnect Wallet
        </button>
      )}
      {auth.google && (
        <button className={`${s.dropAction} ${s.dropActionRed}`}
          onClick={() => { auth.signOutGoogle(); onClose() }}>
          Sign out of Google
        </button>
      )}
    </div>
  )
}

export default function Navbar() {
  const location = useLocation()
  const auth     = useAuthState()
  const wallet   = useCurrentAccount()

  const [openNav,  setOpenNav]  = useState<string|null>(null)
  const [openAcct, setOpenAcct] = useState(false)
  const [mobile,   setMobile]   = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const acctRef  = useRef<HTMLDivElement>(null)
  const navTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  const isSignedIn = !!(wallet || auth.google)
  const effectiveGoogle = auth.google ?? auth.linkedGoogleForWallet
  const effectiveWallet = auth.wallet ?? auth.linkedWalletForGoogle
  const displayName = effectiveGoogle?.name
    ?? (wallet ? `${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}` : '')
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
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobile])

  useEffect(() => {
    if (!openAcct) return
    const h = (e: MouseEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setOpenAcct(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openAcct])

  const over  = (l: string) => { if (navTimer.current) clearTimeout(navTimer.current); setOpenNav(l) }
  const out   = () => { navTimer.current = setTimeout(() => setOpenNav(null), 160) }
  const stay  = () => { if (navTimer.current) clearTimeout(navTimer.current) }

  return (
    <>
      <div className={s.rainbow}/>
      <header className={`${s.nav} ${scrolled ? s.scrolled : ''}`}>
        <div className={s.inner}>

          {/* Logo */}
          <Link to="/" className={s.logo}>tuskr</Link>

          {/* Desktop nav - centered */}
          <nav className={s.center} aria-label="Main navigation">
            {NAV.map(item => (
              <div key={item.label} className={s.navItem}
                onMouseEnter={() => over(item.label)} onMouseLeave={out}>
                <button className={`${s.navBtn} ${openNav===item.label ? s.navBtnOn : ''}`}>
                  {item.label}
                  <span className={`${s.chevWrap} ${openNav===item.label ? s.chevOn : ''}`}><Chevron/></span>
                </button>
                {openNav === item.label && (
                  <div className={s.mega} onMouseEnter={stay} onMouseLeave={out}>
                    {item.items.map(lnk => (
                      'href' in lnk
                        ? <a key={lnk.label} href={lnk.href} target="_blank" rel="noopener noreferrer" className={s.megaLink}>
                            {lnk.label}<ExternalSVG/>
                          </a>
                        : <Link key={lnk.label} to={lnk.to!} className={s.megaLink}>{lnk.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right */}
          <div className={s.right}>
            <NetPill/>
            {isSignedIn ? (
              <div ref={acctRef} className={s.acctWrap}>
                <button className={s.pill} onClick={() => setOpenAcct(v => !v)}>
                  {effectiveGoogle?.picture
                    ? <img src={effectiveGoogle.picture} className={s.pillAva} alt=""/>
                    : <div className={s.pillIni}>{initials||'?'}</div>}
                  <span className={s.pillName}>{displayName}</span>
                  <span className={`${s.pillChev} ${openAcct ? s.pillChevOn : ''}`}><Chevron/></span>
                </button>
                {openAcct && <AccountDrop onClose={() => setOpenAcct(false)}/>}
              </div>
            ) : (
              <div className={s.authBtns}>
                <Link to="/zklogin" className={s.googleBtn}><GoogleSVG/>Sign in</Link>
                <ConnectButton/>
              </div>
            )}

            {/* Hamburger */}
            <button className={`${s.burger} ${mobile ? s.burgerOn : ''}`}
              onClick={() => setMobile(v => !v)} aria-label="Menu">
              <span/><span/><span/>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobile && (
          <div className={s.drawer}>
            <div className={s.drawerBody}>

              {/* Network switcher in mobile */}
              <div className={s.mobileNet}>
                <NetPill/>
              </div>

              {/* Identity / auth */}
              {isSignedIn ? (
                <div className={s.idCard}>
                  <div className={s.idRow}>
                    {effectiveGoogle?.picture
                      ? <img src={effectiveGoogle.picture} className={s.idAva} alt=""/>
                      : <div className={s.idIni}>{initials||'?'}</div>}
                    <div className={s.idText}>
                      <div className={s.idName}>{displayName}</div>
                      {effectiveGoogle && <div className={s.idEmail}>{effectiveGoogle.email}</div>}
                    </div>
                  </div>
                  {effectiveWallet && (
                    <div className={s.idAddr}>{effectiveWallet.slice(0,12)}...{effectiveWallet.slice(-8)}</div>
                  )}
                  {/* Connect wallet if not connected */}
                  {!wallet && (
                    <div className={s.idConnect}><ConnectButton/></div>
                  )}
                  {/* Link google if not signed in */}
                  {!auth.google && !auth.linkedGoogleForWallet && (
                    <Link to="/zklogin" className={s.idGoogleLink} onClick={() => setMobile(false)}>
                      <GoogleSVG/> Connect Google account
                    </Link>
                  )}
                  <div className={s.idActions}>
                    <Link to="/profile" className={s.idBtn} onClick={() => setMobile(false)}>My Profile</Link>
                    {auth.google && (
                      <button className={`${s.idBtn} ${s.idBtnRed}`}
                        onClick={() => { auth.signOutGoogle(); setMobile(false) }}>
                        Sign out
                      </button>
                    )}
                    {wallet && <DisconnectMobile onDone={() => setMobile(false)}/>}
                  </div>
                </div>
              ) : (
                <div className={s.authCard}>
                  <p className={s.authCardTitle}>Connect to Tuskr</p>
                  <Link to="/zklogin" className={s.mobileGoogleBtn} onClick={() => setMobile(false)}>
                    <GoogleSVG/> Sign in with Google
                  </Link>
                  <div className={s.mobileWalletBtn}><ConnectButton/></div>
                </div>
              )}

              {/* Quick links */}
              <div className={s.quickRow}>
                <Link to="/marketplace" className={`${s.quickBtn} ${s.quickPrimary}`} onClick={() => setMobile(false)}>Explore NFTs</Link>
                <Link to="/mint/ai" className={s.quickBtn} onClick={() => setMobile(false)}>AI Generator</Link>
                <Link to="/mint"    className={s.quickBtn} onClick={() => setMobile(false)}>Mint</Link>
              </div>

              {/* Full nav links */}
              {NAV.map(section => (
                <div key={section.label} className={s.mobileSection}>
                  <div className={s.mobileSectionTitle}>{section.label}</div>
                  {section.items.map(lnk => (
                    'href' in lnk
                      ? <a key={lnk.label} href={lnk.href} target="_blank" rel="noopener noreferrer"
                          className={s.mobileLink} onClick={() => setMobile(false)}>
                          {lnk.label} <span className={s.ext}>↗</span>
                        </a>
                      : <Link key={lnk.label} to={lnk.to!} className={s.mobileLink}
                          onClick={() => setMobile(false)}>{lnk.label}</Link>
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

function DisconnectMobile({ onDone }: { onDone: () => void }) {
  const { mutate: disconnect } = useDisconnectWallet()
  return (
    <button className={`${s.idBtn} ${s.idBtnRed}`}
      onClick={() => { disconnect(); onDone() }}>
      Disconnect wallet
    </button>
  )
}
