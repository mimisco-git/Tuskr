/**
 * useWatchlist.ts
 * Persist NFT watchlist in localStorage. No backend needed.
 */
import { useState, useCallback } from 'react'
import type { NFT } from '../components/NFTCard'

const KEY = 'tuskr_watchlist'

function load(): NFT[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function save(items: NFT[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<NFT[]>(load)

  const addToWatchlist = useCallback((nft: NFT) => {
    setWatchlist(prev => {
      if (prev.some(n => n.id === nft.id)) return prev
      const next = [nft, ...prev]
      save(next)
      return next
    })
  }, [])

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist(prev => {
      const next = prev.filter(n => n.id !== id)
      save(next)
      return next
    })
  }, [])

  const isWatched = useCallback(
    (id: string) => watchlist.some(n => n.id === id),
    [watchlist]
  )

  const toggleWatch = useCallback((nft: NFT) => {
    if (isWatched(nft.id)) removeFromWatchlist(nft.id)
    else addToWatchlist(nft)
  }, [isWatched, addToWatchlist, removeFromWatchlist])

  return { watchlist, addToWatchlist, removeFromWatchlist, isWatched, toggleWatch }
}
