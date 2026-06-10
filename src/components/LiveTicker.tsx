/**
 * LiveTicker — horizontal infinite scroll of activity events
 * Shows real-time trades + listings flowing left
 */
import { useEffect, useRef, useState } from 'react'
import { fetchRecentActivity, type TPActivity } from '../hooks/useTradeport'
import s from './LiveTicker.module.css'

function fmt(n: number | null) {
  if (!n) return null
  return n.toFixed(2)
}

const TYPE_COLOR: Record<string, string> = {
  sale:     '#00d4aa',
  listing:  '#60a5fa',
  mint:     '#a855f7',
  offer:    '#f59e0b',
  transfer: 'rgba(245,245,247,0.4)',
}

export default function LiveTicker() {
  const [items, setItems] = useState<TPActivity[]>([])
  const intervalRef = useRef<any>(null)

  const load = () => {
    fetchRecentActivity(30).then(setItems).catch(() => {})
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30000) // refresh every 30s
    return () => clearInterval(intervalRef.current)
  }, [])

  if (!items.length) return null

  // Duplicate items to create seamless loop
  const doubled = [...items, ...items]

  return (
    <div className={s.ticker}>
      <div className={s.label}>⚡ LIVE</div>
      <div className={s.track}>
        <div className={s.scroll}>
          {doubled.map((item, i) => {
            const price = fmt(item.price)
            const color = TYPE_COLOR[item.type] ?? TYPE_COLOR.transfer
            return (
              <span key={i} className={s.item}>
                <span className={s.name}>{item.nft?.name ?? 'NFT'}</span>
                <span className={s.type} style={{ color }}>{item.type}</span>
                {price && (
                  <span className={s.price}>{price} <span className={s.sui}>SUI</span></span>
                )}
                <span className={s.sep}>·</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
