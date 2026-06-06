/**
 * useTradeport — TradePort / Indexer.xyz GraphQL
 * Uses minimal, doc-confirmed fields only.
 * Proxy-first with direct fallback.
 */

const PROXY    = '/api/tradeport'
const DIRECT   = 'https://api.indexer.xyz/graphql'
const API_KEY  = 'OpLrmEc.26f3dfafe8f280f066ba11b8b831d61a'
const API_USER = 'mimisco-tech'

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ query, variables })

  let res: Response
  try {
    res = await fetch(PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    payload,
    })
    if (!res.ok) throw new Error(`proxy-${res.status}`)
  } catch {
    // Proxy failed — call TradePort directly from browser
    res = await fetch(DIRECT, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    API_KEY,
        'x-api-user':   API_USER,
      },
      body: payload,
    })
  }

  const text = await res.text()
  let json: any
  try { json = JSON.parse(text) }
  catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`) }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
  }
  if (json.errors?.length) {
    // Show the full error object so we can debug
    const err = json.errors[0]
    const msg = err?.message || err?.extensions?.message || JSON.stringify(err)
    throw new Error(`GraphQL error: ${msg}`)
  }
  if (!json.data) {
    throw new Error(`No data returned: ${JSON.stringify(json).slice(0, 300)}`)
  }

  return json.data
}

/* ── Types — only doc-confirmed fields ── */
export interface TPCollection {
  id:        string
  slug:      string
  title:     string
  cover_url: string | null
  supply:    number | null
  verified:  boolean
  floor:     number | null
  volume:    number | null
}

export interface TPNFT {
  id:        string
  token_id:  string
  name:      string | null
  media_url: string | null
  ranking:   number | null
  owner:     string | null
}

export interface TPActivity {
  id:         string
  type:       string
  price:      number | null
  usd_price:  number | null
  sender:     string | null
  receiver:   string | null
  tx_id:      string | null
  block_time: string
  nft: {
    id:        string
    name:      string | null
    media_url: string | null
    collection: { title: string | null; slug: string | null } | null
  } | null
}

/* ── Queries — minimal safe fields only ── */

export async function fetchSuiCollections(limit = 50): Promise<TPCollection[]> {
  const data = await gql(`
    query GetCollections($limit: Int!) {
      sui {
        collections(
          order_by: { volume: desc_nulls_last }
          limit: $limit
        ) {
          id
          slug
          title
          cover_url
          supply
          verified
          floor
          volume
        }
      }
    }
  `, { limit })
  return data?.sui?.collections ?? []
}

export async function fetchCollection(slug: string): Promise<TPCollection | null> {
  const data = await gql(`
    query GetCollection($slug: String!) {
      sui {
        collections(
          where: { slug: { _eq: $slug } }
          limit: 1
        ) {
          id
          slug
          title
          cover_url
          supply
          verified
          floor
          volume
        }
      }
    }
  `, { slug })
  return data?.sui?.collections?.[0] ?? null
}

export async function fetchCollectionNFTs(slug: string, limit = 32): Promise<TPNFT[]> {
  const data = await gql(`
    query GetNFTs($slug: String!, $limit: Int!) {
      sui {
        nfts(
          where: { collection: { slug: { _eq: $slug } } }
          limit: $limit
        ) {
          id
          token_id
          name
          media_url
          ranking
          owner
        }
      }
    }
  `, { slug, limit })
  return data?.sui?.nfts ?? []
}

export async function fetchRecentActivity(limit = 30): Promise<TPActivity[]> {
  const data = await gql(`
    query GetActivity($limit: Int!) {
      sui {
        recent_actions(
          order_by: [{ block_time: desc }]
          limit: $limit
        ) {
          id
          type
          price
          usd_price
          sender
          receiver
          tx_id
          block_time
          nft {
            id
            name
            media_url
            collection {
              title
              slug
            }
          }
        }
      }
    }
  `, { limit })
  return data?.sui?.recent_actions ?? []
}

export async function fetchCollectionActivity(slug: string, limit = 20): Promise<TPActivity[]> {
  const data = await gql(`
    query GetCollectionActivity($slug: String!, $limit: Int!) {
      sui {
        recent_actions(
          where: { nft: { collection: { slug: { _eq: $slug } } } }
          order_by: [{ block_time: desc }]
          limit: $limit
        ) {
          id
          type
          price
          usd_price
          sender
          receiver
          tx_id
          block_time
          nft {
            id
            name
            media_url
            collection {
              title
              slug
            }
          }
        }
      }
    }
  `, { slug, limit })
  return data?.sui?.recent_actions ?? []
}
