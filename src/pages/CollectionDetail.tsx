import { useEffect, useState } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { useParams, Link } from 'react-router-dom'
import { fetchCollection, fetchCollectionNFTs, fetchCollectionActivity, type TPCollection, type TPNFT, type TPActivity } from '../hooks/useTradeport'
import NFTImage from '../components/NFTImage'
import s from './CollectionDetail.module.css'
import usePageTitle from '../hooks/usePageTitle'

function fmt(n: number | null, d = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: d })
}

// NFTImage component imported from components/NFTImage.tsx

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>()
  const client = useSuiClient()
  const [col,      setCol]      = useState<TPCollection | null>(null)
  const [nfts,     setNfts]     = useState<TPNFT[]>([])
  const [activity, setActivity] = useState<TPActivity[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'nfts'|'activity'>('nfts')

  usePageTitle(col?.title ?? 'Collection')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    Promise.all([
      fetchCollection(slug),
      fetchCollectionNFTs(slug, 32),
      fetchCollectionActivity(slug, 20),
    ]).then(async ([c, n, a]) => {
      setCol(c as TPCollection | null)
      setActivity(a as TPActivity[])

      const nfts = n as TPNFT[]

      // For NFTs with no media_url, fetch image directly from Sui blockchain
      const missing = nfts.filter(nft => !nft.media_url && nft.token_id)
      
      if (missing.length > 0) {
        try {
          // Normalize IDs — Sui requires 0x prefix
          const ids = missing
            .map(n => {
              const id = n.token_id || ''
              return id.startsWith('0x') ? id : `0x${id}`
            })
            .filter(id => id.length > 2)


          const objects = await client.multiGetObjects({
            ids,
            options: { showDisplay: true, showContent: true },
          })

          const imgMap: Record<string, string> = {}
          objects.forEach((obj, i) => {
            const display = (obj.data?.display as any)?.data ?? {}
            const fields  = (obj.data?.content as any)?.fields ?? {}
            
            // Try every possible field name
            const img = display.image_url || display.img_url || display.url
              || display.media_url || display.image || display.thumbnail
              || fields.image_url  || fields.img_url || fields.url
              || fields.media_url  || fields.image   || fields.thumbnail
              || ''

            
            if (img) imgMap[missing[i].token_id] = img
          })

          const enriched = nfts.map(nft =>
            (!nft.media_url && imgMap[nft.token_id])
              ? { ...nft, media_url: imgMap[nft.token_id] }
              : nft
          )
          
          setNfts(enriched)
        } catch (err) {
          console.error('[Tuskr] Sui image fetch failed:', err)
          setNfts(nfts)
        }
      } else {
        setNfts(nfts)
      }
    }).finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <main className={s.page}>
      <div className="container">
        <div className={s.skelBanner}/>
        <div className={s.skelStats}/>
        <div className={s.skelGrid}>
          {[...Array(8)].map((_,i) => <div key={i} className={s.skelCard}/>)}
        </div>
      </div>
    </main>
  )

  if (!col) return (
    <main className={s.page}>
      <div className="container">
        <div className={s.notFound}>
          <p>Collection not found.</p>
          <Link to="/collections" className="btn btn-primary">Browse all collections</Link>
        </div>
      </div>
    </main>
  )

  const listedNfts: TPNFT[] = []
  const floorNfts  = [...nfts]

  return (
    <main className={s.page}>
      {/* Banner */}
      <div className={s.banner}>
        {(col.cover_url) && (
          <img src={col.cover_url || ''} alt={col.title || ''} className={s.bannerImg}/>
        )}
        <div className={s.bannerOverlay}/>
      </div>

      <div className="container">
        {/* Identity */}
        <div className={s.identity}>
          <div className={s.avatarWrap}>
            <NFTImage src={col.cover_url} alt={col.title || '?'} className={s.avatar}/>
          </div>
          <div className={s.identityInfo}>
            <div className={s.identityTop}>
              <h1 className={s.colTitle}>{col.title}</h1>
              {col.verified && <span className={s.verified}>✓ Verified</span>}
            </div>
            
          </div>
          <Link to="/marketplace" className={s.backBtn}>← All collections</Link>
        </div>

        {/* Stats bar */}
        <div className={s.statsBar}>
          <div className={s.stat}>
            <span className={s.statNum}>{fmt(col.floor, 2)} <span className={s.statSui}>SUI</span></span>
            <span className={s.statLabel}>Floor price</span>
          </div>
          <div className={s.statDivider}/>
          <div className={s.stat}>
            <span className={s.statNum}>{fmt(col.volume, 0)} <span className={s.statSui}>SUI</span></span>
            <span className={s.statLabel}>Total volume</span>
          </div>
          <div className={s.statDivider}/>
          <div className={s.stat}>
            <span className={s.statNum}>{listedNfts.length}</span>
            <span className={s.statLabel}>Listed</span>
          </div>

          <div className={s.statDivider}/>
          <div className={s.stat}>
            <span className={s.statNum}>{col.supply?.toLocaleString() ?? '—'}</span>
            <span className={s.statLabel}>Supply</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={s.tabBar}>
          <button className={`${s.tab} ${tab==='nfts' ? s.tabActive : ''}`} onClick={() => setTab('nfts')}>
            NFTs ({nfts.length})
          </button>
          <button className={`${s.tab} ${tab==='activity' ? s.tabActive : ''}`} onClick={() => setTab('activity')}>
            Activity
          </button>
          <a
            href={`https://tradeport.xyz/sui/collection/${slug}`}
            target="_blank" rel="noopener noreferrer"
            className={s.tradeportLink}
          >
            Trade on TradePort ↗
          </a>
        </div>

        {/* NFT Grid */}
        {tab === 'nfts' && (
          nfts.length === 0 ? (
            <div className={s.empty}>
              <p>No NFTs found for this collection.</p>
              <a href={`https://tradeport.xyz/sui/collection/${slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                View on TradePort ↗
              </a>
            </div>
          ) : (
            <div className={s.grid}>
              {floorNfts.map(nft => (
                <div key={nft.token_id} className={s.card}>
                  <div className={s.cardImg}>
                    <NFTImage
                      src={nft.media_url}
                      alt={nft.name || '#'+nft.token_id}
                      className={s.nftImg}
                    />
        
                    {nft.ranking && (
                      <div className={s.rarityBadge}>✧ {nft.ranking.toLocaleString()}</div>
                    )}
                  </div>
                  <div className={s.cardBody}>
                    <p className={s.nftName}>{nft.name || `#${nft.token_id.slice(0,8)}`}</p>
                    <a
                      href={`https://tradeport.xyz/sui/nft/${nft.token_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className={s.buyBtn}
                    >
                      View on TradePort
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'activity' && (
          activity.length === 0 ? (
            <div className={s.activityPlaceholder}>
              <p>No recent activity found.</p>
            </div>
          ) : (
            <div className={s.activityList}>
              {activity.map((a, i) => (
                <div key={a.id ?? i} className={s.activityRow}>
                  {a.nft?.media_url && <img src={a.nft.media_url} alt="" className={s.activityImg}/>}
                  <div className={s.activityBody}>
                    <span className={s.activityName}>{a.nft?.name ?? 'Unknown NFT'}</span>
                    <span className={s.activityType}>{a.type === 'sale' ? 'Sold' : 'Listed'}</span>
                  </div>
                  {a.price && <span className={s.activityPrice}>{a.price.toFixed(2)} <span className={s.activitySui}>SUI</span></span>}
                  <span className={s.activityTime}>{new Date(a.block_time).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  )
}
