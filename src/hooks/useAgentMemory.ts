/**
 * useAgentMemory — Persistent AI agent memory stored on Walrus
 *
 * Architecture:
 *   Memory is a JSON blob stored permanently on Walrus.
 *   The blob ID is kept in localStorage as a lightweight pointer.
 *   On each session: read blob → update in memory → write new blob → save new ID.
 *
 * This implements the Walrus track requirement:
 *   "Long-term memory using persistent, verifiable memory for agents"
 *   "How agents become more useful when they can remember and build over time"
 */

import { useState, useEffect, useCallback } from 'react'

const MEMORY_KEY  = 'tuskr_agent_memory_blob'  // localStorage key for blob ID
const AGGREGATOR  = 'https://aggregator.walrus-testnet.walrus.space'
const AGENT_ID    = 'tuskr_creative_agent_v1'

export interface NFTRecord {
  name:    string
  prompt:  string
  style:   string
  blobId:  string
  ts:      string
}

export interface AgentMemory {
  version:       number
  agentId:       string
  wallet:        string
  totalSessions: number
  totalMinted:   number
  lastSession:   string
  favoriteStyles:string[]
  recentPrompts: string[]
  nftHistory:    NFTRecord[]
}

const EMPTY_MEMORY = (wallet: string): AgentMemory => ({
  version:        1,
  agentId:        AGENT_ID,
  wallet,
  totalSessions:  0,
  totalMinted:    0,
  lastSession:    new Date().toISOString(),
  favoriteStyles: [],
  recentPrompts:  [],
  nftHistory:     [],
})

// ── Read memory from Walrus ─────────────────────────────────────────────────
async function readMemory(blobId: string): Promise<AgentMemory | null> {
  try {
    const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const text = await res.text()
    return JSON.parse(text) as AgentMemory
  } catch { return null }
}

// ── Write memory to Walrus ──────────────────────────────────────────────────
async function writeMemory(memory: AgentMemory): Promise<string | null> {
  try {
    const publishers = [
      'https://publisher.walrus-testnet.walrus.space',
      'https://walrus-testnet-publisher.bartestnet.com',
      'https://walrus-testnet.staketab.org:443',
    ]
    const json = JSON.stringify(memory)
    const blob = new Blob([json], { type: 'application/json' })

    for (const pub of publishers) {
      try {
        const res = await fetch(
          `${pub}/v1/blobs?epochs=5&send_object_to=${memory.wallet}`,
          { method: 'PUT', body: blob, signal: AbortSignal.timeout(15000) }
        )
        if (!res.ok) continue
        const data = await res.json()
        const id = data.newlyCreated?.blobObject?.blobId || data.alreadyCertified?.blobId
        if (id) return id
      } catch { continue }
    }
    return null
  } catch { return null }
}

// ── Update style frequency ──────────────────────────────────────────────────
function updateFavoriteStyles(current: string[], newStyle: string): string[] {
  const updated = [...current]
  const idx = updated.indexOf(newStyle)
  if (idx > -1) {
    // Move to front (most recently used)
    updated.splice(idx, 1)
    updated.unshift(newStyle)
  } else {
    updated.unshift(newStyle)
  }
  return updated.slice(0, 5) // keep top 5
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAgentMemory(walletAddress: string | undefined) {
  const [memory,   setMemory]   = useState<AgentMemory | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [blobId,   setBlobId]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  // Load memory on mount / wallet change
  useEffect(() => {
    if (!walletAddress) { setMemory(null); return }

    const storedId = localStorage.getItem(`${MEMORY_KEY}_${walletAddress}`)
    if (!storedId) {
      // First time — create empty memory and start a session
      const fresh = EMPTY_MEMORY(walletAddress)
      fresh.totalSessions = 1
      setMemory(fresh)
      return
    }

    setLoading(true)
    readMemory(storedId).then(mem => {
      if (mem) {
        // Increment session count on load
        const updated = { ...mem, totalSessions: mem.totalSessions + 1, lastSession: new Date().toISOString() }
        setMemory(updated)
        setBlobId(storedId)
      } else {
        // Blob expired or not found — reset
        setMemory(EMPTY_MEMORY(walletAddress))
      }
    }).finally(() => setLoading(false))
  }, [walletAddress])

  // Record a new NFT mint into memory
  const recordMint = useCallback(async (record: NFTRecord) => {
    if (!walletAddress || !memory) return
    setSaving(true)
    try {
      const updated: AgentMemory = {
        ...memory,
        totalMinted:    memory.totalMinted + 1,
        lastSession:    new Date().toISOString(),
        favoriteStyles: updateFavoriteStyles(memory.favoriteStyles, record.style),
        recentPrompts:  [record.prompt, ...memory.recentPrompts.filter(p => p !== record.prompt)].slice(0, 10),
        nftHistory:     [record, ...memory.nftHistory].slice(0, 20),
      }
      setMemory(updated)

      // Persist to Walrus
      const newId = await writeMemory(updated)
      if (newId) {
        localStorage.setItem(`${MEMORY_KEY}_${walletAddress}`, newId)
        setBlobId(newId)
      }
    } finally {
      setSaving(false)
    }
  }, [memory, walletAddress])

  // Suggest prompts based on memory
  const suggestions = memory?.recentPrompts.slice(0, 3) ?? []
  const topStyle    = memory?.favoriteStyles[0] ?? null

  return {
    memory,
    loading,
    saving,
    blobId,
    recordMint,
    suggestions,
    topStyle,
    isFirstVisit: !memory || memory.totalSessions <= 1,
  }
}
