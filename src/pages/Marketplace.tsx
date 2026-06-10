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

export default function Marketplace() {
  usePageTitle('Marketplace')
  const { network } = useNetwork()
  const PACKAGE_ID  = network.packageId
  const account     = useCurrentAccount()
  const client      = useSuiClient()
  const { error: toastErr } = useToast()
  const { } = useNFTMarketplace()

  const [tab,          setTab]         = useState<Tab>('trending')
  const [collections,  setCollections]  = useState<TPCollection[]>([])
  const [trending,     setTrending]     = useState<TPTrending[]>([])
  const [tuskrNfts,    setTuskrNfts]    = useState<any[]>([])
  const [listings,     setListings]     = useState<any[]>([])
  const [loadingCols,  setLoadingCols]  = useState(true)
  const [loadingTuskr, setLoadingTuskr] = useState(false)
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'volume'|'floor'>('volume')

  useEffect(() => {
    fetchSuiCollections(60)
      .then(setCollections)
      .catch(console.error)
      .finally(() => setLoadingCols(false))

    fetchTrendingCollections(12)
      .then(setTrending)
      .catch(() => {})
  }, [])

  const loadTuskrNfts = useCallback(async () => {
    setLoadingTuskr(true)
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_nft::MintedEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))
      if (!events.data.length) { setTuskrNfts([]); return }
      const ids = events.data.map((e: any) => e.parsedJson?.nft_id || e.parsedJson?.id).filter(Boolean)
      if (!ids.length) { setTuskrNfts([]); return }
      const objs = await client.multiGetObjects({ ids, options: { showContent: true, showDisplay: true } })
      setTuskrNfts(objs.filter(o => o.data).map(o => {
        const f = (o.data?.content as any)?.fields ?? {}
        const d = (o.data?.display as any)?.data   ?? {}
        return { objectId: o.data!.objectId, name: f.name || d.name || 'Tuskr NFT',
          mediaUrl: f.media_url || d.image_url || '', blobId: f.blob_id || '' }
      }))
    } catch { setTuskrNfts([]) }
    finally  { setLoadingTuskr(false) }
  }, [PACKAGE_ID])

  const loadListings = useCallback(async () => {
    try {
      // Get all ListedEvent events to find listing IDs
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::ListedEvent` },
        limit: 100,
      }).catch(() => ({ data: [] }))

      if (!events.data.length) { setListings([]); return }

      // Get the listing object IDs from events
      const listingIds = events.data
        .map((e: any) => e.parsedJson?.listing_id)
        .filter(Boolean)

      if (!listingIds.length) { setListings([]); return }

      // Fetch actual listing objects from chain
      const objs = await client.multiGetObjects({
        ids: listingIds,
        options: { showContent: true, showDisplay: true },
      }).catch(() => [])

      const parsed = objs
        .filter((o: any) => o.data && !o.error)
        .map((o: any) => {
          const f = (o.data?.content as any)?.fields ?? {}
          return {
            listingId: o.data.objectId,
            nftId:     f.nft_id?.id || f.nft_id || '',
            price:     Number(f.price ?? 0),
            seller:    f.seller || '',
            name:      f.name || 'Tuskr NFT',
          }
        })

      setListings(parsed)
    } catch { setListings([]) }
  }, [PACKAGE_ID])

  useEffect(() => {
    if (tab === 'tuskr')  loadTuskrNfts()
    if (tab === 'listed') loadListings()
  }, [tab, network.name])

  /* Build display lists */
  const trendList = trending.length > 0
    ? trending.map(t => ({
        id: t.collection.id, slug: t.collection.slug,
        title: t.collection.title, img: t.collection.cover_url,
        floor: t.collection.floor, volume: t.current_volume,
        supply: t.collection.supply, verified: t.collection.verified,
        pct: t.previous_volume && t.previous_volume > 0
          ? Math.round(((t.current_volume ?? 0) - t.previous_volume) / t.previous_volume * 100)
          : null,
      }))
    : [...collections]
        .sort((a,b) => (b.volume ?? 0) - (a.volume ?? 0))
        .slice(0, 12)
        .map(c => ({ id: c.id, slug: c.slug, title: c.title, img: c.cover_url,
          floor: c.floor, volume: c.volume, supply: c.supply, verified: c.verified, pct: null }))

  const exploreCols = [...collections]
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortBy === 'volume'
      ? (b.volume ?? 0) - (a.volume ?? 0)
      : (b.floor ?? 0) - (a.floor ?? 0)
    )

  const Skel = ({ n = 8 }: { n?: number }) => (
    <div className={s.skelList}>{[...Array(n)].map((_,i)=><div key={i} className={s.skelRow}/>)}</div>
  )

  return (
    <main className={s.page}>
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

        {/* ── Tabs ── */}
        <div className={s.tabBar}>
          {([['trending','🔥 Trending'],['explore','Explore Sui'],['tuskr','Tuskr Minted'],['listed','Listed for Sale']] as [Tab,string][]).map(([k,l])=>(
            <button key={k} className={`${s.tab} ${tab===k?s.tabActive:''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── TRENDING ── */}
        {tab==='trending' && (
          <div>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.thNum}>#</th>
                  <th className={s.thName}>Collection</th>
                  <th className={s.thNum}>Floor</th>
                  <th className={s.thNum}>Volume</th>
                  <th className={s.thNum}>Supply</th>
                  <th className={s.thNum}>24h %</th>
                </tr>
              </thead>
              <tbody>
                {trendList.map((item, i) => (
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
                    <td className={s.tdNum}>{item.supply?.toLocaleString() ?? '—'}</td>
                    <td className={s.tdNum}>
                      {item.pct != null
                        ? <span className={item.pct>=0?s.up:s.down}>{item.pct>=0?'+':''}{item.pct}%</span>
                        : <span className={s.dim}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trendList.length===0 && !loadingCols && <div className={s.empty}><p className={s.emptyTitle}>Loading trending data...</p></div>}
          </div>
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
                <thead>
                  <tr>
                    <th className={s.thNum}>#</th>
                    <th className={s.thName}>Collection</th>
                    <th className={s.thNum}>Floor</th>
                    <th className={s.thNum}>Volume</th>
                    <th className={s.thNum}>Supply</th>
                    <th className={s.thNum}>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {exploreCols.map((col, i) => (
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
            {exploreCols.length===0 && !loadingCols && <div className={s.empty}><p>No collections found for "{search}"</p></div>}
          </div>
        )}

        {/* ── TUSKR MINTED ── */}
        {tab==='tuskr' && (
          loadingTuskr ? <Skel/> : tuskrNfts.length===0 ? (
            <div className={s.empty}>
              <p className={s.emptyIcon}>🎨</p>
              <p className={s.emptyTitle}>No Tuskr NFTs on {network.name} yet</p>
              <Link to="/mint" className="btn btn-primary">Be the first to mint</Link>
            </div>
          ) : (
            <div className={s.nftGrid}>
              {tuskrNfts.map(nft => (
                <Link key={nft.objectId} to={`/nft/${nft.objectId}`} className={s.nftCard}>
                  <div className={s.nftImg}><NFTImage src={nft.mediaUrl} alt={nft.name} style={{width:'100%',height:'100%'}}/>{nft.blobId&&<span className={s.walrusBadge}>WALRUS</span>}</div>
                  <div className={s.nftBody}><p className={s.nftName}>{nft.name}</p></div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── LISTED ── */}
        {tab==='listed' && (
          <div className={s.empty}>
            <p className={s.emptyIcon}>🏪</p>
            <p className={s.emptyTitle}>No listings on {network.name} yet</p>
            <p className={s.emptySub}>Mint and list an NFT to start the marketplace.</p>
            <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
          </div>
        )}

      </div>
    </main>
  )
}
