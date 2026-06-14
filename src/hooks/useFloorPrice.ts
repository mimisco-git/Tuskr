/**
 * useFloorPrice — Tuskr NFT floor price powered by DeepBook pricing
 *
 * Fetches the cheapest active Tuskr listing from on-chain events,
 * then expresses it in USD using the live DeepBook SUI/USDC rate.
 * This makes Tuskr's price data composable with the broader Sui DeFi ecosystem.
 */
import { useState, useEffect } from 'react'
import { useDeepBookPrice }    from './useDeepBookPrice'

interface FloorData {
  floorSui:       number
  floorUsd:       string
  count:          number
  totalVolumeSui: number
  loading:        boolean
}

let cache: FloorData | null = null
let cacheTs = 0
const TTL = 60_000  // 60 seconds

export function useFloorPrice(network = 'testnet'): FloorData {
  const [data, setData] = useState<FloorData>(
    cache ?? { floorSui:0, floorUsd:'', count:0, totalVolumeSui:0, loading:true }
  )
  const { price: suiPrice } = useDeepBookPrice()

  useEffect(() => {
    // Use cache if fresh
    if (cache && Date.now() - cacheTs < TTL) {
      const usd = suiPrice && cache.floorSui
        ? `$${(cache.floorSui * suiPrice).toFixed(2)}`
        : ''
      setData({ ...cache, floorUsd: usd, loading: false })
      return
    }

    fetch(`/api/tuskr-nfts?type=floor&network=${network}`)
      .then(r => r.json())
      .then(d => {
        const usd = suiPrice && d.floorSui
          ? `$${(d.floorSui * suiPrice).toFixed(2)}`
          : ''
        const fresh: FloorData = {
          floorSui:       d.floorSui       ?? 0,
          floorUsd:       usd,
          count:          d.count          ?? 0,
          totalVolumeSui: d.totalVolumeSui ?? 0,
          loading:        false,
        }
        cache   = fresh
        cacheTs = Date.now()
        setData(fresh)
      })
      .catch(() => setData(prev => ({ ...prev, loading: false })))
  }, [network, suiPrice])

  // Update USD when DeepBook price changes
  useEffect(() => {
    if (suiPrice && data.floorSui) {
      setData(prev => ({ ...prev, floorUsd: `$${(prev.floorSui * suiPrice).toFixed(2)}` }))
    }
  }, [suiPrice, data.floorSui])

  return data
}
