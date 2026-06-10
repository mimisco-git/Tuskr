import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchRecentActivity, type TPActivity } from '../hooks/useTradeport'
import NFTImage from '../components/NFTImage'
import s from './ActivityFeed.module.css'
import usePageTitle from '../hooks/usePageTitle'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtPrice(n: number | null) {
  if (n == null || n === 0) return null
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  sale:     { label: 'Sold',     color: '#00d4aa', bg: 'rgba(0,212,170,0.12)' },
  listing:  { label: 'Listed',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  offer:    { label: 'Offer',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  transfer: { label: 'Transfer', color: 'rgba(245,245,247,0.4)', bg: 'rgba(255,255,255,0.06)' },
  mint:     { label: 'Minted',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
}

export default function ActivityFeed() {
  usePageTitle('Activity Feed')
  const [items,    setItems]    = useState<TPActivity[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchRecentActivity(50)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [])

  const Skel = () => (
    <div className={s.skelList}>
      {[...Array(10)].map((_,i) => <div key={i} className={s.skelRow}/>)}
    </div>
  )

  return (
    <main className={s.page}>
      <div className="container">

        <div className={s.pageHead}>
          <div className={s.eyebrow}>
            <span className={s.eyeDot}/>
            <span>Live Feed</span>
          </div>
          <div className={s.headRow}>
            <div>
              <h1 className={s.title}>Activity</h1>
              <p className={s.sub}>Real-time trades and listings across Sui NFT collections.</p>
            </div>
            <button className={s.refreshBtn} onClick={load} disabled={loading}>
              {loading ? '...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className={s.errorBox}>
            <span>⚠ {error}</span>
            <button className={s.retryBtn} onClick={load}>Retry</button>
          </div>
        )}

        {loading ? <Skel/> : items.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📊</div>
            <p className={s.emptyText}>No recent activity found.</p>
          </div>
        ) : (
          <div className={s.feed}>
            {items.map((item, i) => {
              const cfg   = TYPE_CFG[item.type] ?? TYPE_CFG.transfer
              const price = fmtPrice(item.price)
              return (
                <div key={(item.id ?? '') + i} className={s.row}>

                  {/* NFT thumbnail */}
                  <div className={s.thumb}>
                    <NFTImage
                      src={item.nft?.media_url ?? null}
                      alt={item.nft?.name || '?'}
                      style={{ width: '100%', height: '100%', borderRadius: 10 }}
                    />
                  </div>

                  {/* NFT info */}
                  <div className={s.info}>
                    <span className={s.nftName}>
                      {item.nft?.name ?? 'Unknown NFT'}
                    </span>
                    {item.nft?.collection?.slug ? (
                      <Link
                        to={`/collections/${item.nft.collection.slug}`}
                        className={s.colName}
                      >
                        {item.nft.collection.title}
                      </Link>
                    ) : (
                      <span className={s.colName} style={{ cursor: 'default' }}>Sui NFT</span>
                    )}
                  </div>

                  {/* Type pill */}
                  <span
                    className={s.pill}
                    style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '33' }}
                  >
                    {cfg.label}
                  </span>

                  {/* Price */}
                  <span className={s.price}>
                    {price ? <>{price} <span className={s.sui}>SUI</span></> : <span className={s.dim}>—</span>}
                  </span>

                  {/* Time */}
                  <span className={s.time}>{timeAgo(item.block_time)}</span>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
