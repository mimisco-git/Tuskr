/**
 * useAgentCommands — gives the agent wallet real commands to execute
 *
 * Commands:
 *   mintNFT(prompt)        — AI generates concept, uploads SVG to Walrus, mints on Sui
 *   buyNFT(maxPriceSui)    — finds cheapest listing under budget, buys it
 *   listNFT(nftId, price)  — lists an NFT the agent owns at the given price
 *
 * All actions go through checkPolicy() + executeAutonomously() for budget enforcement.
 */
import { useCallback, useState } from 'react'
import { Transaction }           from '@mysten/sui/transactions'

const GROQ_KEY    = import.meta.env.VITE_GROQ_API_KEY ?? ''
const PUBLISHER   = 'https://publisher.walrus-testnet.walrus.space'
const AGGREGATOR  = 'https://aggregator.walrus-testnet.walrus.space'
const PKG         = import.meta.env.VITE_TESTNET_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID || ''
const MKT         = import.meta.env.VITE_TESTNET_MARKETPLACE_ID || import.meta.env.VITE_MARKETPLACE_ID || ''
const GAS_EST     = 0.015   // SUI estimate for gas per transaction

export interface CommandLog {
  id:      string
  cmd:     string
  status:  'running' | 'done' | 'failed'
  detail:  string
  txDigest?: string
}

// Generate a simple colored SVG as NFT image (no external API needed)
function makeSVG(name: string, description: string): Blob {
  const colors = ['#00d4aa','#6366f1','#f59e0b','#ec4899','#3b82f6','#8b5cf6']
  const c1 = colors[Math.floor(Math.random() * colors.length)]
  const c2 = colors[Math.floor(Math.random() * colors.length)]
  const short = name.length > 14 ? name.slice(0, 14) + '...' : name
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)" rx="32"/>
  <rect x="24" y="24" width="464" height="464" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" rx="20"/>
  <circle cx="256" cy="200" r="72" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <text x="256" y="208" font-family="Arial,sans-serif" font-size="54" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle">T</text>
  <text x="256" y="320" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.95)" text-anchor="middle">${short}</text>
  <text x="256" y="356" font-family="Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="middle">TUSKR NFT · WALRUS</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

// Upload blob to Walrus, return { blobId, mediaUrl }
async function uploadToWalrus(blob: Blob): Promise<{ blobId: string; mediaUrl: string } | null> {
  for (const pub of [PUBLISHER, 'https://walrus-testnet-publisher.bartestnet.com']) {
    try {
      const res  = await fetch(`${pub}/v1/blobs?epochs=5`, {
        method: 'PUT', body: blob, signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) continue
      const d    = await res.json()
      const blobId = d.newlyCreated?.blobObject?.blobId || d.alreadyCertified?.blobId
      if (blobId) return { blobId, mediaUrl: `${AGGREGATOR}/v1/blobs/${blobId}` }
    } catch { continue }
  }
  return null
}

// Call Groq to generate an NFT concept
async function generateConcept(prompt: string): Promise<{ name: string; description: string } | null> {
  if (!GROQ_KEY) return { name: prompt.slice(0, 32), description: `A unique Tuskr NFT: ${prompt}` }
  try {
    const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 200, temperature: 0.8,
        messages: [
          { role: 'system', content: 'You are an NFT naming expert. Reply ONLY with valid JSON: {"name":"...","description":"..."}. Name: max 32 chars. Description: max 120 chars.' },
          { role: 'user', content: `Create NFT concept for: "${prompt}"` }
        ]
      })
    })
    const d    = await res.json()
    const text = d.choices?.[0]?.message?.content ?? ''
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch { return { name: prompt.slice(0, 32), description: `A unique Tuskr NFT: ${prompt}` } }
}

export function useAgentCommands(
  agentAddr: string,
  policy: { active: boolean; maxSpendSui: number; spentSui: number },
  executeAutonomously: (tx: Transaction, cost: number, meta: { type: string; nftName: string }) => Promise<{ digest: string } | null>,
) {
  const [logs, setLogs]       = useState<CommandLog[]>([])
  const [running, setRunning] = useState(false)

  const addLog = (log: CommandLog) => setLogs(prev => [log, ...prev].slice(0, 20))
  const updLog = (id: string, patch: Partial<CommandLog>) =>
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  // ── MINT via agent ─────────────────────────────────────────────────────────
  const agentMint = useCallback(async (prompt: string) => {
    if (!policy.active) throw new Error('Agent not active. Activate policy first.')
    setRunning(true)
    const id = Date.now().toString()
    addLog({ id, cmd: `mint: "${prompt}"`, status: 'running', detail: 'Generating NFT concept with Groq AI...' })

    try {
      // 1. Generate concept
      const concept = await generateConcept(prompt)
      if (!concept) throw new Error('Concept generation failed')
      updLog(id, { detail: `Concept: "${concept.name}". Uploading image to Walrus...` })

      // 2. Create and upload SVG to Walrus
      const svg    = makeSVG(concept.name, concept.description)
      const upload = await uploadToWalrus(svg)
      if (!upload) throw new Error('Walrus upload failed. Is the agent address funded?')
      updLog(id, { detail: `Image stored on Walrus (${upload.blobId.slice(0,16)}...). Minting on Sui...` })

      // 3. Build mint transaction
      const tx = new Transaction()
      tx.setSender(agentAddr)
      tx.moveCall({
        target:    `${PKG}::tuskr_nft::mint`,
        arguments: [
          tx.pure.string(concept.name),
          tx.pure.string(concept.description),
          tx.pure.string(upload.blobId),
          tx.pure.string(upload.mediaUrl),
          tx.pure.u16(500),  // 5% royalty
        ],
      })

      // 4. Execute via agent (checks budget, signs, submits, logs to Walrus)
      const result = await executeAutonomously(tx, GAS_EST, {
        type: 'mint', nftName: concept.name,
      })

      if (result) {
        updLog(id, {
          status: 'done',
          detail: `"${concept.name}" minted. Image on Walrus. NFT in agent wallet.`,
          txDigest: result.digest,
        })
      } else {
        throw new Error('Transaction failed. Ensure agent address has testnet SUI for gas.')
      }
    } catch (e: any) {
      updLog(id, { status: 'failed', detail: e?.message || 'Mint failed' })
    } finally { setRunning(false) }
  }, [agentAddr, policy, executeAutonomously])

  // ── BUY via agent ──────────────────────────────────────────────────────────
  const agentBuy = useCallback(async (maxPriceSui: number) => {
    if (!policy.active) throw new Error('Agent not active. Activate policy first.')
    setRunning(true)
    const id = Date.now().toString()
    addLog({ id, cmd: `buy: cheapest under ${maxPriceSui} SUI`, status: 'running', detail: 'Scanning active listings...' })

    try {
      // 1. Fetch active listings and their prices
      const res  = await fetch('/api/tuskr-nfts?type=floor&network=testnet')
      const data = await res.json()
      if (!data.floorSui || data.floorSui === 0) throw new Error('No active listings found on the marketplace.')
      if (data.floorSui > maxPriceSui) throw new Error(`Cheapest listing is ${data.floorSui} SUI, above your ${maxPriceSui} SUI limit.`)

      // 2. Get the cheapest listing object ID
      const listRes  = await fetch('/api/tuskr-nfts?type=listings&network=testnet')
      const listData = await listRes.json()
      const activeIds: string[] = listData.activeIds || []
      if (!activeIds.length) throw new Error('No listings available.')

      updLog(id, { detail: `Found listing. Floor: ${data.floorSui} SUI. Fetching listing details...` })

      // 3. Fetch listing objects to find cheapest
      const RPC = 'https://fullnode.testnet.sui.io:443'
      const objRes = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'sui_multiGetObjects',
          params: [activeIds.slice(0, 20), { showContent: true }],
        })
      })
      const objData = await objRes.json()
      const listings = (objData.result || [])
        .filter((o: any) => o?.data?.content?.fields?.price)
        .map((o: any) => ({
          listingId: o.data.objectId,
          price:     BigInt(o.data.content.fields.price),
          name:      o.data.content.fields.name || 'Tuskr NFT',
        }))
        .sort((a: any, b: any) => Number(a.price - b.price))

      if (!listings.length) throw new Error('Could not read listing prices.')
      const cheapest = listings[0]
      const costSui  = Number(cheapest.price) / 1e9

      if (costSui > maxPriceSui) throw new Error(`Cheapest is ${costSui} SUI, above your ${maxPriceSui} SUI max.`)

      updLog(id, { detail: `Buying "${cheapest.name}" for ${costSui} SUI. Signing transaction...` })

      // 4. Build buy transaction
      const tx = new Transaction()
      tx.setSender(agentAddr)
      const [coin] = tx.splitCoins(tx.gas, [cheapest.price])
      tx.moveCall({
        target:    `${PKG}::tuskr_marketplace::buy`,
        arguments: [tx.object(MKT), tx.object(cheapest.listingId), coin],
      })

      const result = await executeAutonomously(tx, costSui + GAS_EST, {
        type: 'buy', nftName: cheapest.name,
      })

      if (result) {
        updLog(id, {
          status: 'done',
          detail: `Bought "${cheapest.name}" for ${costSui} SUI. NFT is now in agent wallet.`,
          txDigest: result.digest,
        })
      } else {
        throw new Error('Buy transaction failed.')
      }
    } catch (e: any) {
      updLog(id, { status: 'failed', detail: e?.message || 'Buy failed' })
    } finally { setRunning(false) }
  }, [agentAddr, policy, executeAutonomously])

  // ── LIST via agent ─────────────────────────────────────────────────────────
  const agentList = useCallback(async (nftId: string, priceSui: number) => {
    if (!policy.active) throw new Error('Agent not active. Activate policy first.')
    setRunning(true)
    const id = Date.now().toString()
    addLog({ id, cmd: `list: NFT at ${priceSui} SUI`, status: 'running', detail: 'Checking NFT ownership...' })

    try {
      const priceMist = BigInt(Math.round(priceSui * 1e9))

      updLog(id, { detail: `Listing NFT for ${priceSui} SUI. Building transaction...` })

      const tx = new Transaction()
      tx.setSender(agentAddr)
      tx.moveCall({
        target:    `${PKG}::tuskr_marketplace::list`,
        arguments: [
          tx.object(MKT),
          tx.object(nftId),
          tx.pure.u64(priceMist),
        ],
      })

      const result = await executeAutonomously(tx, GAS_EST, {
        type: 'list', nftName: `NFT at ${priceSui} SUI`,
      })

      if (result) {
        updLog(id, {
          status: 'done',
          detail: `NFT listed for sale at ${priceSui} SUI. Now visible on Tuskr marketplace.`,
          txDigest: result.digest,
        })
      } else {
        throw new Error('List transaction failed.')
      }
    } catch (e: any) {
      updLog(id, { status: 'failed', detail: e?.message || 'List failed' })
    } finally { setRunning(false) }
  }, [agentAddr, policy, executeAutonomously])

  return { agentMint, agentBuy, agentList, logs, running }
}
