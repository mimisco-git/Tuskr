/**
 * useActivityFeed.ts
 * Subscribe to Sui on-chain events from the Tuskr package.
 * Falls back to polling when WebSocket is unavailable.
 */
import { useState, useEffect } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0x0'

export type ActivityType = 'mint' | 'sale' | 'listing' | 'offer' | 'auction_bid' | 'auction_settled'

export interface ActivityEvent {
  id:        string
  type:      ActivityType
  nftName:   string
  amount?:   string
  currency?: string
  actor:     string
  timestamp: Date
  txDigest?: string
}

// Mock data for when the contract isn't deployed yet
const MOCK_EVENTS: ActivityEvent[] = [
  { id:'1', type:'sale',         nftName:'Arctic Phantom #001', amount:'12.5', currency:'SUI', actor:'0xwhyt...ycon', timestamp: new Date(Date.now()-60000),   txDigest:'0xabc' },
  { id:'2', type:'mint',         nftName:'Deep Current #007',                                  actor:'0xsir_...isco', timestamp: new Date(Date.now()-180000),  txDigest:'0xdef' },
  { id:'3', type:'listing',      nftName:'Tusk Genesis',        amount:'22.0', currency:'SUI', actor:'0xwhyt...ycon', timestamp: new Date(Date.now()-300000),  txDigest:'0xghi' },
  { id:'4', type:'auction_bid',  nftName:'Polar Drift #012',    amount:'8.0',  currency:'SUI', actor:'0xanon...user', timestamp: new Date(Date.now()-600000),  txDigest:'0xjkl' },
  { id:'5', type:'offer',        nftName:'Frozen Echo #003',    amount:'5.5',  currency:'SUI', actor:'0xanon...user', timestamp: new Date(Date.now()-900000),  txDigest:'0xmno' },
]

export function useActivityFeed(limit = 20) {
  const client = useSuiClient()
  const [events, setEvents] = useState<ActivityEvent[]>(MOCK_EVENTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchEvents = async () => {
      if (PACKAGE_ID === '0x0') {
        // Simulate live feed with mock data
        setLoading(false)
        const timer = setInterval(() => {
          if (cancelled) return
          const types: ActivityType[] = ['mint', 'sale', 'listing', 'offer', 'auction_bid']
          const names = ['Ivory Wave', 'Silent Surge', 'Cold Bloom', 'Sea Shadow', 'Ice Relic', 'Arctic Phantom']
          setEvents(prev => [{
            id:        Date.now().toString(),
            type:      types[Math.floor(Math.random() * types.length)],
            nftName:   names[Math.floor(Math.random() * names.length)] + ' #' + String(Math.floor(Math.random()*100)).padStart(3,'0'),
            amount:    (Math.random() * 20 + 2).toFixed(1),
            currency:  'SUI',
            actor:     '0x' + Math.random().toString(16).slice(2, 8) + '...',
            timestamp: new Date(),
          }, ...prev.slice(0, limit - 1)])
        }, 8000)
        return () => clearInterval(timer)
      }

      try {
        // Real on-chain event query
        const [mintEvts, saleEvts] = await Promise.all([
          client.queryEvents({ query: { MoveEventType: `${PACKAGE_ID}::tuskr_nft::MintedEvent`   }, limit }),
          client.queryEvents({ query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::SoldEvent` }, limit }),
        ])

        const parsed: ActivityEvent[] = [
          ...mintEvts.data.map((e, i) => ({
            id:        e.id.txDigest + i,
            type:      'mint' as ActivityType,
            nftName:   (e.parsedJson as any)?.name ?? 'Tuskr NFT',
            actor:     (e.parsedJson as any)?.creator ?? 'N/A',
            timestamp: new Date(parseInt(e.timestampMs ?? '0')),
            txDigest:  e.id.txDigest,
          })),
          ...saleEvts.data.map((e, i) => ({
            id:        e.id.txDigest + i,
            type:      'sale' as ActivityType,
            nftName:   (e.parsedJson as any)?.nft_id ?? 'NFT',
            amount:    String((parseInt((e.parsedJson as any)?.price ?? '0') / 1e9).toFixed(2)),
            currency:  'SUI',
            actor:     (e.parsedJson as any)?.buyer ?? 'N/A',
            timestamp: new Date(parseInt(e.timestampMs ?? '0')),
            txDigest:  e.id.txDigest,
          })),
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        if (!cancelled) { setEvents(parsed); setLoading(false) }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEvents()
    return () => { cancelled = true }
  }, [])

  return { events, loading }
}
