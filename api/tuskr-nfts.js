import https from 'https'

const TESTNET = 'https://fullnode.testnet.sui.io:443'
const MAINNET = 'https://fullnode.mainnet.sui.io:443'
const NEW_PKG = '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'
const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'

// ── Normalize any Sui address/ID to lowercase 0x + 64 hex chars ─────────────
function norm(id) {
  if (!id) return ''
  // sui::object::ID serializes as {id:"0x..."} in parsedJson
  const raw = (typeof id === 'object') ? (id.id || id.ID || '') : String(id)
  if (!raw) return ''
  const hex = raw.replace(/^0x/i, '').toLowerCase()
  return '0x' + hex.padStart(64, '0')
}

// ── RPC call ─────────────────────────────────────────────────────────────────
function rpc(network, method, params) {
  const url  = network === 'mainnet' ? MAINNET : TESTNET
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 20000,
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

// ── Query events from both packages ──────────────────────────────────────────
async function queryBoth(network, suffix, limit = 200) {
  const results = await Promise.all([NEW_PKG, OLD_PKG].map(pkg =>
    rpc(network, 'suix_queryEvents', [
      { MoveEventType: `${pkg}::${suffix}` }, null, limit, false
    ]).then(r => r.result?.data || []).catch(() => [])
  ))
  return results.flat()
}

// ── Fetch NFT object data (name, blobId, mediaUrl) ───────────────────────────
async function fetchNFTData(network, ids) {
  if (!ids.length) return {}
  const clean = [...new Set(ids.map(norm).filter(Boolean))]
  if (!clean.length) return {}
  const res = await rpc(network, 'sui_multiGetObjects', [
    clean, { showContent: true, showDisplay: true }
  ])
  const map = {}
  for (const o of (res.result || [])) {
    if (!o?.data) continue
    const f  = o.data.content?.fields ?? {}
    const d  = o.data.display?.data   ?? {}
    const id = norm(o.data.objectId)
    map[id] = {
      name:     f.name    || d.name    || 'Tuskr NFT',
      blobId:   f.blob_id || d.blob_id || '',
      mediaUrl: f.media_url?.url || f.media_url || d.image_url || '',
    }
  }
  return map
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const network = req.query.network || 'testnet'
  const type    = req.query.type    || 'minted'
  const address = norm(req.query.address || '')   // normalize incoming address

  try {

    // ── MINTED NFTs ────────────────────────────────────────────────────────
    if (type === 'minted') {
      const events = await queryBoth(network, 'tuskr_nft::MintedEvent')
      const nfts = events.map(e => ({
        objectId: norm(e.parsedJson?.nft_id),
        name:     e.parsedJson?.name    || 'Tuskr NFT',
        blobId:   e.parsedJson?.blob_id || '',
      })).filter(n => n.objectId)
      return res.json({ nfts })
    }

    // ── ACTIVE LISTINGS ───────────────────────────────────────────────────
    if (type === 'listings') {
      const [listed, sold, delisted] = await Promise.all([
        queryBoth(network, 'tuskr_marketplace::ListedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
        queryBoth(network, 'tuskr_marketplace::DelistedEvent'),
      ])

      // Normalize ALL listing_ids before comparison
      const soldIds     = new Set(sold.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))

      const activeIds = listed
        .map(e => norm(e.parsedJson?.listing_id))
        .filter(id => id && !soldIds.has(id) && !delistedIds.has(id))

      return res.json({ activeIds: [...new Set(activeIds)] })
    }

    // ── USER LISTINGS (Profile Listed tab) ───────────────────────────────
    if (type === 'user_listings') {
      if (!address) return res.json({ listings: [] })
      const [listed, sold, delisted] = await Promise.all([
        queryBoth(network, 'tuskr_marketplace::ListedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
        queryBoth(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => norm(e.parsedJson?.listing_id)).filter(Boolean))

      const mine = listed.filter(e => {
        const lid = norm(e.parsedJson?.listing_id)
        return (norm(e.parsedJson?.seller) === address || norm(e.sender) === address)
          && lid
          && !soldIds.has(lid)
          && !delistedIds.has(lid)
      })

      const nftIds  = mine.map(e => norm(e.parsedJson?.nft_id?.id || e.parsedJson?.nft_id)).filter(Boolean)
      const nftData = await fetchNFTData(network, nftIds)

      const listings = mine.map(e => {
        const nftId = norm(e.parsedJson?.nft_id?.id || e.parsedJson?.nft_id)
        const info  = nftData[nftId] || {}
        return {
          listingId: norm(e.parsedJson?.listing_id),
          nftId,
          name:     info.name     || 'Tuskr NFT',
          blobId:   info.blobId   || '',
          mediaUrl: info.mediaUrl || '',
          price:    e.parsedJson?.price || '0',
        }
      })
      return res.json({ listings })
    }

    // ── USER SOLD (Profile Sold tab) ─────────────────────────────────────
    if (type === 'user_sold') {
      if (!address) return res.json({ sold: [] })
      const events = await queryBoth(network, 'tuskr_marketplace::SoldEvent')

      // seller is who listed it — normalize and compare
      const mine = events.filter(e => norm(e.parsedJson?.seller) === address)

      const nftIds  = mine.map(e => norm(e.parsedJson?.nft_id?.id || e.parsedJson?.nft_id)).filter(Boolean)
      const nftData = await fetchNFTData(network, nftIds)

      const sold = mine.map(e => {
        const nftId = norm(e.parsedJson?.nft_id?.id || e.parsedJson?.nft_id)
        const info  = nftData[nftId] || {}
        return {
          listingId: norm(e.parsedJson?.listing_id),
          nftId,
          name:     info.name     || 'Tuskr NFT',
          blobId:   info.blobId   || '',
          price:    e.parsedJson?.price || '0',
          buyer:    e.parsedJson?.buyer || '',
        }
      })
      return res.json({ sold })
    }

    // ── BOUGHT NFTs — for Profile Owned tab ──────────────────────────────
    if (type === 'user_bought') {
      if (!address) return res.json({ bought: [] })
      const events = await queryBoth(network, 'tuskr_marketplace::SoldEvent')

      // buyer is who called buy()
      const mine = events.filter(e => norm(e.parsedJson?.buyer) === address)

      const nftIds  = mine.map(e => norm(e.parsedJson?.nft_id?.id || e.parsedJson?.nft_id)).filter(Boolean)
      const nftData = await fetchNFTData(network, nftIds)

      const bought = mine.map(e => {
        const nftId = norm(e.parsedJson?.nft_id)
        const info  = nftData[nftId] || {}
        return {
          nftId,
          name:     info.name     || 'Tuskr NFT',
          blobId:   info.blobId   || '',
          mediaUrl: info.mediaUrl || '',
          price:    e.parsedJson?.price || '0',
          seller:   e.parsedJson?.seller || '',
        }
      })
      return res.json({ bought })
    }

    res.status(400).json({ error: 'Unknown type' })
  } catch(err) {
    res.status(500).json({ error: String(err) })
  }
}
