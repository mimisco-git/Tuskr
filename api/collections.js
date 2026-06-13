import https from 'https'

const TESTNET = 'https://fullnode.testnet.sui.io:443'
const COL_PKG = '0x10436eb7339e639f96dc65d86850e047ed567851d1cd539884c28e56d4afaee0'
const COL_OBJ = '0xa2c8e96f5a083c351db9b20f2e28dd34a64ebd013fd4927e1d242555903a6529'
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'

function rpc(method, params) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  return new Promise((resolve, reject) => {
    const req = https.request(TESTNET, {
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const type = req.query.type || 'collection'

  try {
    if (type === 'collection') {
      // Fetch collection object fields
      const r = await rpc('sui_getObject', [COL_OBJ, { showContent: true }])
      const fields = r.result?.data?.content?.fields || {}

      // Fetch NFTMinted events to get all NFTs
      const evR = await rpc('suix_queryEvents', [
        { MoveEventType: `${COL_PKG}::collection_nft::NFTMinted` },
        null, 200, false
      ])
      const nfts = (evR.result?.data || [])
        .filter(e => e.parsedJson?.collection_id === COL_OBJ)
        .map(e => ({
          nftId:    e.parsedJson.nft_id,
          name:     e.parsedJson.name,
          blobId:   e.parsedJson.blob_id,
          edition:  e.parsedJson.edition,
          creator:  e.parsedJson.creator,
          imageUrl: e.parsedJson.blob_id && !e.parsedJson.blob_id.includes('YOUR_')
            ? `${AGGREGATOR}/v1/blobs/${e.parsedJson.blob_id}`
            : '',
        }))

      return res.json({
        id:          COL_OBJ,
        packageId:   COL_PKG,
        name:        fields.name     || 'Tuskr Genesis',
        description: fields.description || 'The first official Tuskr NFT collection on Sui + Walrus',
        supply:      fields.supply   || nfts.length,
        maxSupply:   fields.max_supply || 0,
        creator:     fields.creator  || '',
        royaltyBps:  fields.royalty_bps || 500,
        coverBlobId: fields.cover_blob || '',
        nfts,
        suiscanUrl: `https://suiscan.xyz/testnet/object/${COL_OBJ}`,
      })
    }

    res.status(400).json({ error: 'Unknown type' })
  } catch(err) {
    res.status(500).json({ error: String(err) })
  }
}
