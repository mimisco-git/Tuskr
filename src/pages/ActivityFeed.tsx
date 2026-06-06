import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchRecentActivity, type TPActivity } from '../hooks/useTradeport'
import NFTImage from '../components/NFTImage'
import s from './ActivityFeed.module.css'
import usePageTitle from '../hooks/usePageTitle'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// Uses NFTImage component

const TYPE_LABELS: Record<string, string> = {
  sale:    'Sold',
  listing: 'Listed',
  offer:   'Offer',
  transfer:'Transfer',
  mint:    'Minted',
}

const TYPE_COLORS: Record<string, string> = {
  sale:    'var(--a)',
  listing: '#60a5fa',
  offer:   '#f59e0b',
  transfer:'rgba(245,245,247,0.35)',
}

export default function ActivityFeed() {
  usePageTitle('Activity Feed')
  const [items,   setItems]   = useState<TPActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string|null>(null)

  useEffect(() => {
    fetchRecentActivity(40)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.pageHead}>
          <div className={s.eyebrow}><span className={s.eyeDot}/>Live Feed</div>
          <h1 className={s.title}>Activity</h1>
          <p className={s.sub}>Real-time trades and listings across Sui NFT collections.</p>
        </div>

        {error && (
          <div className={s.errorBox}>API Error: {error}</div>
        )}

        {loading ? (
          <div className={s.skelList}>
            {[...Array(8)].map((_,i) => <div key={i} className={s.skelRow}/>)}
          </div>
        ) : items.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📊</div>
            <p>No recent activity found.</p>
          </div>
        ) : (
          <div className={s.list}>
            {items.map((item, i) => (
              <div key={(item.id ?? '') + i} className={s.row}>
                <NFTImage
                  src={item.nft?.media_url ?? null}
                  alt={item.nft?.name ?? '?'}
                />
                <div className={s.rowBody}>
                  <span className={s.nftName}>{item.nft?.name ?? 'Unknown NFT'}</span>
                  {item.nft?.collection?.slug && (
                    <Link to={`/collections/${item.nft.collection.slug}`} className={s.colName}>
                      {item.nft.collection.title}
                    </Link>
                  )}
                </div>
                <span
                  className={s.typePill}
                  style={{ color: TYPE_COLORS[item.type] ?? 'inherit',
                           borderColor: TYPE_COLORS[item.type] ?? 'rgba(255,255,255,0.1)' }}
                >
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
                {item.price != null && (
                  <span className={s.price}>
                    {fmt(item.price)} <span className={s.sui}>SUI</span>
                  </span>
                )}
                <span className={s.time}>{timeAgo(item.block_time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
