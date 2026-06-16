import LiveTicker from '../components/LiveTicker'
import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
import { useDeepBookPrice, suiToUsd } from '../hooks/useDeepBookPrice'
import { useFloorPrice } from '../hooks/useFloorPrice'
import { useDeepBookSwap } from '../hooks/useDeepBookSwap'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useToast } from '../components/Toast'
import { useNetwork } from '../hooks/useNetwork'
import { fetchSuiCollections, fetchTrendingCollections, type TPCollection, type TPTrending } from '../hooks/useTradeport'
import NFTImage from '../components/NFTImage'
import s from './Marketplace.module.css'
import usePageTitle from '../hooks/usePageTitle'

type Tab = 'trending' | 'explore' | 'tuskr' | 'listed'

function fmt(n: number | null, d = 2) {
  if (n == null || n === 0) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: d })
}

function walrusUrl(blobId: string, network: string) {
  const agg = network === 'mainnet'
    ? 'https://aggregator.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space'
  return `${agg}/v1/blobs/${blobId}`
}

export default function Marketplace() {
  usePageTitle('Marketplace')
  const { network } = useNetwork()
  const PACKAGE_ID  = network.packageId
  const account     = useCurrentAccount()
  const client      = useSuiClient()
  const { error: toastErr } = useToast()
  const { buyNFT } = useNFTMarketplace()

  const [tab,          setTab]         = useState<Tab>('trending')
  const [collections,  setCollections]  = useState<TPCollection[]>([])
  const [trending,     setTrending]     = useState<TPTrending[]>([])
  const [tuskrNfts,    setTuskrNfts]    = useState<any[]>([])
  const [listings,     setListings]     = useState<any[]>([])
  const [loadingCols,  setLoadingCols]  = useState(true)
  const [loadingTuskr, setLoadingTuskr] = useState(false)
  const [loadingList,  setLoadingList]  = useState(false)
  const [buying,       setBuying]       = useState<string|null>(null)
  const [usdcModal,    setUsdcModal]    = useState<any>(null)  // listing for USDC modal
  const [usdcErr,     setUsdcErr]     = useState<string | null>(null)
  const { getQuote, swapAndBuy, quote, quoting, swapping, coinLabel } = useDeepBookSwap()
  const { price: suiPrice, source: priceSource } = useDeepBookPrice()
  const { floorSui, floorUsd, count: activeCount, totalVolumeSui } = useFloorPrice()
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'volume'|'floor'>('volume')

  /* ── Buy with USDC via DeepBook ── */
  const handleBuyWithUsdc = async (l: any) => {
    if (!account) { toastErr('Connect your wallet first'); return }
    setUsdcModal(l)
    setUsdcErr(null)
    await getQuote(Number(l.price) / 1e9)
  }

  const confirmUsdcBuy = async () => {
    if (!usdcModal) return
    setUsdcErr(null)
    try {
      await swapAndBuy(usdcModal.listingId, BigInt(usdcModal.price), quote?.usdcNeeded ?? 0)
      setListings(prev => prev.filter((x: any) => x.listingId !== usdcModal.listingId))
      setUsdcModal(null)
      setUsdcErr(null)
      setTimeout(() => loadListings(), 3000)
      toastErr(`Bought with ${coinLabel}! NFT is now yours.`)
    } catch (e: any) {
      const msg = e?.message || 'Swap failed'
      setUsdcErr(msg)
    }
  }

  /* ── Buy an NFT ── */
  const handleBuy = async (l: any) => {
    if (!account) { toastErr('Connect your wallet first'); return }
    if (buying) return
    setBuying(l.listingId)
    try {
      await buyNFT(l.listingId, BigInt(l.price))

      // Remove immediately from local state for instant UI feedback
      setListings(prev => prev.filter((x: any) => x.listingId !== l.listingId))
      // Re-fetch from chain after 3s so sold NFT is gone on next load too
      setTimeout(() => loadListings(), 3000)
      toastErr(`✅ Bought! "${l.name}" is now yours.`)
    } catch (e: any) {
      toastErr(e?.message?.slice(0,120) || 'Purchase failed')
    } finally {
      setBuying(null)
    }
  }

  useEffect(() => {
    fetchSuiCollections(60).then(setCollections).catch(console.error).finally(() => setLoadingCols(false))
    fetchTrendingCollections(12).then(setTrending).catch(() => {})
  }, [])

  // Trigger data loading when tab changes
  useEffect(() => {
    if (tab === 'tuskr')  loadTuskrNfts()
    if (tab === 'listed') loadListings()
  }, [tab, network.name])

  /* ── Load Tuskr minted NFTs ── */
  const loadTuskrNfts = useCallback(async () => {
    setLoadingTuskr(true)
    try {
      // Query both current and previous package IDs to show all minted NFTs
      const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
      const pkgs = PACKAGE_ID === OLD_PKG ? [PACKAGE_ID] : [PACKAGE_ID, OLD_PKG]

      const allEventResults = await Promise.all(
        pkgs.map(pkg =>
          client.queryEvents({
            query: { MoveEventType: `${pkg}::tuskr_nft::MintedEvent` },
            limit: 50,
          }).catch(() => ({ data: [] }))
        )
      )
      const events = { data: allEventResults.flatMap(r => r.data) }

      if (!events.data.length) { setTuskrNfts([]); return }

      // Collect all NFT IDs from events (including those without blob_id)
      const allIds = (events.data as any[])
        .map((e: any) => e.parsedJson?.nft_id || e.parsedJson?.id)
        .filter(Boolean)

      if (!allIds.length) { setTuskrNfts([]); return }

      // Fetch all NFT objects with content + display
      const objs = await client.multiGetObjects({
        ids: allIds,
        options: { showContent: true, showDisplay: true },
      }).catch(() => [])

      const parsed = (objs as any[])
        .filter(o => o.data)
        .map(o => {
          // content.fields is MoveStruct — can be direct map OR { fields: {...}, type: "..." }
          const content = o.data.content ?? {}
          const raw = content.fields ?? {}
          // Handle both MoveStruct variants
          const f = (raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields))
            ? raw.fields
            : raw

          const d      = o.data.display?.data ?? {}

          // blob_id is a plain String — reliable
          const blobId = (f.blob_id ?? d.blob_id ?? '').toString()

          // media_url is Url type: could be string, { url: "..." }, or { fields: { url: "..." }, type: "..." }
          const rawUrl = f.media_url ?? f.mediaUrl ?? ''
          let urlStr = ''
          if (typeof rawUrl === 'string') {
            urlStr = rawUrl
          } else if (rawUrl?.url) {
            urlStr = rawUrl.url
          } else if (rawUrl?.fields?.url) {
            urlStr = rawUrl.fields.url
          } else if (typeof rawUrl === 'object' && rawUrl !== null) {
            // Last resort: grab first string value
            urlStr = Object.values(rawUrl).find(v => typeof v === 'string' && v.startsWith('http')) as string || ''
          }

          // If media_url contains a Walrus URL but blob_id is empty, extract blob_id from URL
          let effectiveBlobId = blobId
          if (!effectiveBlobId && urlStr.includes('walrus') && urlStr.includes('/blobs/')) {
            effectiveBlobId = urlStr.split('/blobs/').pop()?.split('?')[0] || ''
          }

          // Build final mediaUrl with priority order
          const mediaUrl = effectiveBlobId
            ? walrusUrl(effectiveBlobId, network.name)   // Always prefer Walrus blob
            : (d.image_url || urlStr || '')               // Fallback to Display or raw URL


          return {
            objectId: o.data.objectId,
            name:     f.name || d.name || 'Tuskr NFT',
            blobId:   effectiveBlobId,
            mediaUrl,
          }
        })

      // Show all NFTs — NFTImage handles expired blobs with gradient fallback
      setTuskrNfts(parsed)
    } catch (err) {
      console.error('loadTuskrNfts:', err)
      setTuskrNfts([])
    } finally {
      setLoadingTuskr(false)
    }
  }, [PACKAGE_ID, network.name])

  /* ── Load marketplace listings via direct RPC endpoint ── */
  const loadListings = useCallback(async () => {
    setLoadingList(true)
    try {
      const net = network.name
      const res = await fetch(`/api/tuskr-nfts?type=listings&network=${net}`)
      const { activeIds } = await res.json()


      if (!activeIds.length) { setListings([]); return }

      // Fetch Listing objects from chain
      const objs = await client.multiGetObjects({
        ids: activeIds,
        options: { showContent: true },
      }).catch(() => [])

      const parsed = (objs as any[])
        .filter(o => o.data && !o.error)
        .map(o => {
          const f = o.data.content?.fields ?? {}
          return {
            listingId: o.data.objectId,
            nftId:     f.nft_id?.id || f.nft_id || '',
            price:     Number(f.price ?? 0),
            seller:    f.seller || '',
            name:      f.name   || 'Tuskr NFT',
          }
        })
        .filter(l => l.seller)


      // Fetch NFT images for each listing using nft_id
      const nftIds = parsed.map((l: any) => l.nftId).filter(Boolean)
      if (nftIds.length) {
        const nftObjs = await client.multiGetObjects({
          ids: nftIds,
          options: { showContent: true, showDisplay: true },
        }).catch(() => [])

        const nftMap: Record<string, string> = {}
        ;(nftObjs as any[]).filter(o => o.data).forEach(o => {
          const f      = o.data.content?.fields ?? {}
          const d      = o.data.display?.data   ?? {}
          const blobId = f.blob_id || d.blob_id || ''
          const rawUrl = f.media_url
          const urlStr = typeof rawUrl === 'string' ? rawUrl : (rawUrl?.url ?? '')
          const img    = blobId ? walrusUrl(blobId, network.name) : (d.image_url || urlStr || '')
          if (img) nftMap[o.data.objectId] = img
        })

        const withImages = parsed.map((l: any) => ({
          ...l,
          mediaUrl: nftMap[l.nftId] || '',
        }))
        setListings(withImages)
      } else {
        setListings(parsed)
      }
    } catch (err) {
      console.error('loadListings:', err)
      setListings([])
    } finally {
      setLoadingList(false)
    }
  }, [PACKAGE_ID])

  /* ── Buy an NFT ── */

  const trendList = trending.length > 0
    ? trending.map(t => ({
        id: t.collection.id, slug: t.collection.slug,
        title: t.collection.title, img: t.collection.cover_url,
        floor: t.collection.floor, volume: t.current_volume,
        supply: t.collection.supply, verified: t.collection.verified,
        pct: t.previous_volume && t.previous_volume > 0
          ? Math.round(((t.current_volume ?? 0) - t.previous_volume) / t.previous_volume * 100) : null,
      }))
    : [...collections].sort((a,b) => (b.volume??0)-(a.volume??0)).slice(0,12)
        .map(c => ({ id:c.id, slug:c.slug, title:c.title, img:c.cover_url,
          floor:c.floor, volume:c.volume, supply:c.supply, verified:c.verified, pct:null }))

  const exploreCols = [...collections]
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortBy==='volume' ? (b.volume??0)-(a.volume??0) : (b.floor??0)-(a.floor??0))

  const myListings  = listings.filter(l => account && l.seller === account.address)
  const allListings = [...myListings, ...listings.filter(l => !account || l.seller !== account.address)]

  const Skel = ({ n=8 }: { n?: number }) => (
    <div className={s.skelList}>{[...Array(n)].map((_,i)=><div key={i} className={s.skelRow}/>)}</div>
  )

  return (
    <main className={s.page}>
      <LiveTicker/>
      <div className="container">

        <div className={s.header}>
          <div className={s.eyebrow}><div className={s.eyebrowDot}/>NFT Marketplace</div>
          <div className={s.headRow}>
            <div>
              <h1 className={s.title}>Sui NFTs</h1>
              <p className={s.sub}>Browse, collect and trade NFTs on Sui</p>
            </div>
            <Link to="/mint" className={s.mintBtn}>+ Mint NFT</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className={s.tabBar}>
          {([
            ['trending', '🔥 Trending'],
            ['explore',  `Explore Sui (${exploreCols.length})`],
            ['tuskr',    `Tuskr Minted (${tuskrNfts.length})`],
            ['listed',   `Listed for Sale (${listings.length})`],
          ] as [Tab,string][]).map(([k,l]) => (
            <button key={k} className={`${s.tab} ${tab===k?s.tabActive:''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── TRENDING ── */}
        {tab==='trending' && (
          <table className={s.table}>
            <thead><tr>
              <th className={s.thNum}>#</th>
              <th className={s.thName}>Collection</th>
              <th className={s.thNum}>Floor</th>
              <th className={s.thNum}>Volume</th>
              <th className={s.thNum}>Supply</th>
              <th className={s.thNum}>24h %</th>
            </tr></thead>
            <tbody>
              {trendList.map((item,i) => (
                <tr key={item.id} className={s.row}>
                  <td className={s.tdNum}>{i+1}</td>
                  <td className={s.tdName}>
                    <Link to={`/collections/${item.slug}`} className={s.colLink}>
                      <NFTImage src={item.img} alt={item.title} className={s.colThumb}/>
                      <span className={s.colTitle}>{item.title}</span>
                      {item.verified && <span className={s.tick}>✓</span>}
                    </Link>
                  </td>
                  <td className={s.tdNum}>{fmt(item.floor,2)} <span className={s.sui}>SUI</span></td>
                  <td className={s.tdNum}>{fmt(item.volume,0)} <span className={s.sui}>SUI</span></td>
                  <td className={s.tdNum}>{item.supply?.toLocaleString()??'—'}</td>
                  <td className={s.tdNum}>{item.pct!=null
                    ? <span className={item.pct>=0?s.up:s.down}>{item.pct>=0?'+':''}{item.pct}%</span>
                    : <span className={s.dim}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── EXPLORE ── */}
        {tab==='explore' && (
          <div>
            <div className={s.exploreControls}>
              <div className={s.searchWrap}>
                <svg className={s.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className={s.searchInput} placeholder="Search collections..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div className={s.sortBtns}>
                <button className={`${s.sortBtn} ${sortBy==='volume'?s.sortActive:''}`} onClick={()=>setSortBy('volume')}>Volume</button>
                <button className={`${s.sortBtn} ${sortBy==='floor'?s.sortActive:''}`} onClick={()=>setSortBy('floor')}>Floor</button>
              </div>
            </div>
            {loadingCols ? <Skel n={8}/> : (
              <table className={s.table}>
                <thead><tr>
                  <th className={s.thNum}>#</th>
                  <th className={s.thName}>Collection</th>
                  <th className={s.thNum}>Floor</th>
                  <th className={s.thNum}>Volume</th>
                  <th className={s.thNum}>Supply</th>
                  <th className={s.thNum}>Verified</th>
                </tr></thead>
                <tbody>
                  {exploreCols.map((col,i) => (
                    <tr key={col.id} className={s.row}>
                      <td className={s.tdNum}>{i+1}</td>
                      <td className={s.tdName}>
                        <Link to={`/collections/${col.slug}`} className={s.colLink}>
                          <NFTImage src={col.cover_url} alt={col.title} className={s.colThumb}/>
                          <span className={s.colTitle}>{col.title}</span>
                        </Link>
                      </td>
                      <td className={s.tdNum}>{fmt(col.floor,2)} <span className={s.sui}>SUI</span></td>
                      <td className={s.tdNum}>{fmt(col.volume,0)} <span className={s.sui}>SUI</span></td>
                      <td className={s.tdNum}><span className={s.dim}>{col.supply?.toLocaleString()??'—'}</span></td>
                      <td className={s.tdNum}>{col.verified?<span className={s.tick}>✓</span>:<span className={s.dim}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TUSKR MINTED ── */}
        {tab==='tuskr' && (
          loadingTuskr ? <Skel/> :
          tuskrNfts.length===0 ? (
            <div className={s.empty}>
              <p className={s.emptyIcon}>🎨</p>
              <p className={s.emptyTitle}>No Tuskr NFTs on {network.name} yet</p>
              <Link to="/mint" className="btn btn-primary">Be the first to mint</Link>
            </div>
          ) : (
            <div className={s.nftGrid}>
              {tuskrNfts.map(nft => (
                <Link key={nft.objectId} to={`/nft/${nft.objectId}`} className={s.nftCard}>
                  <div className={s.nftImg}>
                    <NFTImage src={nft.mediaUrl} alt={nft.name} style={{width:'100%',height:'100%'}}/>
                    {nft.blobId && <span className={s.walrusBadge}>WALRUS</span>}
                  </div>
                  <div className={s.nftBody}><p className={s.nftName}>{nft.name}</p></div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── LISTED FOR SALE ── */}
        {tab==='listed' && (
          loadingList ? <Skel/> :
          listings.length===0 ? (
            <div className={s.empty}>
              <p className={s.emptyIcon}>🏪</p>
              <p className={s.emptyTitle}>No active listings on {network.name}</p>
              <p className={s.emptySub}>Mint an NFT and list it for sale to get started.</p>
              <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
            </div>
          ) : (
            <div>
              {account && myListings.length > 0 && (
                <p style={{fontSize:13,color:'rgba(245,245,247,0.4)',marginBottom:12}}>
                  🟢 Your {myListings.length} listing{myListings.length>1?'s':''} shown first.
                </p>
              )}
              <table className={`${s.table} ${s.listedTable}`}>
                <thead><tr>
                  <th className={s.thName}>NFT</th>
                  <th className={s.thNum}>Price</th>
                  <th className={s.thNum}>Seller</th>
                  <th className={s.thNum}>Status</th>
                </tr></thead>
                <tbody>
                  {allListings.map((l:any) => (
                    <tr key={l.listingId} className={s.row}>
                      <td className={s.tdName}>
                        <div className={s.colLink}>
                          <NFTImage src={l.mediaUrl} alt={l.name} className={s.colThumb}/>
                          <span className={s.colTitle}>{l.name}</span>
                        </div>
                      </td>
                      <td className={s.tdNum}>
                        {(l.price/1_000_000_000).toFixed(3)} <span className={s.sui}>SUI</span>
                      </td>
                      <td className={s.tdNum}>
                        <span className={s.dim}>
                          {account?.address===l.seller ? '🟢 You' : `${l.seller.slice(0,6)}...${l.seller.slice(-4)}`}
                        </span>
                      </td>
                      <td className={s.tdNum}>
                        {account?.address===l.seller ? (
                          <span style={{color:'var(--a)',fontSize:12,fontWeight:700}}>Your listing</span>
                        ) : account ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <button
                              onClick={() => handleBuy(l)}
                              disabled={!!buying}
                              style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:700, background:'#00d4aa', color:'#000', border:'none', cursor:'pointer', opacity: buying===l.listingId ? 0.7 : 1 }}
                            >
                              {buying===l.listingId ? '...' : 'Buy SUI'}
                            </button>
                            <button
                              onClick={() => handleBuyWithUsdc(l)}
                              disabled={!!buying || swapping}
                              style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)', cursor:'pointer' }}
                            >
                              Buy USDC
                            </button>
                          </div>
                        ) : (
                          <span style={{fontSize:11,color:'rgba(245,245,247,0.35)'}}>Connect wallet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>
      {/* ── DeepBook USDC Buy Modal ── */}
      {usdcModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setUsdcModal(null)}>
          <div style={{ background:'#0d0f14', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'28px 24px', maxWidth:420, width:'100%' }} onClick={e => e.stopPropagation()}>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <span style={{ fontSize:24 }}>🔄</span>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Buy with USDC via DeepBook</div>
                <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)' }}>Powered by DeepBook V3. Sui's native order book.</div>
              </div>
            </div>

            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
              <div style={{ fontSize:13, color:'rgba(245,245,247,0.4)', marginBottom:12 }}>Transaction breakdown</div>
              {[
                { label:'NFT', value: usdcModal.name },
                { label:'NFT price', value: `${(usdcModal.price/1e9).toFixed(3)} SUI` },
                { label:'DeepBook quote', value: quoting ? 'Fetching...' : quote ? `≈ ${quote.usdcNeeded.toFixed(4)} ${coinLabel}` : '—' },
                { label:'Slippage tolerance', value: '0.5%' },
                { label:'Pool', value: 'SUI/DBUSDC · DeepBook V3' },
              ].map((r, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop: i>0?'1px solid rgba(255,255,255,0.05)':'none' }}>
                  <span style={{ fontSize:12, color:'rgba(245,245,247,0.4)' }}>{r.label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, marginBottom:20 }}>
              <span style={{ fontSize:14 }}>ℹ️</span>
              <span style={{ fontSize:12, color:'rgba(245,245,247,0.45)' }}>DeepBook swaps {coinLabel}→SUI then buys the NFT in one transaction block.</span>
            </div>

            {/* Error — shown inline in modal with actionable guide */}
            {usdcErr && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:8 }}>
                  <div style={{ fontSize:12, color:'#f87171', fontFamily:'Space Mono,monospace', marginBottom:6 }}>
                    {usdcErr.includes('No DBUSDC') || usdcErr.includes('Insufficient DBUSDC') || usdcErr.includes('No testnet')
                      ? `No ${coinLabel} in wallet`
                      : usdcErr.slice(0, 100)}
                  </div>
                  {(usdcErr.includes('No DBUSDC') || usdcErr.includes('Insufficient') || usdcErr.includes('No testnet')) && (
                    <div>
                      <div style={{ fontSize:12, color:'rgba(245,245,247,0.5)', marginBottom:8, lineHeight:1.5 }}>
                        You need {coinLabel} to use this feature. Get some first:
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <a href="/swap" onClick={() => setUsdcModal(null)}
                          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'rgba(0,212,170,0.08)', border:'1px solid rgba(0,212,170,0.2)', textDecoration:'none' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'#00d4aa' }}>Swap SUI → {coinLabel} on Tuskr</div>
                            <div style={{ fontSize:11, color:'rgba(245,245,247,0.35)' }}>Use the Swap page — swap your SUI for {coinLabel}</div>
                          </div>
                          <span style={{ color:'#00d4aa', fontSize:14 }}>→</span>
                        </a>
                        <a href="https://deepbook.mystenlabs.com" target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', textDecoration:'none' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'rgba(245,245,247,0.7)' }}>DeepBook Testnet UI ↗</div>
                            <div style={{ fontSize:11, color:'rgba(245,245,247,0.35)' }}>Mint free testnet {coinLabel} directly</div>
                          </div>
                          <span style={{ color:'rgba(245,245,247,0.4)', fontSize:14 }}>↗</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setUsdcModal(null); setUsdcErr(null) }} style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(245,245,247,0.6)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmUsdcBuy} disabled={swapping || quoting || !quote} style={{ flex:2, padding:'12px', borderRadius:10, background: swapping ? 'rgba(99,102,241,0.3)' : '#6366f1', color:'#fff', fontSize:14, fontWeight:700, border:'none', cursor: swapping?'not-allowed':'pointer' }}>
                {swapping ? 'Swapping on DeepBook...' : quoting ? 'Getting quote...' : `Confirm: Pay ${quote ? quote.usdcNeeded.toFixed(3) : '...'} ${coinLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
