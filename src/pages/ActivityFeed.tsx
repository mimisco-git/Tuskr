import { useActivityFeed } from '../hooks/useActivityFeed'
import s from './ActivityFeed.module.css'
import usePageTitle from '../hooks/usePageTitle'

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  sold:     { label:'Sold',     icon:'💰', color:'#00d4aa' },
  listed:   { label:'Listed',   icon:'🏷️', color:'#60a5fa' },
  minted:   { label:'Minted',   icon:'✨', color:'#a78bfa' },
  delisted: { label:'Delisted', icon:'↩️', color:'#f87171' },
  bid:      { label:'Bid',      icon:'⚡', color:'#fbbf24' },
}

export default function ActivityFeed() {
  usePageTitle('Activity Feed')
  const { events, loading, refresh } = useActivityFeed()

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div>
            <div className={s.eyebrow}><div className={s.eyebrowDot}/>Activity Feed</div>
            <h1 className={s.title}>Live Activity</h1>
            <p className={s.sub}>Real-time trades, mints and listings on Tuskr.</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className={s.liveBadge}><div className={s.liveDot}/>LIVE</div>
            <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <div className={s.feed}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:72, borderRadius:14 }}/>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyIcon}>📡</p>
            <p className={s.emptyTitle}>No activity yet</p>
            <p className={s.emptySub}>Trades and mints will appear here in real time.</p>
          </div>
        ) : (
          <div className={s.feed}>
            {events.map(ev => {
              const cfg = TYPE_CONFIG[ev.type] ?? { label:ev.type, icon:'◎', color:'#fff' }
              return (
                <div key={ev.id} className={s.event}>
                  <div className={s.eventIcon}>{cfg.icon}</div>
                  <div className={s.eventBody}>
                    <div className={s.eventType} style={{ color: cfg.color }}>{cfg.label}</div>
                    <div className={s.eventName}>{ev.nftName}</div>
                  </div>
                  <div className={s.eventMeta}>
                    {parseFloat(ev.amount) > 0 && (
                      <div className={s.eventAmount}>{ev.amount} SUI</div>
                    )}
                    <div className={s.eventActor}>{ev.actor}</div>
                    <div className={s.eventTime}>{ev.time}</div>
                  </div>
                  <a
                    href={`https://suiexplorer.com/txblock/${ev.txDigest}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.eventLink}
                    title="View on Sui Explorer"
                  >↗</a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
