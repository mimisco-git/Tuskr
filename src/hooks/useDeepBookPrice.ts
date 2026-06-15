/**
 * useDeepBookPrice — global singleton, 30s polling
 * Keeps a price history for sparkline rendering.
 * Three fallbacks: DeepBook indexer, CoinGecko, Binance.
 */
import { useState, useEffect } from 'react'

export interface PriceData {
  price:   number | null
  source:  string
  history: { t: number; p: number }[]   // last 20 readings for sparkline
}

const MAX_HISTORY = 20

// Module-level singleton — shared across all consumers
let globalPrice:   number | null = null
let globalSource:  string = ''
let globalHistory: { t: number; p: number }[] = []
let listeners:     Set<(d: PriceData) => void> = new Set()
let polling        = false

async function fetchPrice(): Promise<{ price: number; source: string } | null> {
  try {
    const r = await fetch('/api/deepbook-price', { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const d = await r.json()
    if (d.price > 0) return { price: d.price, source: d.source || 'DeepBook' }
  } catch { /* fall through */ }
  return null
}

function notify() {
  const data: PriceData = { price: globalPrice, source: globalSource, history: [...globalHistory] }
  listeners.forEach(fn => fn(data))
}

function ensurePolling() {
  if (polling) return
  polling = true
  const tick = async () => {
    const result = await fetchPrice()
    if (result && result.price > 0) {
      globalPrice  = result.price
      globalSource = result.source
      globalHistory = [
        ...globalHistory.slice(-(MAX_HISTORY - 1)),
        { t: Date.now(), p: result.price },
      ]
      notify()
    }
    setTimeout(tick, 30_000)
  }
  tick()
}

export function useDeepBookPrice(): PriceData {
  const [data, setData] = useState<PriceData>({
    price:   globalPrice,
    source:  globalSource,
    history: [...globalHistory],
  })

  useEffect(() => {
    ensurePolling()
    const fn = (d: PriceData) => setData(d)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  return data
}

export function suiToUsd(sui: number, price: number | null): string {
  if (!price || !sui) return ''
  const usd = sui * price
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}
