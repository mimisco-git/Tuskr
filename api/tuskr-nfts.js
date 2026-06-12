/**
 * Direct Sui RPC endpoint — bypasses SDK issues
 * Returns all minted Tuskr NFTs and active listings
 */
import https from 'https'

const TESTNET_RPC = 'https://fullnode.testnet.sui.io:443'
const MAINNET_RPC = 'https://fullnode.mainnet.sui.io:443'

const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
const OLD_MKT = '0xd1a40986e214e59d9882b3e47c861eea3b732367958d27c03e9fc3b1f747a3b2'
const NEW_PKG = '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'
const NEW_MKT = '0x194b2610a10950958e6bfbb4e36e9b9f5c278e02d740d6d8013b2d60934a5002'

function rpc(network, method, params) {
  const url = network === 'mainnet' ? MAINNET_RPC : TESTNET_RPC
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
    req.write(body)
    req.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const network = req.query.network || 'testnet'
  const type    = req.query.type    || 'minted'  // 'minted' or 'listings'

  const pkgs = [NEW_PKG, OLD_PKG]

  try {
    if (type === 'minted') {
      // Query MintedEvent from both packages
      const results = await Promise.all(pkgs.map(pkg =>
        rpc(network, 'suix_queryEvents', [
          { MoveEventType: `${pkg}::tuskr_nft::MintedEvent` },
          null, 50, false
        ]).then(r => r.result?.data || []).catch(() => [])
      ))

      const events = results.flat()
      const nfts = events
        .map(e => e.parsedJson)
        .filter(e => e && e.nft_id)
        .map(e => ({
          objectId: e.nft_id,
          name:     e.name || 'Tuskr NFT',
          blobId:   e.blob_id || '',
        }))

      res.json({ nfts })

    } else if (type === 'listings') {
      // Query listing events from both packages/marketplaces
      const [listed, sold, delisted] = await Promise.all([
        Promise.all(pkgs.map(p => rpc(network, 'suix_queryEvents', [{ MoveEventType: `${p}::tuskr_marketplace::ListedEvent` }, null, 200, false]).then(r => r.result?.data || []).catch(() => []))).then(rs => rs.flat()),
        Promise.all(pkgs.map(p => rpc(network, 'suix_queryEvents', [{ MoveEventType: `${p}::tuskr_marketplace::SoldEvent` }, null, 200, false]).then(r => r.result?.data || []).catch(() => []))).then(rs => rs.flat()),
        Promise.all(pkgs.map(p => rpc(network, 'suix_queryEvents', [{ MoveEventType: `${p}::tuskr_marketplace::DelistedEvent` }, null, 200, false]).then(r => r.result?.data || []).catch(() => []))).then(rs => rs.flat()),
      ])

      const soldIds     = new Set(sold.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const delistedIds = new Set(delisted.map(e => e.parsedJson?.listing_id).filter(Boolean))
      const activeIds   = listed.map(e => e.parsedJson?.listing_id).filter(id => id && !soldIds.has(id) && !delistedIds.has(id))

      res.json({ activeIds })
    }
  } catch(err) {
    res.status(500).json({ error: String(err) })
  }
}
