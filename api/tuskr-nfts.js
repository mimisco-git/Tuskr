import https from 'https'

const TESTNET_RPC = 'https://fullnode.testnet.sui.io:443'
const MAINNET_RPC = 'https://fullnode.mainnet.sui.io:443'
const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
const OLD_MKT = '0xd1a40986e214e59d9882b3e47c861eea3b732367958d27c03e9fc3b1f747a3b2'
const NEW_PKG = '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'
const NEW_MKT = '0x194b2610a10950958e6bfbb4e36e9b9f5c278e02d740d6d8013b2d60934a5002'

function rpc(network, method, params) {
  const url  = network === 'mainnet' ? MAINNET_RPC : TESTNET_RPC
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

async function queryBothPkgs(network, eventSuffix, limit = 200) {
  const results = await Promise.all([NEW_PKG, OLD_PKG].map(pkg =>
    rpc(network, 'suix_queryEvents', [
      { MoveEventType: `${pkg}::${eventSuffix}` }, null, limit, false
    ]).then(r => r.result?.data || []).catch(() => [])
  ))
  return results.flat()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const network = req.query.network || 'testnet'
  const type    = req.query.type    || 'minted'
  const address = req.query.address || ''

  try {
    // ── Minted NFTs ──────────────────────────────────────────
    if (type === 'minted') {
      const events = await queryBothPkgs(network, 'tuskr_nft::MintedEvent')
      const nfts = events
        .map(e => e.parsedJson)
        .filter(e => e?.nft_id)
        .map(e => ({ objectId: e.nft_id, name: e.name || 'Tuskr NFT', blobId: e.blob_id || '' }))
      return res.json({ nfts })
    }

    // ── Active listings ──────────────────────────────────────
    if (type === 'listings') {
      const [listed, sold, delisted] = await Promise.all([
        queryBothPkgs(network, 'tuskr_marketplace::ListedEvent'),
        queryBothPkgs(network, 'tuskr_marketplace::SoldEvent'),
        queryBothPkgs(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const activeIds   = listed
        .map(e => e.parsedJson?.listing_id)
        .filter(id => id && !soldIds.has(id) && !delistedIds.has(id))
      return res.json({ activeIds })
    }

    // ── User listed NFTs (for Profile) ───────────────────────
    if (type === 'user_listings') {
      if (!address) return res.json({ listings: [] })
      const [listed, sold, delisted] = await Promise.all([
        queryBothPkgs(network, 'tuskr_marketplace::ListedEvent'),
        queryBothPkgs(network, 'tuskr_marketplace::SoldEvent'),
        queryBothPkgs(network, 'tuskr_marketplace::DelistedEvent'),
      ])
      const soldIds     = new Set(sold.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const listings = listed
        .filter(e => {
          const pj = e.parsedJson
          return (pj?.seller === address || e.sender === address)
            && pj?.listing_id
            && !soldIds.has(pj.listing_id)
            && !delistedIds.has(pj.listing_id)
        })
        .map(e => ({
          listingId: e.parsedJson.listing_id,
          nftId:     e.parsedJson.nft_id,
          name:      e.parsedJson.name || 'Tuskr NFT',
          price:     e.parsedJson.price || '0',
          blobId:    e.parsedJson.blob_id || '',
        }))
      return res.json({ listings })
    }

    // ── User sold NFTs (for Profile) ─────────────────────────
    if (type === 'user_sold') {
      if (!address) return res.json({ sold: [] })
      const events = await queryBothPkgs(network, 'tuskr_marketplace::SoldEvent')
      const sold = events
        .filter(e => {
          const pj = e.parsedJson
          return pj?.seller === address || e.sender === address
        })
        .map(e => ({
          listingId: e.parsedJson.listing_id,
          nftId:     e.parsedJson.nft_id,
          name:      e.parsedJson.name || 'Tuskr NFT',
          price:     e.parsedJson.price || '0',
          blobId:    e.parsedJson.blob_id || '',
          buyer:     e.parsedJson.buyer || '',
        }))
      return res.json({ sold })
    }

    res.status(400).json({ error: 'Unknown type' })
  } catch(err) {
    res.status(500).json({ error: String(err) })
  }
}
