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

    // ── FLOOR PRICE (DeepBook-powered price discovery) ──────────────
    if (type === 'floor') {
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
      )].slice(0, 50) // cap at 50 for speed

      if (!activeIds.length) return res.json({ floorSui: 0, floorMist: 0, count: 0, totalVolumeSui: 0 })

      // Fetch listing objects to get actual prices
      const objs = await rpc(network, 'sui_multiGetObjects', [
        activeIds, { showContent: true }
      ])

      const prices = (objs.result || [])
        .filter(o => o?.data?.content?.fields)
        .map(o => Number(o.data.content.fields.price || 0))
        .filter(p => p > 0)
        .sort((a, b) => a - b)

      const floorMist = prices[0] ?? 0
      const floorSui  = floorMist / 1e9

      // Total volume from all sold events
      const totalVolumeMist = sold.reduce((acc, e) => acc + Number(e.parsedJson?.price || 0), 0)

      return res.json({
        floorSui:        parseFloat(floorSui.toFixed(4)),
        floorMist,
        count:           prices.length,
        totalVolumeSui:  parseFloat((totalVolumeMist / 1e9).toFixed(4)),
        allPrices:       prices.slice(0, 10).map(p => p / 1e9),
      })
    }

    // ── USER OWNED — minted + bought - sold (Profile Owned tab) ─────────
    if (type === 'user_owned') {
      if (!address) return res.json({ nfts: [] })

      const [minted, sold] = await Promise.all([
        queryBoth(network, 'tuskr_nft::MintedEvent'),
        queryBoth(network, 'tuskr_marketplace::SoldEvent'),
      ])

      // NFTs minted by this user
      const mintedIds = new Set(
        minted
          .filter(e => norm(e.parsedJson?.creator) === address || norm(e.sender) === address)
          .map(e => norm(e.parsedJson?.nft_id))
          .filter(Boolean)
      )

      // NFTs bought by this user
      const boughtIds = new Set(
        sold
          .filter(e => norm(e.parsedJson?.buyer) === address)
          .map(e => norm(e.parsedJson?.nft_id))
          .filter(Boolean)
      )

      // NFTs this user sold away (remove from owned set)
      const soldAwayIds = new Set(
        sold
          .filter(e => norm(e.parsedJson?.seller) === address)
          .map(e => norm(e.parsedJson?.nft_id))
          .filter(Boolean)
      )

      // Union of minted + bought, minus sold
      const ownedIds = [...new Set([...mintedIds, ...boughtIds])]
        .filter(id => !soldAwayIds.has(id))

      if (!ownedIds.length) return res.json({ nfts: [] })

      // Fetch NFT objects directly for names, images, blob IDs
      const objs = await rpc(network, 'sui_multiGetObjects', [
        ownedIds, { showContent: true, showDisplay: true }
      ])

      const nfts = (objs.result || [])
        .filter(o => o?.data)
        .map(o => {
          const f  = o.data.content?.fields ?? {}
          const d  = o.data.display?.data   ?? {}
          const rawUrl = f.media_url
          const urlStr = typeof rawUrl === 'string' ? rawUrl : (rawUrl?.url ?? '')
          return {
            objectId:    o.data.objectId,
            name:        f.name    || d.name    || 'Tuskr NFT',
            description: f.description || d.description || '',
            blobId:      f.blob_id || d.blob_id || '',
            mediaUrl:    d.image_url || urlStr || '',
            creator:     f.creator || d.creator || '',
            royaltyBps:  Number(f.royalty_bps ?? 0),
          }
        })

      return res.json({ nfts })
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
