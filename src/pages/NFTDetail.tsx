import { useBlobProof }    from '../hooks/useBlobProof'
import { useWalrusProvenance } from '../hooks/useWalrusProvenance'
import { useDeepBookPrice }    from '../hooks/useDeepBookPrice'
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useNetwork } from '../hooks/useNetwork'
import { useSeal }            from '../hooks/useSeal'
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
  sealedBlobId?: string
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
  const { network }  = useNetwork()
  const { encrypt: sealEncrypt, decrypt: sealDecrypt } = useSeal()
  const { buyNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { isWatched, toggleWatch } = useWatchlist()
  const { success, error: toastErr, info } = useToast()

  const [nft,       setNft]       = useState<NFTData | null>(null)
  const blobProof      = useBlobProof(nft?.blobId || undefined)
  const { trail: provTrail, blobId: provBlobId } = useWalrusProvenance(nft?.id)
  const { price: suiPrice }   = useDeepBookPrice()
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [buying,    setBuying]    = useState(false)
  const [showOffer,    setShowOffer]    = useState(false)
  const [sealedBlobId, setSealedBlobId] = useState('')
  const [nftOwner,     setNftOwner]     = useState('')
  const [sealContent,  setSealContent]  = useState<string|null>(null)
  const [sealLoading,  setSealLoading]  = useState(false)
  const [sealError,    setSealError]    = useState('')
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

      // Get the actual current owner of the NFT object
      const ownerData = (obj.data as any)?.owner
      const currentOwner =
        ownerData?.AddressOwner ||
        ownerData?.ObjectOwner  ||
        ownerData?.addressOwner ||
        ''
      setNftOwner(currentOwner)
      setSealedBlobId(fields.sealed_blob_id || '')
      // Check if this NFT is currently listed for sale
      let listingPrice = '0'
      let isListed     = false
      let listingId    = ''
      try {
        const listRes = await fetch('/api/tuskr-nfts?type=listings&network=testnet')
        const listData = await listRes.json()
        const activeIds: string[] = listData.activeIds || []

        if (activeIds.length > 0) {
          // Fetch listing objects to find one containing this NFT
          const listObjs = await (client as any).multiGetObjects({
            ids: activeIds.slice(0, 50),
            options: { showContent: true },
          }).catch(() => [])
          const match = (listObjs as any[]).find((o: any) => {
            const f = o?.data?.content?.fields
            return f?.nft_id === objectId || f?.nft?.fields?.id?.id === objectId
          })
          if (match) {
            const f = match.data.content.fields
            isListed     = true
            listingPrice = String(Number(f.price ?? 0) / 1e9)
            listingId    = match.data.objectId
          }
        }
      } catch { /* listing check optional */ }

      setNft({
        id:         objectId,
        name:       fields.name        || display.name       || 'Tuskr NFT',
        description:fields.description || display.description || '',
        image:      display.image_url  || fields._media_url_resolved || '',
        blobId:     fields.blob_id     || '',
        sealedBlobId: fields.sealed_blob_id || '',
        creator:    fields.creator     || '',
        royaltyBps: Number(fields.royalty_bps ?? 0),
        price:      listingPrice,
        listed:     isListed,
      })
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  /* ── Seal decrypt ── */
  const handleSealUnlock = async () => {
    if (!account || !nft || !sealedBlobId) return
    setSealLoading(true)
    setSealError('')
    try {
      const pkg   = network.packageId
      const net   = network.name
      const agg   = net === 'mainnet'
        ? 'https://aggregator.walrus.space'
        : 'https://aggregator.walrus-testnet.walrus.space'

      // 1. Fetch encrypted bytes from Walrus
      const res = await fetch(`/api/img?url=${encodeURIComponent(`${agg}/v1/blobs/${sealedBlobId}`)}`)
      if (!res.ok) throw new Error('Could not fetch encrypted blob from Walrus')
      const encBuf = await res.arrayBuffer()
      const encBytes = new Uint8Array(encBuf)

      // 2. Decrypt with Seal — user will be prompted to sign in wallet
      const decrypted = await sealDecrypt(encBytes, nft.creator, pkg, nft.id)
      if (!decrypted) throw new Error('Decryption returned empty')

      // 3. Show decrypted content (text for now)
      const text = new TextDecoder().decode(decrypted)
      setSealContent(text)
    } catch (e: any) {
      setSealError(e?.message || 'Decryption failed')
    } finally {
      setSealLoading(false)
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

            {/* Seal encrypted content */}
            {sealedBlobId && (
              <div style={{
                background: 'rgba(168,85,247,0.06)',
                border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: 14, padding: '18px 20px', marginBottom: 16,
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>🔐</span>
                      <span style={{ fontSize:13, fontWeight:700, color:'#a855f7', fontFamily:'Space Mono, monospace', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                        Seal Encrypted
                      </span>
                    </div>
                    <p style={{ fontSize:13, color:'rgba(245,245,247,0.5)', margin:0 }}>
                      Private content secured with Seal threshold encryption.
                      {(account?.address === nft.creator || account?.address === nftOwner)
                        ? ' You own this NFT. Unlock to reveal.'
                        : ' Only the NFT owner can unlock this.'}
                    </p>
                  </div>
                  {(account?.address === nft.creator || account?.address === nftOwner) && !sealContent && (
                    <button
                      onClick={handleSealUnlock}
                      disabled={sealLoading}
                      style={{
                        padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                        background: sealLoading ? 'rgba(168,85,247,0.3)' : '#a855f7',
                        color: '#fff', border: 'none', cursor: sealLoading ? 'not-allowed' : 'pointer',
                        transition: 'background 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {sealLoading ? '🔓 Unlocking...' : '🔓 Unlock with Seal'}
                    </button>
                  )}
                </div>
                {sealError && (
                  <p style={{ color:'#f87171', fontSize:13, marginTop:10, margin:'10px 0 0' }}>
                    ⚠ {sealError}
                  </p>
                )}
                {sealContent && (
                  <div style={{ marginTop:14, padding:'14px 16px', background:'rgba(0,0,0,0.3)', borderRadius:10 }}>
                    <p style={{ fontSize:11, fontFamily:'Space Mono, monospace', color:'#a855f7', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>
                      🔓 Decrypted Content
                    </p>
                    <p style={{ fontSize:14, color:'#f5f5f7', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap' }}>
                      {sealContent}
                    </p>
                  </div>
                )}
              </div>
            )}

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

      {/* ── WALRUS STORAGE PROOF ───────────────────────────────────── */}
      {nft?.blobId && (
        <div style={{ maxWidth:780, margin:'0 auto 24px', padding:'0 20px' }}>
          <div style={{
            background:'rgba(255,255,255,0.02)',
            border:`1px solid ${blobProof?.status === 'verified' ? 'rgba(0,212,170,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:16, padding:'20px 22px',
          }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="#00d4aa" strokeWidth="1.2"/><path d="M5 4V3a3 3 0 016 0v1" stroke="#00d4aa" strokeWidth="1.2"/><path d="M8 8v2m0-2a1 1 0 100-2 1 1 0 000 2z" stroke="#00d4aa" strokeWidth="1.2"/></svg>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Walrus Storage Proof</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', display:'inline-block', background: blobProof?.status === 'verified' ? '#00d4aa' : blobProof?.status === 'checking' ? '#f59e0b' : '#f87171', boxShadow: blobProof?.status === 'verified' ? '0 0 6px #00d4aa' : 'none' }}/>
                <span style={{ fontSize:11, fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.1em', color: blobProof?.status === 'verified' ? '#00d4aa' : 'rgba(245,245,247,0.4)' }}>
                  {blobProof?.status === 'checking' ? 'Verifying...' : blobProof?.status === 'verified' ? 'Live on Walrus' : blobProof?.status === 'unavailable' ? 'Unavailable' : 'Checking...'}
                </span>
              </div>
            </div>

            {/* Blob details grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                { label:'Blob ID', value: nft.blobId ? `${nft.blobId.slice(0,14)}...${nft.blobId.slice(-8)}` : '—' },
                { label:'File Size', value: blobProof?.size ? `${(blobProof.size / 1024).toFixed(1)} KB` : '—' },
                { label:'Content Type', value: blobProof?.contentType?.split(';')[0] || '—' },
                { label:'Storage', value: 'Permanent · 5 epochs' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'rgba(245,245,247,0.35)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:12, color:'rgba(245,245,247,0.8)', fontFamily:'Space Mono,monospace', wordBreak:'break-all' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Verify link */}
            <a
              href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${nft.blobId}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:'#00d4aa', textDecoration:'none', fontFamily:'Space Mono,monospace', display:'inline-flex', alignItems:'center', gap:6 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="#00d4aa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Retrieve directly from Walrus network
            </a>
          </div>
        </div>
      )}

      {/* ── NFT PROVENANCE TRAIL ─────────────────────────────────────── */}
      {provTrail.length > 0 && (
        <div style={{ maxWidth:780, margin:'0 auto 24px', padding:'0 20px' }}>
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8l3-3m10 0l-3-3M1 8l3 3m10 0l-3 3" stroke="rgba(245,245,247,0.5)" strokeWidth="1.2" strokeLinecap="round"/></svg>
              <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Ownership Provenance</span>
              {provBlobId && <span style={{ fontSize:10, color:'rgba(0,212,170,0.6)', fontFamily:'Space Mono,monospace', background:'rgba(0,212,170,0.08)', padding:'2px 8px', borderRadius:5 }}>On Walrus</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {provTrail.map((entry, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 12px', background:'rgba(0,0,0,0.15)', borderRadius:10 }}>
                  <div style={{ width:28, height:28, borderRadius:7, background: entry.event === 'mint' ? 'rgba(0,212,170,0.12)' : entry.event === 'sale' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13 }}>
                    {entry.event === 'mint' ? '✦' : entry.event === 'sale' ? '◈' : '→'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff', textTransform:'capitalize' }}>{entry.event}</div>
                    <div style={{ fontSize:11, color:'rgba(245,245,247,0.4)', fontFamily:'Space Mono,monospace', marginTop:2 }}>
                      {entry.from.slice(0,10)}...{entry.from.slice(-6)} → {entry.to.slice(0,10)}...{entry.to.slice(-6)}
                      {entry.price && ` · ${entry.price} SUI`}
                      {suiPrice && entry.price && ` · $${(parseFloat(entry.price) * suiPrice).toFixed(2)}`}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'rgba(245,245,247,0.25)', fontFamily:'Space Mono,monospace', flexShrink:0 }}>
                    {new Date(entry.ts).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
