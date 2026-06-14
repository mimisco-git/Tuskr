/**
 * useAgentCommands
 *
 * Single natural-language command interface for the agent wallet.
 * You type what you want. Groq AI parses the intent. Agent executes.
 *
 * Real image generation: Pollinations.ai (free, no API key, Flux model)
 * Text/concept: Groq AI (llama-3.3-70b)
 * Execution: agent wallet (Ed25519, budget-enforced, no popup)
 */
import { useCallback, useState } from 'react'
import { Transaction }           from '@mysten/sui/transactions'

const GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY ?? ''
const PKG        = import.meta.env.VITE_TESTNET_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID || ''
const MKT        = import.meta.env.VITE_TESTNET_MARKETPLACE_ID || import.meta.env.VITE_MARKETPLACE_ID || ''
const PUBLISHER  = 'https://publisher.walrus-testnet.walrus.space'
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
const GAS        = 0.015

export interface ParsedCommand {
  action:    'mint' | 'buy' | 'list' | 'unknown'
  prompt?:   string   // for mint: what to generate
  maxPrice?: number   // for buy: ceiling price in SUI
  nftId?:    string   // for list: which NFT
  price?:    number   // for list: sale price in SUI
  raw:       string   // original user input
}

export interface CommandResult {
  id:       string
  input:    string
  status:   'parsing' | 'generating' | 'uploading' | 'executing' | 'done' | 'failed'
  message:  string
  txDigest?: string
}

// ── Step 1: parse user input with Groq ──────────────────────────────────────
async function parseCommand(input: string): Promise<ParsedCommand> {
  if (!GROQ_KEY) {
    // Fallback: simple keyword matching
    const lower = input.toLowerCase()
    if (lower.includes('mint'))  return { action:'mint',  prompt: input.replace(/mint/i,'').trim(), raw: input }
    if (lower.includes('buy'))   return { action:'buy',   maxPrice: parseFloat(lower.match(/[\d.]+/)?.[0]||'2'), raw: input }
    if (lower.includes('list'))  return { action:'list',  price: parseFloat(lower.match(/[\d.]+/)?.[0]||'2'), raw: input }
    return { action:'unknown', raw: input }
  }

  try {
    const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 200, temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You parse NFT agent commands. Reply ONLY with valid JSON.

Actions:
- mint: user wants to create/generate/make an NFT. Extract the visual description as "prompt".
- buy: user wants to purchase an NFT. Extract max price as "maxPrice" (number in SUI, default 2).
- list: user wants to list/sell an NFT. Extract "price" (SUI) and "nftId" if mentioned (0x... address).

Format: {"action":"mint","prompt":"..."} or {"action":"buy","maxPrice":2} or {"action":"list","price":3,"nftId":"0x...or empty"}`
          },
          { role: 'user', content: input }
        ]
      })
    })
    const d    = await res.json()
    const text = d.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim())
    return { ...parsed, raw: input }
  } catch {
    return { action:'unknown', raw: input }
  }
}

// ── Step 2 (for mint): generate concept + real AI image via Pollinations ─────
async function generateConceptAndImage(prompt: string): Promise<{
  name: string; description: string; blobId: string; mediaUrl: string
} | null> {

  // Parallel: Groq generates the concept AND Pollinations generates the image
  const seed = Math.floor(Math.random() * 999999)
  const encodedPrompt = encodeURIComponent(`${prompt}, NFT digital art, vibrant, detailed, professional`)
  const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}&model=flux`

  const [conceptRes, imgBlob] = await Promise.all([
    // Groq: generate name + description
    GROQ_KEY ? fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 150, temperature: 0.85,
        messages: [
          { role:'system', content:'Reply ONLY with JSON: {"name":"...max 30 chars","description":"...max 100 chars"}' },
          { role:'user', content:`NFT name and description for: "${prompt}"` }
        ]
      })
    }).then(r => r.json()).catch(() => null) : Promise.resolve(null),

    // Pollinations: fetch the generated image as a blob
    fetch(imgUrl, { signal: AbortSignal.timeout(30000) })
      .then(r => r.ok ? r.blob() : null)
      .catch(() => null),
  ])

  // Parse concept
  let name = prompt.slice(0,30)
  let description = `A unique NFT: ${prompt}`
  if (conceptRes) {
    try {
      const text = conceptRes.choices?.[0]?.message?.content ?? ''
      const c = JSON.parse(text.replace(/```json|```/g,'').trim())
      name = c.name || name
      description = c.description || description
    } catch { /* use defaults */ }
  }

  // Upload image to Walrus
  if (!imgBlob) return null
  for (const pub of [PUBLISHER, 'https://walrus-testnet-publisher.bartestnet.com']) {
    try {
      const r = await fetch(`${pub}/v1/blobs?epochs=5`, {
        method:'PUT', body: imgBlob, signal: AbortSignal.timeout(25000),
      })
      if (!r.ok) continue
      const d = await r.json()
      const blobId = d.newlyCreated?.blobObject?.blobId || d.alreadyCertified?.blobId
      if (blobId) return { name, description, blobId, mediaUrl:`${AGGREGATOR}/v1/blobs/${blobId}` }
    } catch { continue }
  }
  return null
}

// ── Step 3: execute on-chain ─────────────────────────────────────────────────
export function useAgentCommands(
  agentAddr:           string,
  policy:              { active: boolean; maxSpendSui: number; spentSui: number },
  executeAutonomously: (tx: Transaction, cost: number, meta: { type: string; nftName: string }) => Promise<{ digest: string } | null>,
) {
  const [result,  setResult]  = useState<CommandResult | null>(null)
  const [running, setRunning] = useState(false)

  const upd = (patch: Partial<CommandResult>) => setResult(prev => prev ? { ...prev, ...patch } : null)

  const runCommand = useCallback(async (input: string) => {
    if (!input.trim() || !policy.active) return
    setRunning(true)
    const id = Date.now().toString()
    setResult({ id, input, status:'parsing', message:'Understanding your command...' })

    try {
      const cmd = await parseCommand(input)

      // ── MINT ──────────────────────────────────────────────────────────────
      if (cmd.action === 'mint') {
        const prompt = cmd.prompt || input
        upd({ status:'generating', message:`Groq AI is creating the concept. Pollinations.ai is generating the image for "${prompt}"...` })

        const data = await generateConceptAndImage(prompt)
        if (!data) throw new Error('Image generation or Walrus upload failed. Check your connection.')

        upd({ status:'uploading', message:`"${data.name}" ready. Image stored on Walrus. Minting on Sui...` })

        const tx = new Transaction()
        tx.setSender(agentAddr)
        tx.moveCall({
          target: `${PKG}::tuskr_nft::mint`,
          arguments: [
            tx.pure.string(data.name),
            tx.pure.string(data.description),
            tx.pure.string(data.blobId),
            tx.pure.string(data.mediaUrl),
            tx.pure.u16(500),
          ],
        })

        upd({ status:'executing', message:'Agent signing mint transaction. No wallet popup...' })
        const res = await executeAutonomously(tx, GAS, { type:'mint', nftName: data.name })
        if (res) {
          upd({ status:'done', message:`"${data.name}" minted! Image on Walrus. NFT is in agent wallet. Go to Suiscan to see it.`, txDigest: res.digest })
        } else {
          throw new Error('Mint failed. Fund the agent address with testnet SUI first.')
        }

      // ── BUY ───────────────────────────────────────────────────────────────
      } else if (cmd.action === 'buy') {
        const maxP = cmd.maxPrice ?? 2
        upd({ status:'executing', message:`Scanning marketplace for cheapest NFT under ${maxP} SUI...` })

        const [floorRes, listRes] = await Promise.all([
          fetch('/api/tuskr-nfts?type=floor&network=testnet').then(r=>r.json()),
          fetch('/api/tuskr-nfts?type=listings&network=testnet').then(r=>r.json()),
        ])

        if (!floorRes.floorSui) throw new Error('No active listings on the marketplace right now.')
        if (floorRes.floorSui > maxP) throw new Error(`Cheapest listing is ${floorRes.floorSui} SUI. Raise your max price above ${floorRes.floorSui}.`)

        const ids: string[] = listRes.activeIds?.slice(0, 20) || []
        if (!ids.length) throw new Error('No listing IDs found.')

        const rpcRes = await fetch('https://fullnode.testnet.sui.io:443', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'sui_multiGetObjects', params:[ids,{showContent:true}] })
        })
        const rpcData = await rpcRes.json()
        const listings = (rpcData.result||[])
          .filter((o:any) => o?.data?.content?.fields?.price)
          .map((o:any) => ({ listingId:o.data.objectId, price:BigInt(o.data.content.fields.price), name:o.data.content.fields.name||'Tuskr NFT' }))
          .sort((a:any,b:any) => Number(a.price - b.price))

        if (!listings.length) throw new Error('Could not read listing details.')
        const pick = listings[0]
        const costSui = Number(pick.price) / 1e9

        upd({ status:'executing', message:`Found "${pick.name}" at ${costSui} SUI. Agent buying...` })

        const tx = new Transaction()
        tx.setSender(agentAddr)
        const [coin] = tx.splitCoins(tx.gas, [pick.price])
        tx.moveCall({
          target:`${PKG}::tuskr_marketplace::buy`,
          arguments:[tx.object(MKT), tx.object(pick.listingId), coin],
        })

        const res = await executeAutonomously(tx, costSui + GAS, { type:'buy', nftName: pick.name })
        if (res) {
          upd({ status:'done', message:`Bought "${pick.name}" for ${costSui} SUI. NFT is now in agent wallet.`, txDigest: res.digest })
        } else {
          throw new Error('Buy failed. Fund agent address with testnet SUI.')
        }

      // ── LIST ──────────────────────────────────────────────────────────────
      } else if (cmd.action === 'list') {
        const price = cmd.price ?? 2
        const nftId = cmd.nftId || ''
        if (!nftId) throw new Error('NFT ID not found in your command. Try: "list NFT 0x123...abc at 3 SUI"')

        upd({ status:'executing', message:`Listing NFT at ${price} SUI. Agent signing...` })

        const tx = new Transaction()
        tx.setSender(agentAddr)
        tx.moveCall({
          target:`${PKG}::tuskr_marketplace::list`,
          arguments:[tx.object(MKT), tx.object(nftId), tx.pure.u64(BigInt(Math.round(price*1e9)))],
        })

        const res = await executeAutonomously(tx, GAS, { type:'list', nftName:`NFT at ${price} SUI` })
        if (res) {
          upd({ status:'done', message:`Listed for ${price} SUI. Now visible on the marketplace.`, txDigest: res.digest })
        } else {
          throw new Error('List failed. Ensure the NFT is in the agent wallet.')
        }

      } else {
        throw new Error(`Could not understand: "${input}". Try: "mint a sunset NFT", "buy cheapest under 2 SUI", or "list NFT 0x... at 3 SUI"`)
      }

    } catch (e: any) {
      upd({ status:'failed', message: e?.message || 'Command failed.' })
    } finally {
      setRunning(false)
    }
  }, [agentAddr, policy, executeAutonomously])

  return { runCommand, result, running }
}
