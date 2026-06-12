import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useWatchlist } from '../hooks/useWatchlist'
import { useToast } from '../components/Toast'
import s from './NFTDetail.module.css'
import { scoreFromName } from '../lib/rarity'
import usePageTitle from '../hooks/usePageTitle'

interface NFTData {
  id:          string
  name:        string
  description: string
  image:       string
  blobId:      string
  creator:     string
  royaltyBps:  number
  price:       string
  listed:      boolean
}

const PRICE_HISTORY = [
  { date:'Day 1', price:0 },
  { date:'Day 2', price:0 },
  { date:'Day 3', price:0 },
  { date:'Now',   price:0 },
]

const CustomTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px' }}>
      <p style={{ fontFamily:'Inter,sans-serif', fontSize:16, fontWeight:700, color:'#00d4aa' }}>{payload[0].value} SUI</p>
    </div>
  )
}

export default function NFTDetail() {
  usePageTitle('NFT Details')
  const { id } = useParams<{ id: string }>()
  const account  = useCurrentAccount()
  const client   = useSuiClient()
  const { buyNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { isWatched, toggleWatch } = useWatchlist()
  const { success, error: toastErr, info } = useToast()

  const [nft,       setNft]       = useState<NFTData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [buying,    setBuying]    = useState(false)
  const [showOffer, setShowOffer] = useState(false)
  const [offerAmt,  setOfferAmt]  = useState('')

  useEffect(() => {
    if (!id) return
    loadNFT(id)
  }, [id])

  const loadNFT = async (objectId: string) => {
    setLoading(true)
    try {
      const obj = await client.getObject({
        id: objectId,
        options: { showContent: true, showDisplay: true, showOwner: true },
      })

      if (!obj.data) { setNotFound(true); return }

      const fields  = (obj.data.content as any)?.fields ?? {}
      const display = (obj.data.display as any)?.data ?? {}

      setNft({
        id:         objectId,
        name:       fields.name        || display.name       || 'Tuskr NFT',
        description:fields.description || display.description || '',
        image:      display.image_url  || fields._media_url_resolved || '',
        blobId:     fields.blob_id     || '',
        creator:    fields.creator     || '',
        royaltyBps: Number(fields.royalty_bps ?? 0),
        price:      '0',
        listed:     false,
      })
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async () => {
    if (!account || !nft) return
    setBuying(true)
    try {
      const result = await buyNFT(nft.id, BigInt(Math.floor(+nft.price * 1e9)))
      success(`Bought ${nft.name}!`)
      if (account) awardXP(account.address, 'buy', `Bought: ${nft.name}`)
    } catch { toastErr('Purchase failed') }
    finally { setBuying(false) }
  }

  const watched = nft ? isWatched(nft.id) : false

  /* Loading */
  if (loading) return (
    <main className={s.page}><div className="container">
      <div className={s.layout}>
        <div className="skeleton" style={{ aspectRatio:'1', borderRadius:24 }}/>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="skeleton" style={{ height:40, borderRadius:8 }}/>
          <div className="skeleton" style={{ height:120, borderRadius:8 }}/>
          <div className="skeleton" style={{ height:56, borderRadius:99 }}/>
        </div>
      </div>
    </div></main>
  )

  /* Not found */
  if (notFound || !nft) return (
    <main className={s.page}><div className="container" style={{ textAlign:'center', padding:'80px 0' }}>
      <p style={{ fontFamily:'Inter,sans-serif', fontSize:22, color:'rgba(255,255,255,0.4)', marginBottom:20 }}>NFT not found.</p>
      <Link to="/marketplace" className="btn btn-outline">Back to marketplace</Link>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className="container">

        <div className={s.topRow}>
          <Link to="/marketplace" className={s.back}>← Marketplace</Link>
          <button
            className={`${s.watchBtn} ${watched ? s.watchActive : ''}`}
            onClick={() => toggleWatch({
              id: nft.id, name: nft.name, image: nft.image,
              price: nft.price, currency:'SUI', creator: nft.creator,
              listed: nft.listed, blobId: nft.blobId,
            })}
          >
            {watched ? '♥ Watching' : '♡ Watch'}
          </button>
        </div>

        <div className={s.layout}>
          {/* Left: image */}
          <div className={s.imgCol}>
            <div className={s.imgWrap}>
              {nft.image ? (
                <img src={nft.image} alt={nft.name} className={s.img}/>
              ) : (
                <div className={s.imgPlaceholder}>
                  <span>{nft.name.slice(0,2).toUpperCase()}</span>
                </div>
              )}
              {nft.blobId && (
                <div className={s.walrusBadge}>
                  <span className={s.walrusDot}/>
                  WALRUS
                </div>
              )}
            </div>

            {/* Blob info */}
            {nft.blobId && (
              <div className={s.blobCard}>
                <div className={s.blobLabelRow}>
                  <div className={s.blobLabel}>Walrus Blob ID</div>
                  <a
                    href={`/verify/${nft.blobId}`}
                    className={s.blobVerifyLink}
                  >
                    Verify on Walrus ↗
                  </a>
                </div>
                <div className={s.blobId}>{nft.blobId}</div>
                <div className={s.blobSub}>Permanently stored on Walrus decentralized storage. Click to verify.</div>
              </div>
            )}
          </div>

          {/* Right: info */}
          <div className={s.infoCol}>
            <div className={s.creator}>by {nft.creator ? `${nft.creator.slice(0,10)}…${nft.creator.slice(-6)}` : 'Unknown'}</div>
            <h1 className={s.name}>{nft.name}</h1>

            {nft.description && (
              <p className={s.desc}>{nft.description}</p>
            )}

            {/* Price card */}
            <div className={s.priceCard}>
              <div className={s.priceLabel}>Price</div>
              {nft.listed ? (
                <>
                  <div className={s.price}>
                    {nft.price} <span className={s.priceCur}>SUI</span>
                  </div>
                  <div className={s.buyRow}>
                    <button className="btn btn-primary btn-lg" onClick={handleBuy} disabled={buying || !account}>
                      {buying ? 'Buying…' : 'Buy now'}
                    </button>
                    <button className="btn btn-ghost btn-lg" onClick={() => setShowOffer(true)}>
                      Make offer
                    </button>
                  </div>
                </>
              ) : (
                <div className={s.notListed}>
                  <span className={s.notListedText}>Not listed for sale</span>
                  {account?.address === nft.creator && (
                    <Link to="/list" className="btn btn-ghost btn-sm" style={{ marginTop:12 }}>
                      List this NFT
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Properties */}
            {/* Rarity score */}
            {(() => {
              const r = scoreFromName(nft?.name ?? '', nft?.description ?? '')
              return (
                <div className={s.rarityCard} style={{ borderColor: r.color + '33', background: r.color + '08' }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color: r.color, marginBottom:6 }}>Rarity Score</div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontFamily:'Inter,sans-serif', fontSize:32, fontWeight:800, color: r.color, letterSpacing:'-0.03em', lineHeight:1 }}>{r.score}</div>
                    <div>
                      <div style={{ fontFamily:'Inter,sans-serif', fontSize:16, fontWeight:700, color:'#f5f5f7' }}>{r.tier}</div>
                      <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(245,245,247,0.35)' }}>out of 100</div>
                    </div>
                    <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden', marginLeft:8 }}>
                      <div style={{ width:`${r.score}%`, height:'100%', background: r.color, borderRadius:3, transition:'width 0.6s ease' }}/>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className={s.section}>
              <div className={s.sectionTitle}>Properties</div>
              <div className={s.traitsGrid}>
                <div className={s.trait}>
                  <div className={s.traitType}>Object ID</div>
                  <div className={s.traitVal}>{nft.id.slice(0,10)}…</div>
                </div>
                {nft.royaltyBps > 0 && (
                  <div className={s.trait}>
                    <div className={s.traitType}>Royalty</div>
                    <div className={s.traitVal}>{nft.royaltyBps / 100}%</div>
                  </div>
                )}
                <div className={s.trait}>
                  <div className={s.traitType}>Storage</div>
                  <div className={s.traitVal}>Walrus</div>
                </div>
                <div className={s.trait}>
                  <div className={s.traitType}>Chain</div>
                  <div className={s.traitVal}>Sui</div>
                </div>
              </div>
            </div>

            {/* Price chart */}
            <div className={s.section}>
              <div className={s.sectionTitle}>Price History</div>
              <div className={s.chartWrap}>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={PRICE_HISTORY}>
                    <XAxis dataKey="date" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'Space Mono,monospace' }} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip content={<CustomTip/>}/>
                    <Line type="monotone" dataKey="price" stroke="#00d4aa" strokeWidth={2} dot={{ fill:'#00d4aa', r:3 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Explorer link */}
            <a
              href={`https://suiexplorer.com/object/${nft.id}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ width:'fit-content' }}
            >
              View on Sui Explorer ↗
            </a>
          </div>
        </div>
      </div>

      {/* Offer modal */}
      {showOffer && (
        <div className={s.offerModal} onClick={() => setShowOffer(false)}>
          <div className={s.offerBox} onClick={e => e.stopPropagation()}>
            <h3 className={s.offerTitle}>Make an offer</h3>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', marginBottom:20 }}>
              Offer for <strong style={{ color:'#fff' }}>{nft.name}</strong>
            </p>
            <div className="field">
              <label className="field-label">Offer amount (SUI)</label>
              <input
                className="input"
                type="number"
                placeholder="0.0"
                value={offerAmt}
                onChange={e => setOfferAmt(e.target.value)}
                step="0.1"
                min="0"
              />
            </div>
            <div className={s.offerRow}>
              <button className="btn btn-ghost" onClick={() => setShowOffer(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!account) return toastErr('Connect wallet first')
                  awardXP(account.address, 'offer', `Offer on ${nft.name}`)
                  success(`Offer of ${offerAmt} SUI submitted!`)
                  setShowOffer(false)
                  setOfferAmt('')
                }}
              >
                Submit offer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
