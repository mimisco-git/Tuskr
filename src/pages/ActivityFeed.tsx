import { useActivityFeed, ActivityType } from '../hooks/useActivityFeed'
import s from './ActivityFeed.module.css'
import usePageTitle from '../hooks/usePageTitle'

const TYPE_CONFIG: Record<ActivityType, { label: string; color: string }> = {
  mint:             { label: 'Minted',    color: 'var(--a)'     },
  sale:             { label: 'Sold',      color: 'var(--green)'  },
  listing:          { label: 'Listed',    color: 'var(--g)'      },
  offer:            { label: 'Offer',     color: 'var(--t-2)'    },
  auction_bid:      { label: 'Bid',       color: '#b388ff'       },
  auction_settled:  { label: 'Settled',   color: 'var(--green)'  },
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`
  return `${Math.floor(secs/3600)}h ago`
}

export default function ActivityFeed() {
  usePageTitle('Activity Feed')
  const { events, loading } = useActivityFeed(40)

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div>
            <div className={s.live}><div className={s.liveDot} /> Live</div>
            <h1 className={s.title}>Activity Feed</h1>
            <p className={s.sub}>Real-time events from the Tuskr marketplace on Sui</p>
          </div>
        </div>

        <div className={s.feed}>
          {loading ? (
            Array.from({length:8}).map((_,i) => (
              <div key={i} className="skeleton" style={{ height:64, borderRadius:12, marginBottom:8 }} />
            ))
          ) : events.map((e, i) => {
            const cfg = TYPE_CONFIG[e.type]
            return (
              <div key={e.id} className={s.row} style={{ animationDelay: `${i*0.03}s` }}>
                <div className={s.dot} style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
                <div className={s.body}>
                  <span className={s.typeBadge} style={{ color: cfg.color, borderColor: cfg.color + '44', background: cfg.color + '11' }}>
                    {cfg.label}
                  </span>
                  <span className={s.nftName}>{e.nftName}</span>
                  {e.amount && (
                    <span className={s.amount}>{e.amount} {e.currency}</span>
                  )}
                </div>
                <div className={s.meta}>
                  <span className={s.actor}>{e.actor}</span>
                  <span className={s.time}>{timeAgo(e.timestamp)}</span>
                </div>
                {e.txDigest && (
                  <a
                    href={`https://suiexplorer.com/txblock/${e.txDigest}?network=testnet`}
                    target="_blank" rel="noreferrer"
                    className={s.explorer}
                    title="View on Sui Explorer"
                  >↗</a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
