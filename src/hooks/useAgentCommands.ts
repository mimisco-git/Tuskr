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
  action:    'mint' | 'buy' | 'list' | 'watch' | 'unknown'
  prompt?:   string   // for mint: what to generate
  maxPrice?: number   // for buy: ceiling price in SUI
  threshold?: number  // for watch: price level to monitor
  direction?: 'above' | 'below'  // for watch: trigger direction
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

// ── Keyword fallback — always runs if Groq fails or returns unknown ──────────
function keywordParse(input: string): ParsedCommand {
  const lower = input.toLowerCase()
  const nums  = lower.match(/[\d.]+/g) || []
  const firstNum = parseFloat(nums[0] || '1')

  if (lower.includes('mint') || lower.includes('generate') || lower.includes('create') || lower.includes('make'))
    return { action:'mint', prompt: input.replace(/^(mint|generate|create|make)\s+/i,'').trim() || input, raw: input }

  if (lower.includes('buy') || lower.includes('purchase'))
    return { action:'buy', maxPrice: firstNum, raw: input }

  if (lower.includes('list') || lower.includes('sell'))
    return { action:'list', price: firstNum, raw: input }

  if (lower.includes('watch') || lower.includes('alert') || lower.includes('notify') || lower.includes('monitor')
      || lower.includes('crosses') || lower.includes('reaches') || lower.includes('hits')
      || lower.includes('drops') || lower.includes('rises') || lower.includes('price')) {
    const isAbove = lower.includes('above') || lower.includes('rises') || lower.includes('crosses')
      || lower.includes('reaches') || lower.includes('hits')
      || (!lower.includes('below') && !lower.includes('drops') && !lower.includes('falls'))
    return { action:'watch', threshold: firstNum, maxPrice: firstNum, direction: isAbove ? 'above' : 'below', raw: input }
  }

  return { action:'unknown', raw: input }
}

// ── Step 1: parse user input — Groq first, keyword fallback always ready ──────
async function parseCommand(input: string): Promise<ParsedCommand> {
  // Always compute keyword result as backup
  const keyword = keywordParse(input)

  // If no Groq key, keyword is the only parser
  if (!GROQ_KEY) return keyword

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
- watch: user wants a price alert for SUI/USDC. Words like: alert, notify, watch, monitor, crosses, reaches, hits, above, below, drops, rises. Extract "threshold" (number, the price level) and "direction" ("above" if SUI rises/crosses/above, "below" if SUI drops/falls/below).

Format: {"action":"mint","prompt":"..."} or {"action":"buy","maxPrice":2} or {"action":"list","price":3,"nftId":""} or {"action":"watch","threshold":0.9,"direction":"above"}`
          },
          { role: 'user', content: input }
        ]
      })
    })
    const d    = await res.json()
    const text = d.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim())
    // If Groq says unknown, try keyword fallback before giving up
    if (!parsed.action || parsed.action === 'unknown') return keyword
    return { ...parsed, raw: input }
  } catch {
    // Groq failed — use keyword matching instead of returning unknown
    return keyword
  }
}

// If Groq returned unknown action, fall through to keyword matching
// (handled below in the try block — we add this check there)

// ── Canvas fallback: premium procedural art when Pollinations is unavailable ─
function makeCanvasBlob(name: string): Promise<Blob> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const seed = name.split('').reduce((a,c)=>a+c.charCodeAt(0),0)
    const rng = (offset=0) => ((seed*9301+49297+offset)%233280)/233280

    // Deep layered background
    const palettes = [
      ['#0d1117','#0a2a1a','#00d4aa'],
      ['#0d0820','#1a0530','#6366f1'],
      ['#1a0505','#2d0a0a','#f59e0b'],
      ['#000d1a','#001a33','#3b82f6'],
      ['#1a0010','#2d0020','#ec4899'],
      ['#0a1a00','#142800','#10b981'],
    ]
    const [bg1,bg2,accent] = palettes[Math.floor(rng()*palettes.length)]

    // Background gradient
    const bgGr = ctx.createRadialGradient(256,256,60,256,256,360)
    bgGr.addColorStop(0, bg2); bgGr.addColorStop(1, bg1)
    ctx.fillStyle = bgGr; ctx.fillRect(0,0,512,512)

    // Layered geometric shapes — unique per name
    for (let i=0;i<12;i++) {
      const x = rng(i*7)*512, y = rng(i*13)*512
      const r = 30+rng(i*3)*120
      const gr2 = ctx.createRadialGradient(x,y,0,x,y,r)
      gr2.addColorStop(0,accent+'22'); gr2.addColorStop(1,'transparent')
      ctx.fillStyle=gr2; ctx.beginPath()
      ctx.arc(x,y,r,0,Math.PI*2); ctx.fill()
    }

    // Diagonal light sweep
    const sweep = ctx.createLinearGradient(0,0,512,512)
    sweep.addColorStop(0,'transparent')
    sweep.addColorStop(0.4,accent+'0A')
    sweep.addColorStop(0.6,accent+'18')
    sweep.addColorStop(1,'transparent')
    ctx.fillStyle=sweep; ctx.fillRect(0,0,512,512)

    // Hexagonal pattern overlay
    ctx.strokeStyle=accent+'1A'; ctx.lineWidth=0.8
    for(let row=-1;row<10;row++){
      for(let col=-1;col<8;col++){
        const hx = col*70+(row%2)*35, hy = row*60
        ctx.beginPath()
        for(let s=0;s<6;s++){
          const a=s*Math.PI/3-Math.PI/6
          const px=hx+28*Math.cos(a), py=hy+28*Math.sin(a)
          s===0?ctx.moveTo(px,py):ctx.lineTo(px,py)
        }
        ctx.closePath(); ctx.stroke()
      }
    }

    // Central glow orb
    const orb = ctx.createRadialGradient(256,200,0,256,200,180)
    orb.addColorStop(0,accent+'30'); orb.addColorStop(0.5,accent+'10'); orb.addColorStop(1,'transparent')
    ctx.fillStyle=orb; ctx.fillRect(0,0,512,512)

    // NFT name — clean, prominent
    ctx.textAlign='center'
    ctx.shadowColor=accent; ctx.shadowBlur=20
    ctx.fillStyle='rgba(255,255,255,0.95)'
    ctx.font='bold 28px -apple-system, Arial'
    const words = name.split(' ')
    if(words.length<=3){
      ctx.fillText(name.slice(0,26),256,340)
    } else {
      ctx.font='bold 22px -apple-system, Arial'
      ctx.fillText(words.slice(0,3).join(' '),256,330)
      if(words.length>3) ctx.fillText(words.slice(3,6).join(' '),256,360)
    }

    // Tuskr badge at bottom
    ctx.shadowBlur=0
    ctx.fillStyle=accent+'CC'
    ctx.font='bold 11px monospace'
    ctx.fillText('TUSKR NFT · WALRUS STORED',256,430)

    // Edge vignette
    const vign = ctx.createRadialGradient(256,256,180,256,256,362)
    vign.addColorStop(0,'transparent'); vign.addColorStop(1,'rgba(0,0,0,0.65)')
    ctx.fillStyle=vign; ctx.fillRect(0,0,512,512)

    canvas.toBlob(b => resolve(b!),'image/png',0.95)
  })
}

// ── Step 2 (for mint): generate concept + AI image (Pollinations) ────────────
async function generateConceptAndImage(
  prompt: string,
  onStatus: (msg: string) => void
): Promise<{ name: string; description: string; blobId: string; mediaUrl: string } | null> {

  // 1. Generate NFT concept with Groq (fast, parallel)
  let name = prompt.slice(0,30)
  let description = `A unique Tuskr NFT: ${prompt}`

  const conceptPromise = GROQ_KEY
    ? fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization':`Bearer ${GROQ_KEY}`,'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'llama-3.3-70b-versatile', max_tokens:150, temperature:0.85,
          messages:[
            {role:'system',content:'Reply ONLY with JSON: {"name":"...max 30 chars","description":"...max 100 chars"}'},
            {role:'user',content:`NFT name and description for: "${prompt}"`}
          ]
        })
      }).then(r=>r.json()).catch(()=>null)
    : Promise.resolve(null)

  // 2. Try Pollinations.ai for real AI image — 3 models, 90s timeout, content-type check
  onStatus(`Generating AI image for "${prompt}" via Pollinations.ai...`)
  const seed = Math.floor(Math.random() * 999999)
  const encoded = encodeURIComponent(`${prompt}, NFT digital art, vibrant, ultra detailed, 4k`)
  const models = ['turbo', 'flux', 'flux-realism']

  let imgBlob: Blob | null = null
  for (const model of models) {
    if (imgBlob) break
    try {
      const polUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}&model=${model}`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 90000)
      const r = await fetch(polUrl, { signal: controller.signal })
      clearTimeout(timer)
      const ct = r.headers.get('content-type') || ''
      if (r.ok && ct.startsWith('image/')) {
        const blob = await r.blob()
        if (blob.size > 5000) {         // real image, not an error page
          imgBlob = blob
          onStatus('AI image ready. Uploading to Walrus...')
        }
      }
    } catch {
      if (model === models[models.length-1]) {
        onStatus('Pollinations.ai unavailable. Using procedural artwork...')
      }
    }
  }

  // 3. Canvas fallback if Pollinations fails or times out
  if (!imgBlob || imgBlob.size < 1000) {
    onStatus('Generating artwork locally and uploading to Walrus...')
    // Wait for concept first so we have the name
    const conceptRes = await conceptPromise
    if (conceptRes) {
      try {
        const text = conceptRes.choices?.[0]?.message?.content ?? ''
        const c = JSON.parse(text.replace(/```json|```/g,'').trim())
        name = c.name || name; description = c.description || description
      } catch { /* use defaults */ }
    }
    imgBlob = await makeCanvasBlob(name)
  } else {
    // Also resolve concept
    const conceptRes = await conceptPromise
    if (conceptRes) {
      try {
        const text = conceptRes.choices?.[0]?.message?.content ?? ''
        const c = JSON.parse(text.replace(/```json|```/g,'').trim())
        name = c.name || name; description = c.description || description
      } catch { /* use defaults */ }
    }
  }

  // 4. Upload to Walrus
  const publishers = [PUBLISHER, 'https://walrus-testnet-publisher.bartestnet.com', 'https://walrus-testnet.staketab.org:443']
  for (const pub of publishers) {
    try {
      const r = await fetch(`${pub}/v1/blobs?epochs=5`, {
        method:'PUT', body: imgBlob,
        signal: AbortSignal.timeout(30000),
      })
      if (!r.ok) continue
      const d = await r.json()
      const blobId = d.newlyCreated?.blobObject?.blobId || d.alreadyCertified?.blobId
      if (blobId) return { name, description, blobId, mediaUrl:`${AGGREGATOR}/v1/blobs/${blobId}` }
    } catch { continue }
  }

  throw new Error('Walrus upload failed after 3 attempts. Check your internet connection.')
}

// ── Step 3: execute on-chain ─────────────────────────────────────────────────
export function useAgentCommands(
  agentAddr:           string,
  policy:              { active: boolean; maxSpendSui: number; spentSui: number },
  executeAutonomously: (tx: Transaction, cost: number, meta: { type: string; nftName: string }) => Promise<{ digest: string } | null>,
  logAction?: (action: { id: string; ts: string; type: string; nftName: string; costSui: number; txDigest: string; status: 'success'|'failed'|'blocked'; reason?: string }) => Promise<void>,
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

        const data = await generateConceptAndImage(prompt, (msg) => upd({ message: msg }))

        upd({ status:'uploading', message:`"${data!.name}" ready. Image stored on Walrus. Minting on Sui...` })

        const tx = new Transaction()
        tx.setSender(agentAddr)
        tx.moveCall({
          target: `${PKG}::tuskr_nft::mint`,
          arguments: [
            tx.pure.string(data!.name),
            tx.pure.string(data!.description),
            tx.pure.string(data!.blobId),
            tx.pure.string(data!.mediaUrl),
            tx.pure.u16(500),
          ],
        })

        upd({ status:'executing', message:'Agent signing mint transaction. No wallet popup...' })
        const res = await executeAutonomously(tx, GAS, { type:'mint', nftName: data!.name })
        if (res) {
          upd({ status:'done', message:`"${data!.name}" minted! Image on Walrus. NFT is in agent wallet. Go to Suiscan to see it.`, txDigest: res.digest })
        } else {
          throw new Error('Mint failed. Fund the agent address with testnet SUI first.')
        }

      // ── BUY ───────────────────────────────────────────────────────────────
      } else if (cmd.action === 'buy') {
        const maxP = cmd.maxPrice ?? 2
        // Check budget FIRST before even scanning marketplace
        const remaining = policy.maxSpendSui - policy.spentSui
        if (remaining < GAS + 0.001) {
          throw new Error(`Agent budget too low (${remaining.toFixed(4)} SUI remaining). Top up the agent address or increase the budget.`)
        }
        const effectiveMax = Math.min(maxP, remaining - GAS)
        upd({ status:'executing', message:`Scanning marketplace for cheapest NFT under ${effectiveMax.toFixed(3)} SUI (budget: ${remaining.toFixed(4)} SUI)...` })

        const [floorRes, listRes] = await Promise.all([
          fetch('/api/tuskr-nfts?type=floor&network=testnet').then(r=>r.json()),
          fetch('/api/tuskr-nfts?type=listings&network=testnet').then(r=>r.json()),
        ])

        if (!floorRes.floorSui) throw new Error('No active listings on the marketplace right now.')
        if (floorRes.floorSui > maxP) throw new Error(`Cheapest listing is ${floorRes.floorSui} SUI. Your max is ${maxP} SUI. Try: "buy cheapest under ${Math.ceil(floorRes.floorSui + 0.5)} SUI"`)
        if (floorRes.floorSui + GAS > remaining) {
          throw new Error(`Cheapest NFT is ${floorRes.floorSui} SUI but agent budget is only ${remaining.toFixed(4)} SUI. Increase the budget in Step 2 above.`)
        }

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
          .filter((l:any) => Number(l.price)/1e9 <= effectiveMax)
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

      // ── WATCH: monitor DeepBook price and notify ─────────────────────────────
      } else if (cmd.action === 'watch') {
        const threshold = cmd.threshold ?? cmd.maxPrice ?? 1
        const direction = cmd.direction ?? 'below'
        const dirLabel  = direction === 'above' ? `rises above $${threshold}` : `drops below $${threshold}`

        upd({ status:'executing', message:`Setting up price monitor. Agent will alert when SUI/USDC ${dirLabel}...` })

        // Log this price alert to Walrus via activity log
        await logAction?.({
          id: Date.now().toString(), ts: new Date().toISOString(),
          type: 'watch', nftName: `Price alert: SUI ${dirLabel}`,
          costSui: 0, txDigest: '', status: 'success',
        })

        // Poll DeepBook price every 60s for 24h
        let checks = 0
        const maxChecks = 60 * 24
        const poll = setInterval(async () => {
          checks++
          if (checks > maxChecks) { clearInterval(poll); return }
          try {
            const r = await fetch('/api/deepbook-price', { signal: AbortSignal.timeout(5000) })
            const d = await r.json()
            const price = Number(d.price)
            const triggered = direction === 'above' ? price >= threshold : price <= threshold
            if (price > 0 && triggered) {
              clearInterval(poll)
              upd({ status:'done', message:`Alert triggered! SUI is now $${price.toFixed(4)}, which ${direction === 'above' ? 'crossed above' : 'dropped below'} your $${threshold} threshold. Check agent commands to act.` })
              await logAction?.({
                id: Date.now().toString(), ts: new Date().toISOString(),
                type: 'watch', nftName: `SUI hit $${price.toFixed(4)} (alert: ${dirLabel})`,
                costSui: 0, txDigest: '', status: 'success',
              })
            }
          } catch { /* ignore polling errors */ }
        }, 60_000)

        upd({ status:'done', message:`Price monitor active via DeepBook. Checking every 60 seconds. Will alert when SUI/USDC ${dirLabel}.` })

      } else {
        throw new Error(`Could not understand: "${input}". Try: "mint a sunset NFT", "buy cheapest under 2 SUI", "alert me when SUI crosses $0.90", or "list NFT 0x... at 3 SUI"`)
      }

    } catch (e: any) {
      upd({ status:'failed', message: e?.message || 'Command failed.' })
    } finally {
      setRunning(false)
    }
  }, [agentAddr, policy, executeAutonomously])

  return { runCommand, result, running }
}
