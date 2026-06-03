import { useEffect, useState, useCallback } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { SuiObjectData } from '@mysten/sui/client'
import { ConnectButton } from '@mysten/dapp-kit'
import s from './Profile.module.css'
import usePageTitle from '../hooks/usePageTitle'

interface ParsedNFT {
  objectId: string; name: string; description: string
  mediaUrl: string; blobId: string; creator: string; royaltyBps: number
}
interface GoogleUser { email: string; name: string; picture: string; address: string }

function parseNFT(obj: SuiObjectData): ParsedNFT {
  const f = (obj.content as any)?.fields ?? {}
  const d = (obj.display as any)?.data   ?? {}
  return {
    objectId: obj.objectId,
    name:     f.name        || d.name        || 'Tuskr NFT',
    description: f.description || d.description || '',
    mediaUrl: f.media_url   || d.image_url   || '',
    blobId:   f.blob_id     || '',
    creator:  f.creator     || '',
    royaltyBps: Number(f.royalty_bps ?? 0),
  }
}

function useGoogleUser(): GoogleUser | null {
  const [user, setUser] = useState<GoogleUser | null>(null)
  useEffect(() => {
    const read = () => {
      const address = localStorage.getItem('zklogin_address')
      const email   = localStorage.getItem('zklogin_email')
      const token   = localStorage.getItem('zklogin_id_token')
      if (!address || !email) { setUser(null); return }
      let picture = '', name = email.split('@')[0]
      try { if (token) { const p = JSON.parse(atob(token.split('.')[1])); picture = p.picture||''; name = p.name||name } } catch {}
      setUser({ email, name, picture, address })
    }
    read()
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])
  return user
}

function shortAddr(a: string) { return `${a.slice(0,8)}…${a.slice(-6)}` }

type Tab = 'owned' | 'listed' | 'sold'

function NFTCard({ nft, badge }: { nft: ParsedNFT; badge?: string }) {
  return (
    <Link to={`/nft/${nft.objectId}`} className={s.nftCard}>
      <div className={s.nftImg}>
        {nft.mediaUrl
          ? <img src={nft.mediaUrl} alt={nft.name} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
          : <div className={s.nftImgFallback}>{nft.name.slice(0,2).toUpperCase()}</div>
        }
        {badge && <span className={s.nftBadge}>{badge}</span>}
        {nft.blobId && <span className={s.walrusBadge}>WALRUS</span>}
      </div>
      <div className={s.nftBody}>
        <p className={s.nftName}>{nft.name}</p>
        {nft.royaltyBps > 0 && <span className={s.nftRoyalty}>{nft.royaltyBps/100}% royalty</span>}
      </div>
    </Link>
  )
}

function Empty({ msg, action }: { msg: string; action?: React.ReactNode }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>🎨</div>
      <p className={s.emptyMsg}>{msg}</p>
      {action}
    </div>
  )
}

const GoogleSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const WalletSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6z"/>
    <path d="M20 12h-6a2 2 0 1 0 0 4h6"/>
  </svg>
)

export default function Profile() {
  usePageTitle('My Profile')
  const account    = useCurrentAccount()
  const googleUser = useGoogleUser()
  const { fetchOwnedNFTs, fetchListedByUser, fetchSoldByUser } = useNFTMarketplace()
  const [tab,     setTab]    = useState<Tab>('owned')
  const [owned,   setOwned]  = useState<ParsedNFT[]>([])
  const [listed,  setListed] = useState<any[]>([])
  const [sold,    setSold]   = useState<any[]>([])
  const [loading, setLoad]   = useState(true)
  const [copied,  setCopied] = useState(false)

  const effectiveAddr = account?.address ?? googleUser?.address ?? null
  const bothLinked    = !!(account && googleUser)

  const load = useCallback(async () => {
    if (!effectiveAddr) { setLoad(false); return }
    setLoad(true)
    try {
      const [raw, lst, sld] = await Promise.all([
        fetchOwnedNFTs(effectiveAddr),
        fetchListedByUser(effectiveAddr),
        fetchSoldByUser(effectiveAddr),
      ])
      setOwned(raw.map(parseNFT)); setListed(lst); setSold(sld)
    } catch { setOwned([]); setListed([]); setSold([]) }
    finally { setLoad(false) }
  }, [effectiveAddr])

  useEffect(() => { load() }, [load])

  const doCopy = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(()=>{})
    setCopied(true); setTimeout(()=>setCopied(false), 1800)
  }

  if (!account && !googleUser) return (
    <main className={s.page}><div className="container">
      <div className={s.gateWrap}>
        <div className={s.gateIcon}>🎨</div>
        <h2 className={s.gateTitle}>Sign in to view your profile</h2>
        <p className={s.gateDesc}>Connect a Sui wallet or sign in with Google using zkLogin.</p>
        <div className={s.gateActions}>
          <ConnectButton/>
          <Link to="/zklogin" className="btn btn-outline">Sign in with Google</Link>
        </div>
      </div>
    </div></main>
  )

  const displayName = googleUser?.name ?? 'Wallet User'
  const initials    = displayName.slice(0,2).toUpperCase()

  return (
    <main className={s.page}>
      <div className={s.coverBg}/>
      <div className="container">

        {/* ── PROFILE HEADER ── */}
        <div className={s.header}>
          <div className={s.avatarWrap}>
            {googleUser?.picture
              ? <img src={googleUser.picture} alt={displayName} className={s.avatar}/>
              : <div className={s.avatarFallback}>{initials}</div>
            }
            {bothLinked && <span className={s.linkedBadge} title="Google + Wallet linked">⬡</span>}
          </div>

          <div className={s.headerInfo}>
            <h1 className={s.name}>{displayName}</h1>

            {/* Account rows */}
            <div className={s.accountList}>
              {/* Google row */}
              {googleUser ? (
                <div className={s.accountRow}>
                  <span className={s.accountIcon}><GoogleSvg/></span>
                  <div className={s.accountDetail}>
                    <span className={s.accountType}>Google · zkLogin</span>
                    <span className={s.accountVal}>{googleUser.email}</span>
                  </div>
                  <span className={s.connectedDot} title="Connected"/>
                </div>
              ) : (
                <div className={`${s.accountRow} ${s.accountRowDimmed}`}>
                  <span className={s.accountIcon}><GoogleSvg/></span>
                  <div className={s.accountDetail}>
                    <span className={s.accountType}>Google · not linked</span>
                    <Link to="/zklogin" className={s.linkBtn}>Sign in with Google →</Link>
                  </div>
                </div>
              )}

              {/* Wallet row */}
              {account ? (
                <div className={s.accountRow}>
                  <span className={s.accountIcon}><WalletSvg/></span>
                  <div className={s.accountDetail}>
                    <span className={s.accountType}>
                      Sui Wallet{googleUser ? ' · linked to Google' : ''}
                    </span>
                    <button className={s.addrBtn} onClick={()=>doCopy(account.address)}>
                      <span className={s.accountVal}>{shortAddr(account.address)}</span>
                      <span className={s.copyHint}>{copied ? '✓ Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <span className={s.connectedDot} title="Connected"/>
                </div>
              ) : (
                <div className={`${s.accountRow} ${s.accountRowDimmed}`}>
                  <span className={s.accountIcon}><WalletSvg/></span>
                  <div className={s.accountDetail}>
                    <span className={s.accountType}>Sui Wallet · not linked</span>
                    <div className={s.linkWalletInline}><ConnectButton/></div>
                  </div>
                </div>
              )}

              {/* zkLogin Sui address row */}
              {googleUser && (
                <div className={s.suiAddrRow}>
                  <span className={s.suiAddrLabel}>zkLogin Sui address</span>
                  <button className={s.addrBtn} onClick={()=>doCopy(googleUser.address)}>
                    <span className={s.suiAddrVal}>{shortAddr(googleUser.address)}</span>
                    <span className={s.copyHint}>{copied ? '✓ Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={s.headerActions}>
            <Link to="/mint" className="btn btn-primary">+ Mint NFT</Link>
            {owned.length > 0 && <Link to="/list" className="btn btn-outline">List for sale</Link>}
          </div>
        </div>

        {/* ── STATS ── */}
        <div className={s.statsRow}>
          {[
            { n: owned.length,  label: 'NFTs owned' },
            { n: listed.length, label: 'Listed for sale' },
            { n: sold.length,   label: 'Sold' },
            { n: bothLinked ? 2 : 1, label: 'Accounts linked' },
          ].map(({ n, label }) => (
            <div key={label} className={s.statCard}>
              <span className={s.statNum}>{n}</span>
              <span className={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className={s.tabBar}>
          {(['owned','listed','sold'] as Tab[]).map(t => (
            <button key={t} className={`${s.tabBtn} ${tab===t ? s.tabBtnActive : ''}`} onClick={()=>setTab(t)}>
              {t==='owned'  && `My NFTs (${owned.length})`}
              {t==='listed' && `Listed (${listed.length})`}
              {t==='sold'   && `Sold (${sold.length})`}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className={s.grid}>{[...Array(6)].map((_,i)=><div key={i} className={s.skelCard}/>)}</div>
        ) : (
          <>
            {tab==='owned'  && (owned.length===0
              ? <Empty msg="No NFTs owned yet." action={<Link to="/mint" className="btn btn-primary">Mint your first NFT</Link>}/>
              : <div className={s.grid}>{owned.map(n=><NFTCard key={n.objectId} nft={n}/>)}</div>
            )}
            {tab==='listed' && (listed.length===0
              ? <Empty msg="Nothing listed for sale yet." action={owned.length>0 ? <Link to="/list" className="btn btn-outline">List an NFT</Link> : undefined}/>
              : <div className={s.grid}>{owned.map(n=><NFTCard key={n.objectId} nft={n} badge="FOR SALE"/>)}</div>
            )}
            {tab==='sold' && (sold.length===0
              ? <Empty msg="No sales recorded yet."/>
              : <div className={s.activityList}>
                  {sold.map((e,i)=>(
                    <div key={i} className={s.activityRow}>
                      <span className={s.activityDot}/>
                      <span className={s.activityText}>NFT sold · {new Date(e.timestampMs??0).toLocaleDateString()}</span>
                      <span className={s.activityPrice}>{((e.parsedJson as any)?.price??0)/1e9} SUI</span>
                    </div>
                  ))}
                </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
