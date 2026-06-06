import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useToast } from '../components/Toast'
import { Transaction } from '@mysten/sui/transactions'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useNetwork } from '../hooks/useNetwork'
import { fetchSuiCollections, fetchTrendingCollections, type TPCollection, type TPTrending } from '../hooks/useTradeport'
import NFTImage from '../components/NFTImage'
import s from './Marketplace.module.css'
import usePageTitle from '../hooks/usePageTitle'

type Tab = 'trending' | 'explore' | 'tuskr' | 'listed'

/* ── TradePort collection card ── */
function CollectionCard({ col }: { col: TPCollection }) {
  return (
    <Link to={`/collections/${col.slug}`} className={s.colCard}>
      <div className={s.colCardImg}>
        <NFTImage src={col.cover_url} alt={col.title} style={{width:'100%',height:'100%',objectFit:'cover' as const}}/>
        {col.verified && <span className={s.verifiedBadge}>✓</span>}
      </div>
      <div className={s.colCardBody}>
        <p className={s.colCardName}>{col.title}</p>
        <div className={s.colCardStats}>
          {col.floor != null && (
            <span className={s.colFloor}>{col.floor.toFixed(2)} <span className={s.sui}>SUI</span></span>
          )}
          {col.supply != null && (
            <span className={s.colSupply}>{col.supply.toLocaleString()} items</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function Marketplace() {
  usePageTitle('Marketplace')
  const { network } = useNetwork()
  const PACKAGE_ID     = network.packageId
  const MARKETPLACE_ID = network.marketplaceId
  const account  = useCurrentAccount()
  const client   = useSuiClient()
  const { buyNFT } = useNFTMarketplace()
  const { success, error: toastErr } = useToast()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const [tab,          setTab]        = useState<Tab>('trending')
  const [trending,     setTrending]    = useState<TPTrending[]>([])
  const [collections,  setCollections] = useState<TPCollection[]>([])
  const [tuskrNfts,    setTuskrNfts]   = useState<any[]>([])
  const [listings,     setListings]    = useState<any[]>([])
  const [loadingCols,  setLoadingCols] = useState(true)
  const [loadingTuskr, setLoadingTuskr]= useState(false)
  const [search,       setSearch]      = useState('')
  const [buying,       setBuying]      = useState<string|null>(null)

  /* Load TradePort collections — public, no wallet needed */
  useEffect(() => {
    // Load independently so trending failure never blocks collections
    fetchSuiCollections(40)
      .then(setCollections)
      .catch(console.error)
      .finally(() => setLoadingCols(false))

    fetchTrendingCollections(8)
      .then(setTrending)
      .catch(() => {}) // silent — not all API tiers support trending
  }, [])

  /* Load Tuskr-native minted NFTs from chain */
  const loadTuskrNfts = useCallback(async () => {
    setLoadingTuskr(true)
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_nft::MintedEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))

      if (!events.data.length) { setTuskrNfts([]); return }

      const ids = events.data
        .map((e: any) => e.parsedJson?.nft_id || e.parsedJson?.id)
        .filter(Boolean)

      if (!ids.length) { setTuskrNfts([]); return }

      const objs = await client.multiGetObjects({ ids, options: { showContent: true, showDisplay: true } })
      const parsed = objs.filter(o => o.data).map(o => {
        const f = (o.data?.content as any)?.fields ?? {}
        const d = (o.data?.display as any)?.data   ?? {}
        return {
          objectId: o.data!.objectId,
          name:     f.name       || d.name      || 'Tuskr NFT',
          mediaUrl: f.media_url  || d.image_url || '',
          blobId:   f.blob_id    || '',
          creator:  f.creator    || '',
        }
      })
      setTuskrNfts(parsed)
    } catch { setTuskrNfts([]) }
    finally   { setLoadingTuskr(false) }
  }, [PACKAGE_ID])

  /* Load listed NFTs from chain */
  const loadListings = useCallback(async () => {
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::ListedEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))
      setListings(events.data)
    } catch { setListings([]) }
  }, [PACKAGE_ID])

  /* Load chain data when on Tuskr tabs */
  useEffect(() => {
    if (tab === 'tuskr')  loadTuskrNfts()
    if (tab === 'listed') loadListings()
  }, [tab, network.name])

  // Only show collections with some trading activity — removes broken/abandoned ones
  const activeCols = collections.filter(c => (c.volume ?? 0) > 0 || (c.floor ?? 0) > 0)

  const filteredCols = activeCols.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  )

  // Trending = top 8 by volume from active collections (no extra API call needed)
  const trendingFromVolume = activeCols.slice(0, 8)
  const filteredTuskr = tuskrNfts.filter(n =>
    !search || n.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className={s.page}>
      <div className="container">

        {/* Header */}
        <div className={s.header}>
          <div className={s.eyebrow}><div className={s.eyebrowDot}/>NFT Marketplace</div>
          <h1 className={s.title}>Explore NFTs</h1>
          <p className={s.sub}>Browse real Sui NFT collections, or mint your own on Tuskr.</p>
        </div>

        {/* Search */}
        <div className={s.controls}>
          <div className={s.searchWrap}>
            <svg className={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className={s.searchInput} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <Link to="/mint" className={s.mintBtn}>+ Mint NFT</Link>
        </div>

        {/* Tabs */}
        <div className={s.tabBar}>
          <button className={`${s.tab} ${tab==='trending' ? s.tabActive : ''}`} onClick={() => setTab('trending')}>
            🔥 Trending
          </button>
          <button className={`${s.tab} ${tab==='explore' ? s.tabActive : ''}`} onClick={() => setTab('explore')}>
            Explore Sui ({filteredCols.length})
          </button>
          <button className={`${s.tab} ${tab==='tuskr' ? s.tabActive : ''}`} onClick={() => setTab('tuskr')}>
            Tuskr Minted ({tuskrNfts.length})
          </button>
          <button className={`${s.tab} ${tab==='listed' ? s.tabActive : ''}`} onClick={() => setTab('listed')}>
            Listed for Sale ({listings.length})
          </button>
        </div>

        {/* ── TAB: Trending ── */}
        {tab === 'trending' && (
          <div>
            <div className={s.trendingGrid}>
              {(trending.length > 0 ? trending.map((t, i) => ({
                id:    t.collection.id,
                slug:  t.collection.slug,
                title: t.collection.title,
                img:   t.collection.cover_url,
                vol:   t.current_volume ?? 0,
                floor: t.collection.floor ?? 0,
                supply:t.collection.supply ?? 0,
                pct:   t.previous_volume && t.previous_volume > 0
                  ? Math.round(((t.current_volume ?? 0) - t.previous_volume) / t.previous_volume * 100)
                  : null,
              })) : trendingFromVolume.map(c => ({
                id:     c.id,
                slug:   c.slug,
                title:  c.title,
                img:    c.cover_url,
                vol:    c.volume ?? 0,
                floor:  c.floor ?? 0,
                supply: c.supply ?? 0,
                pct:    null,
              }))).map((item, i) => (
                <Link key={item.id} to={`/collections/${item.slug}`} className={s.trendBigCard}>
                  <div className={s.trendBigImg}>
                    <NFTImage src={item.img} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    <span className={s.trendBigRank}>#{i + 1}</span>
                    {item.pct != null && (
                      <span className={`${s.trendBigPct} ${item.pct >= 0 ? s.trendUp : s.trendDown}`}>
                        {item.pct >= 0 ? '+' : ''}{item.pct}%
                      </span>
                    )}
                  </div>
                  <div className={s.trendBigBody}>
                    <p className={s.trendBigName}>{item.title}</p>
                    <div className={s.trendBigStats}>
                      <div className={s.trendBigStat}>
                        <span className={s.trendStatVal}>{item.floor.toFixed(2)} <span className={s.trendSui}>SUI</span></span>
                        <span className={s.trendStatLabel}>Floor</span>
                      </div>
                      <div className={s.trendBigStat}>
                        <span className={s.trendStatVal}>{item.vol.toFixed(0)} <span className={s.trendSui}>SUI</span></span>
                        <span className={s.trendStatLabel}>Volume</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: Explore (TradePort collections) ── */}
        {tab === 'explore' && (
          loadingCols ? (
            <div className={s.grid}>
              {[...Array(8)].map((_,i) => <div key={i} className={s.skelCard}/>)}
            </div>
          ) : filteredCols.length === 0 ? (
            <div className={s.empty}>
              <p className={s.emptyTitle}>No collections found</p>
              {search && <p className={s.emptySub}>Try a different search term.</p>}
            </div>
          ) : (
            <div className={s.colGrid}>
              {filteredCols.map(col => <CollectionCard key={col.id} col={col}/>)}
            </div>
          )
        )}

        {/* ── TAB: Tuskr native NFTs ── */}
        {tab === 'tuskr' && (
          loadingTuskr ? (
            <div className={s.grid}>{[...Array(8)].map((_,i) => <div key={i} className={s.skelCard}/>)}</div>
          ) : filteredTuskr.length === 0 ? (
            <div className={s.empty}>
              <p className={s.emptyIcon}>🎨</p>
              <p className={s.emptyTitle}>No Tuskr NFTs minted yet on {network.name}</p>
              <p className={s.emptySub}>Be the first to mint an NFT on Tuskr.</p>
              <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
            </div>
          ) : (
            <div className={s.grid}>
              {filteredTuskr.map(nft => (
                <Link key={nft.objectId} to={`/nft/${nft.objectId}`} className={s.nftCard}>
                  <div className={s.nftImg}>
                    {nft.mediaUrl
                      
                      
                    }
                    {nft.blobId && <span className={s.walrusBadge}>WALRUS</span>}
                  </div>
                  <div className={s.nftBody}>
                    <p className={s.nftName}>{nft.name}</p>
                    {nft.creator && <p className={s.nftCreator}>{nft.creator.slice(0,10)}...</p>}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── TAB: Listed for Sale ── */}
        {tab === 'listed' && (
          <div className={s.empty}>
            <p className={s.emptyIcon}>🏪</p>
            <p className={s.emptyTitle}>
              {listings.length === 0
                ? `No listings on ${network.name} yet`
                : `${listings.length} listings found`}
            </p>
            <p className={s.emptySub}>
              Mint an NFT and list it for sale to create the first listing on {network.name}.
            </p>
            {!account && (
              <p className={s.walletNote}>Connect your wallet to buy listed NFTs.</p>
            )}
            <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
          </div>
        )}

      </div>
    </main>
  )
}
