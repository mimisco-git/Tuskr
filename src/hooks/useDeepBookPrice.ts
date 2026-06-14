/**
 * useDeepBookPrice
 * Fetches live SUI/USDC price from our DeepBook price API.
 * Updates every 30 seconds automatically.
 */
import { useState, useEffect, useCallback } from 'react'

interface PriceData {
  price: number | null
  source: string
  loading: boolean
}

let globalPrice: number | null   = null
let globalSource: string         = ''
let globalTs: number             = 0
let listeners: Array<() => void> = []

function notify() { listeners.forEach(fn => fn()) }

async function fetchPrice() {
  try {
    const res  = await fetch('/api/deepbook-price')
    const data = await res.json()
    if (data.price) {
      globalPrice  = data.price
      globalSource = data.source || 'DeepBook'
      globalTs     = Date.now()
      notify()
    }
  } catch { /* silent fail */ }
}

// Auto-refresh every 30s
let interval: ReturnType<typeof setInterval> | null = null
function ensurePolling() {
  if (!interval) {
    fetchPrice()
    interval = setInterval(fetchPrice, 30_000)
  }
}

export function useDeepBookPrice(): PriceData {
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    listeners.push(rerender)
    ensurePolling()
    return () => { listeners = listeners.filter(fn => fn !== rerender) }
  }, [rerender])

  return {
    price:   globalPrice,
    source:  globalSource,
    loading: !globalPrice,
  }
}

// Helper: format SUI price in USD
export function suiToUsd(suiAmount: number, suiPrice: number | null): string {
  if (!suiPrice || !suiAmount) return ''
  const usd = suiAmount * suiPrice
  return usd < 0.01 ? `<$0.01` : `$${usd.toFixed(2)}`
}
