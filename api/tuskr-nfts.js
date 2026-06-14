import https from 'https'

const TESTNET = 'https://fullnode.testnet.sui.io:443'
const MAINNET = 'https://fullnode.mainnet.sui.io:443'
const NEW_PKG = '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'
const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'

// Normalize any Sui ID — handles address type (string) and ID type ({id:"0x..."} or string)
function norm(v) {
  if (!v) return ''
  const raw = typeof v === 'object' ? (v.id || v.ID || '') : String(v)
  if (!raw) return ''
  return '0x' + raw.replace(/^0x/i, '').toLowerCase().padStart(64, '0')
}
function addrEq(a, b) { return norm(a) === norm(b) }

function rpc(network, method, params) {
  const url  = network === 'mainnet' ? MAINNET : TESTNET
  const body = JSON.stringify({ jsonrpc:'2.0', id:1, method, params })
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},
      timeout:20000,
    }, res => {
      let out = ''
      res.on('data', c => out += c)
      res.on('end', () => { try { resolve(JSON.parse(out)) } catch(e) { reject(e) } })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body); req.end()
  })
}

async function queryBoth(network, suffix, limit = 200) {
  const all = await Promise.all([NEW_PKG, OLD_PKG].map(pkg =>
    rpc(network, 'suix_queryEvents', [
      { MoveEventType:`${pkg}::${suffix}` }, null, limit, false
    ]).then(r => r.result?.data || []).catch(() => [])
  ))
  return all.flat()
}

// Fetch NFT names + images by object ID
async function fetchNFTData(network, rawIds) {
  const ids = [...new Set(rawIds.map(norm).filter(Boolean))]
  if (!ids.length) return {}
  const res = await rpc(network, 'sui_multiGetObjects', [
    ids, { showContent:true, showDisplay:true }
  ])
  const map = {}
  for (const o of (res.result || [])) {
    if (!o?.data) continue
    const f  = o.data.content?.fields ?? {}
    const d  = o.data.display?.data   ?? {}
    const id = norm(o.data.objectId)
    const rawUrl = f.media_url
    const urlStr = typeof rawUrl === 'string' ? rawUrl : (rawUrl?.url ?? '')
    map[id] = {
      name:     f.name    || d.name    || 'Tuskr NFT',
      blobId:   f.blob_id || d.blob_id || '',
      mediaUrl: d.image_url || urlStr  || '',
    }
  }
  return map
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const network = req.query.network || 'testnet'
  const type    = req.query.type    || 'minted'
  const address = norm(req.query.address || '')

  try {

    // ── MINTED ────────────────────────────────────────────────────────
    if (type === 'minted') {
      const events = await queryBoth(network, 'tuskr_nft::MintedEvent')
      const nfts = events.map(e => ({
        objectId: norm(e.parsedJson?.nft_id),
        name:     e.parsedJson?.name    || 'Tuskr NFT',
        blobId:   e.parsedJson?.blob_id || '',
      })).filter(n => n.objectId)
      return res.json({ nfts })
    }

    // ── ACTIVE LISTINGS ───────────────────────────────────────────────
    if (type === 'listings') {
      const [listed, sold, delisted] = await Promise.all([
        queryBoth(network, 'tuskr_marketplace::ListedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
        queryBoth(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))
      const activeIds   = [...new Set(
        listed
          .map(e => norm(e.parsedJson?.listing_id))
          .filter(id => id && !soldIds.has(id) && !delistedIds.has(id))
      )]
      return res.json({ activeIds })
    }

    // ── USER LISTINGS (Profile Listed tab) ───────────────────────────
    if (type === 'user_listings') {
      if (!address) return res.json({ listings:[] })
      const [listed, sold, delisted] = await Promise.all([
        queryBoth(network, 'tuskr_marketplace::ListedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
        queryBoth(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))

      const mine = listed.filter(e => {
        const lid = norm(e.parsedJson?.listing_id)
        return addrEq(e.parsedJson?.seller, address)
          && lid && !soldIds.has(lid) && !delistedIds.has(lid)
      })

      const rawNftIds = mine.map(e => norm(e.parsedJson?.nft_id)).filter(Boolean)
      const nftData   = await fetchNFTData(network, rawNftIds)

      return res.json({
        listings: mine.map(e => {
          const nftId = norm(e.parsedJson?.nft_id)
          const info  = nftData[nftId] || {}
          return {
            listingId: norm(e.parsedJson?.listing_id),
            nftId,
            name:     info.name     || 'Tuskr NFT',
            blobId:   info.blobId   || '',
            mediaUrl: info.mediaUrl || '',
            price:    String(e.parsedJson?.price || '0'),
          }
        })
      })
    }

    // ── USER SOLD (Profile Sold tab) ─────────────────────────────────
    if (type === 'user_sold') {
      if (!address) return res.json({ sold:[] })
      const events = await queryBoth(network, 'tuskr_marketplace::SoldEvent')
      const mine   = events.filter(e => addrEq(e.parsedJson?.seller, address))

      const rawNftIds = mine.map(e => norm(e.parsedJson?.nft_id)).filter(Boolean)
      const nftData   = await fetchNFTData(network, rawNftIds)

      return res.json({
        sold: mine.map(e => {
          const nftId = norm(e.parsedJson?.nft_id)
          const info  = nftData[nftId] || {}
          return {
            nftId,
            name:   info.name   || 'Tuskr NFT',
            blobId: info.blobId || '',
            price:  String(e.parsedJson?.price || '0'),
            buyer:  e.parsedJson?.buyer || '',
          }
        })
      })
    }

    // ── USER BOUGHT (Profile Purchased tab) ──────────────────────────
    if (type === 'user_bought') {
      if (!address) return res.json({ bought:[] })
      const events = await queryBoth(network, 'tuskr_marketplace::SoldEvent')
      const mine   = events.filter(e => addrEq(e.parsedJson?.buyer, address))

      const rawNftIds = mine.map(e => norm(e.parsedJson?.nft_id)).filter(Boolean)
      const nftData   = await fetchNFTData(network, rawNftIds)

      return res.json({
        bought: mine.map(e => {
          const nftId = norm(e.parsedJson?.nft_id)
          const info  = nftData[nftId] || {}
          return {
            nftId,
            name:     info.name     || 'Tuskr NFT',
            blobId:   info.blobId   || '',
            mediaUrl: info.mediaUrl || '',
            price:    String(e.parsedJson?.price || '0'),
            seller:   e.parsedJson?.seller || '',
          }
        })
      })
    }

    res.status(400).json({ error:'Unknown type' })
  } catch(err) {
    res.status(500).json({ error:String(err) })
  }
}
