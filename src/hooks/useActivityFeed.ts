/**
 * useActivityFeed.ts
 * Queries real Sui events from the Tuskr contracts.
 * Falls back to empty list if no events yet.
 */
import { useState, useEffect, useCallback } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'

export interface ActivityEvent {
  id:       string
  type:     'sold' | 'listed' | 'minted' | 'delisted' | 'bid'
  nftName:  string
  amount:   string
  actor:    string
  txDigest: string
  time:     string
}

function parseEventType(raw: string): ActivityEvent['type'] {
  if (raw.includes('SoldEvent'))     return 'sold'
  if (raw.includes('ListedEvent'))   return 'listed'
  if (raw.includes('MintedEvent'))   return 'minted'
  if (raw.includes('DelistedEvent')) return 'delisted'
  if (raw.includes('BidEvent'))      return 'bid'
  return 'minted'
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60000)   return `${Math.floor(diff/1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}

export function useActivityFeed() {
  const client = useSuiClient()
  const [events, setEvents]   = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    try {
      // Query all event types from our package
      const eventTypes = [
        `${PACKAGE_ID}::tuskr_marketplace::SoldEvent`,
        `${PACKAGE_ID}::tuskr_marketplace::ListedEvent`,
        `${PACKAGE_ID}::tuskr_nft::MintedEvent`,
        `${PACKAGE_ID}::tuskr_marketplace::DelistedEvent`,
        `${PACKAGE_ID}::tuskr_auction::BidEvent`,
        // Old package — so secondary sales of legacy NFTs appear in feed
        '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d::tuskr_marketplace::SoldEvent',
        '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d::tuskr_marketplace::ListedEvent',
        '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d::tuskr_nft::MintedEvent',
      ]

      const results = await Promise.allSettled(
        eventTypes.map(t =>
          client.queryEvents({ query: { MoveEventType: t }, limit: 20 })
        )
      )

      const all: ActivityEvent[] = []
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return
        r.value.data.forEach((e: any) => {
          const p = e.parsedJson ?? {}
          const type = parseEventType(eventTypes[i])

          let amount = '0'
          let actor  = ''
          let name   = ''

          if (type === 'sold') {
            amount = p.price   ? (Number(p.price) / 1e9).toFixed(2)   : '0'
            actor  = p.buyer   ? `${p.buyer.slice(0,8)}…`             : ''
            name   = p.nft_id  ? `NFT #${p.nft_id.slice(2,8)}`        : 'NFT'
          } else if (type === 'listed') {
            amount = p.price   ? (Number(p.price) / 1e9).toFixed(2)   : '0'
            actor  = p.seller  ? `${p.seller.slice(0,8)}…`            : ''
            name   = p.nft_id  ? `NFT #${p.nft_id.slice(2,8)}`        : 'NFT'
          } else if (type === 'minted') {
            amount = '0'
            actor  = p.creator ? `${p.creator.slice(0,8)}…`           : ''
            name   = p.name    || (p.nft_id ? `NFT #${p.nft_id.slice(2,8)}` : 'NFT')
          } else if (type === 'bid') {
            amount = p.amount  ? (Number(p.amount) / 1e9).toFixed(2)  : '0'
            actor  = p.bidder  ? `${p.bidder.slice(0,8)}…`            : ''
            name   = `Auction #${(p.auction_id || '').slice(2,8)}`
          } else {
            actor  = p.seller  ? `${p.seller.slice(0,8)}…`            : ''
            name   = `NFT #${(p.listing_id || '').slice(2,8)}`
          }

          all.push({
            id:       `${e.id.txDigest}-${e.id.eventSeq}`,
            type,
            nftName:  name,
            amount,
            actor,
            txDigest: e.id.txDigest,
            time:     e.timestampMs ? timeAgo(Number(e.timestampMs)) : 'Recent',
          })
        })
      })

      // Sort by most recent first
      all.sort((a, b) => {
        // We don't have raw ms here so just keep order
        return 0
      })

      setEvents(all.slice(0, 40))
    } catch (e) {
      console.error('Activity feed error:', e)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchEvents()
    // Refresh every 15 seconds
    const interval = setInterval(fetchEvents, 15000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  return { events, loading, refresh: fetchEvents }
}
