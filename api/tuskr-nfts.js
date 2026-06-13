import https from 'https'

const TESTNET = 'https://fullnode.testnet.sui.io:443'
const MAINNET = 'https://fullnode.mainnet.sui.io:443'
const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
const NEW_PKG = '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'

function rpc(network, method, params) {
  const url  = network === 'mainnet' ? MAINNET : TESTNET
  const body = JSON.stringify({ jsonrpc:'2.0', id:1, method, params })
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(body) },
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

async function queryBoth(network, suffix, limit = 200) {
  const results = await Promise.all([NEW_PKG, OLD_PKG].map(pkg =>
    rpc(network, 'suix_queryEvents', [
      { MoveEventType: `${pkg}::${suffix}` }, null, limit, false
    ]).then(r => r.result?.data || []).catch(() => [])
  ))
  return results.flat()
}

// Fetch NFT objects and return name + blob_id + media_url
async function fetchNFTData(network, ids) {
  if (!ids.length) return {}
  const res = await rpc(network, 'sui_multiGetObjects', [
    ids, { showContent: true, showDisplay: true }
  ])
  const map = {}
  for (const o of (res.result || [])) {
    if (!o.data) continue
    const f  = o.data.content?.fields ?? {}
    const d  = o.data.display?.data   ?? {}
    const id = o.data.objectId
    map[id] = {
      name:     f.name    || d.name     || 'Tuskr NFT',
      blobId:   f.blob_id || d.blob_id  || '',
      mediaUrl: f.media_url?.url || f.media_url || d.image_url || '',
    }
  }
  return map
}

// Normalize Sui address — lowercase, always with 0x prefix, padded to 64 chars
function normalizeAddr(addr) {
  if (!addr) return ''
  const hex = addr.replace(/^0x/i, '').toLowerCase()
  return '0x' + hex.padStart(64, '0')
}

// Match two addresses regardless of format
function addrMatch(a, b) {
  return normalizeAddr(a) === normalizeAddr(b)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const network = req.query.network || 'testnet'
  const type    = req.query.type    || 'minted'
  const address = req.query.address || ''

  try {
    // ── MINTED NFTs ──────────────────────────────────────────
    if (type === 'minted') {
      const events = await queryBoth(network, 'tuskr_nft::MintedEvent')
      const nfts = events.map(e => ({
        objectId: e.parsedJson?.nft_id,
        name:     e.parsedJson?.name    || 'Tuskr NFT',
        blobId:   e.parsedJson?.blob_id || '',
      })).filter(n => n.objectId)
      return res.json({ nfts })
    }

    // ── ACTIVE LISTINGS ──────────────────────────────────────
    if (type === 'listings') {
      const [listed, sold, delisted] = await Promise.all([
        queryBoth(network, 'tuskr_marketplace::ListedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
        queryBoth(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const activeIds   = listed
        .map(e => e.parsedJson?.listing_id)
        .filter(id => id && !soldIds.has(id) && !delistedIds.has(id))
      return res.json({ activeIds })
    }

    // ── USER LISTINGS (Profile tab) ──────────────────────────
    if (type === 'user_listings') {
      if (!address) return res.json({ listings: [] })
      const [listed, sold, delisted] = await Promise.all([
        queryBoth(network, 'tuskr_marketplace::ListedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
        queryBoth(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const mine = listed.filter(e => {
        const pj = e.parsedJson
        return (addrMatch(pj?.seller, address) || addrMatch(e.sender, address))
          && pj?.listing_id
          && !soldIds.has(pj.listing_id)
          && !delistedIds.has(pj.listing_id)
      })

      // Fetch NFT objects to get names + images
      const nftIds  = mine.map(e => {
        const id = e.parsedJson?.nft_id
        return id ? `0x${id.replace(/^0x/,'')}` : null
      }).filter(Boolean)
      const nftData = await fetchNFTData(network, nftIds)

      const listings = mine.map(e => {
        const pj    = e.parsedJson
        const nftId = `0x${(pj.nft_id||'').replace(/^0x/,'')}`
        const info  = nftData[nftId] || {}
        return {
          listingId: pj.listing_id,
          nftId,
          name:     info.name     || 'Tuskr NFT',
          blobId:   info.blobId   || '',
          mediaUrl: info.mediaUrl || '',
          price:    pj.price      || '0',
        }
      })
      return res.json({ listings })
    }

    // ── USER SOLD (Profile tab) ──────────────────────────────
    if (type === 'user_sold') {
      if (!address) return res.json({ sold: [] })
      const events = await queryBoth(network, 'tuskr_marketplace::SoldEvent')
      // e.sender = buyer (who called buy()), NOT seller
      // Only match on parsedJson.seller with normalized address comparison
      const mine   = events.filter(e =>
        addrMatch(e.parsedJson?.seller, address)
      )
      const nftIds  = mine.map(e => {
        const id = e.parsedJson?.nft_id
        return id ? `0x${id.replace(/^0x/,'')}` : null
      }).filter(Boolean)
      const nftData = await fetchNFTData(network, nftIds)

      const sold = mine.map(e => {
        const pj    = e.parsedJson
        const nftId = `0x${(pj.nft_id||'').replace(/^0x/,'')}`
        const info  = nftData[nftId] || {}
        return {
          listingId: pj.listing_id,
          nftId,
          name:     info.name     || 'Tuskr NFT',
          blobId:   info.blobId   || '',
          price:    pj.price      || '0',
          buyer:    pj.buyer      || '',
        }
      })
      return res.json({ sold })
    }

    res.status(400).json({ error: 'Unknown type' })
  } catch(err) {
    res.status(500).json({ error: String(err) })
  }
}
