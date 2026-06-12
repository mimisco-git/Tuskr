import LiveTicker from '../components/LiveTicker'
import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
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
  const [buying,       setBuying]       = useState<string|null>(null) // listingId being bought
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'volume'|'floor'>('volume')

  /* ── Buy an NFT ── */
  const handleBuy = async (l: any) => {
    if (!account) { toastErr('Connect your wallet first'); return }
    if (buying) return
    setBuying(l.listingId)
    try {
      await buyNFT(l.listingId, BigInt(l.price))
      setListings(prev => prev.filter((x: any) => x.listingId !== l.listingId))
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

          console.log(`[NFT] ${(f.name||'?').slice(0,20)} | blob=${effectiveBlobId.slice(0,12)||'none'} | url=${mediaUrl.slice(0,60)||'EMPTY'}`)

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

      console.log('[Listings] active:', activeIds?.length ?? 0)

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

      console.log('[Listings] parsed:', parsed.length)

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
              <table className={s.table}>
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
                          <button
                            onClick={() => handleBuy(l)}
                            disabled={!!buying}
                            style={{
                              padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:700,
                              background:'#00d4aa', color:'#000', border:'none', cursor:'pointer',
                              opacity: buying===l.listingId ? 0.7 : 1,
                              minWidth:70,
                            }}
                          >
                            {buying===l.listingId ? '...' : 'Buy'}
                          </button>
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
    </main>
  )
}
