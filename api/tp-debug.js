// Debug endpoint — shows exact raw TradePort API response
import https from 'https'

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body)
    const req  = https.request(
      { hostname, path, method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      res => {
        let out = ''
        res.on('data', c => { out += c })
        res.on('end',  () => resolve({ status: res.statusCode, body: out, headers: res.headers }))
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

export default async function handler(req, res) {
  // Try the simplest possible query
  const query = `{ sui { collections(limit: 3) { id slug title } } }`

  try {
    const result = await post(
      'api.indexer.xyz', '/graphql',
      {
        'Content-Type': 'application/json',
        'x-api-key':    'OpLrmEc.26f3dfafe8f280f066ba11b8b831d61a',
        'x-api-user':   'mimisco-tech',
      },
      JSON.stringify({ query })
    )

    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({
      tp_status:   result.status,
      tp_response: JSON.parse(result.body),
      tp_headers:  result.headers,
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
