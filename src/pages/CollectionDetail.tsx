import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchCollection, fetchCollectionNFTs, type TPCollection, type TPNFT } from '../hooks/useTradeport'
import s from './CollectionDetail.module.css'
import usePageTitle from '../hooks/usePageTitle'

function fmt(n: number | null, d = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: d })
}

function ImgWithFallback({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <div className={s.imgFallback}>{alt.slice(0,2).toUpperCase()}</div>
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)}/>
}

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [col,     setCol]     = useState<TPCollection | null>(null)
  const [nfts,    setNfts]    = useState<TPNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'nfts'|'activity'>('nfts')

  usePageTitle(col?.title ?? 'Collection')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    Promise.all([
      fetchCollection(slug),
      fetchCollectionNFTs(slug, 32),
    ]).then(([c, n]) => {
      setCol(c); setNfts(n)
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

  const listedNfts = nfts.filter(n => n.list_price != null)
  const floorNfts  = [...nfts].sort((a,b) => (a.list_price??Infinity) - (b.list_price??Infinity))

  return (
    <main className={s.page}>
      {/* Banner */}
      <div className={s.banner}>
        {(col.cover_url || col.image) && (
          <img src={col.cover_url || col.image || ''} alt={col.title || ''} className={s.bannerImg}/>
        )}
        <div className={s.bannerOverlay}/>
      </div>

      <div className="container">
        {/* Identity */}
        <div className={s.identity}>
          <div className={s.avatarWrap}>
            <ImgWithFallback src={col.cover_url || col.image} alt={col.title || '?'} className={s.avatar}/>
          </div>
          <div className={s.identityInfo}>
            <div className={s.identityTop}>
              <h1 className={s.colTitle}>{col.title}</h1>
              {col.verified && <span className={s.verified}>✓ Verified</span>}
            </div>
            {col.description && <p className={s.description}>{col.description}</p>}
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
            <span className={s.statNum}>{col.num_owners?.toLocaleString() ?? '—'}</span>
            <span className={s.statLabel}>Holders</span>
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
                    <ImgWithFallback
                      src={nft.image}
                      alt={nft.name || '#'+nft.token_id}
                      className={s.nftImg}
                    />
                    {nft.list_price != null && (
                      <div className={s.listedBadge}>FOR SALE</div>
                    )}
                    {nft.rarity_rank && (
                      <div className={s.rarityBadge}>✧ {nft.rarity_rank.toLocaleString()}</div>
                    )}
                  </div>
                  <div className={s.cardBody}>
                    <p className={s.nftName}>{nft.name || `#${nft.token_id.slice(0,8)}`}</p>
                    {nft.list_price != null ? (
                      <div className={s.priceRow}>
                        <span className={s.price}>{fmt(nft.list_price, 2)}</span>
                        <span className={s.priceSui}>SUI</span>
                        <a
                          href={`https://tradeport.xyz/sui/nft/${nft.token_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className={s.buyBtn}
                        >
                          Buy
                        </a>
                      </div>
                    ) : (
                      <p className={s.unlisted}>Not listed</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'activity' && (
          <div className={s.activityPlaceholder}>
            <p>Activity data coming soon.</p>
            <a href={`https://tradeport.xyz/sui/collection/${slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              View activity on TradePort ↗
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
