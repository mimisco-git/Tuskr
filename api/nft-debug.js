/**
 * Debug endpoint: fetch raw NFT data directly from Sui RPC
 * Usage: /api/nft-debug?package=0x...
 */
import https from 'https'

function rpc(network, method, params) {
  const url = network === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443'

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc:'2.0', id:1, method, params })
    const req  = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000,
    }, res => {
      let out = ''
      res.on('data', c => out += c)
      res.on('end',  () => { try { resolve(JSON.parse(out)) } catch(e) { reject(e) } })
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const pkg     = req.query.package || ''
  const network = req.query.network || 'testnet'

  if (!pkg) { res.status(400).json({ error: 'Missing package param' }); return }

  try {
    // 1. Get MintedEvents
    const evtRes = await rpc(network, 'suix_queryEvents', [
      { MoveEventType: `${pkg}::tuskr_nft::MintedEvent` },
      null, 10, true
    ])
    const events = evtRes.result?.data || []

    // 2. Get first 3 NFT IDs
    const ids = events.slice(0, 5)
      .map(e => e.parsedJson?.nft_id)
      .filter(Boolean)

    if (!ids.length) {
      res.json({ events: events.map(e => e.parsedJson), objects: [] })
      return
    }

    // 3. Fetch objects raw
    const objRes = await rpc(network, 'sui_multiGetObjects', [
      ids,
      { showContent: true, showDisplay: true }
    ])
    const objects = (objRes.result || []).map(o => ({
      id:       o.data?.objectId,
      content:  o.data?.content?.fields,
      display:  o.data?.display?.data,
      error:    o.error,
    }))

    res.json({ events: events.slice(0,5).map(e => e.parsedJson), objects })
  } catch(err) {
    res.status(500).json({ error: String(err) })
  }
}
