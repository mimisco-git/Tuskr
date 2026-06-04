/**
 * useTradeport — TradePort / Indexer.xyz GraphQL
 * Tries our Vercel proxy first, then falls back to direct call
 */

const PROXY   = '/api/tradeport'
const DIRECT  = 'https://api.indexer.xyz/graphql'
const API_KEY  = 'CVdbun0.5cda839c66e800e174ac0a5ec1dc1a2c'
const API_USER = 'Tuskr'

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ query, variables })
  
  // Try proxy first; fall back to direct on ANY failure (network error OR 5xx)
  let res: Response
  try {
    res = await fetch(PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    payload,
    })
    if (!res.ok) throw new Error(`proxy-${res.status}`)
  } catch {
    // Proxy failed — call TradePort directly from the browser
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
  catch { throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`) }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${json?.error ?? text.slice(0, 200)}`)
  }
  if (json.errors?.length) {
    throw new Error(`GraphQL: ${json.errors[0].message}`)
  }

  return json.data
}

/* ── Types ── */
export interface TPCollection {
  id:            string
  slug:          string
  semantic_slug: string | null
  title:         string
  description:   string | null
  cover_url:     string | null
  supply:        number | null
  verified:      boolean
  floor:         number | null
  volume:        number | null
  usd_volume:    number | null
  num_owners:    number | null
}

export interface TPNFT {
  id:         string
  token_id:   string
  name:       string | null
  media_url:  string | null
  media_type: string | null
  ranking:    number | null
  owner:      string | null
  price:      number | null
}

export interface TPActivity {
  id:                  string
  type:                string
  price:               number | null
  usd_price:           number | null
  sender:              string | null
  receiver:            string | null
  tx_id:               string | null
  block_time:          string
  market_name:         string | null
  bought_on_tradeport: boolean
  nft: {
    id:         string
    name:       string | null
    media_url:  string | null
    media_type: string | null
    ranking:    number | null
    collection: { title: string | null; slug: string | null } | null
  } | null
}

/* ── All collections sorted by volume ── */
export async function fetchSuiCollections(limit = 50): Promise<TPCollection[]> {
  const data = await gql(`
    query SuiCollections($limit: Int!) {
      sui {
        collections(
          order_by: { volume: desc_nulls_last }
          limit: $limit
        ) {
          id slug semantic_slug title description
          cover_url supply verified floor volume usd_volume num_owners
        }
      }
    }
  `, { limit })
  return data?.sui?.collections ?? []
}

/* ── Single collection ── */
export async function fetchCollection(slug: string): Promise<TPCollection | null> {
  const data = await gql(`
    query SuiCollection($slug: String) {
      sui {
        collections(
          where: {
            _or: [
              { slug: { _eq: $slug } },
              { semantic_slug: { _eq: $slug } }
            ]
          }
          limit: 1
        ) {
          id slug semantic_slug title description
          cover_url supply verified floor volume usd_volume num_owners
        }
      }
    }
  `, { slug })
  return data?.sui?.collections?.[0] ?? null
}

/* ── NFTs in a collection ── */
export async function fetchCollectionNFTs(slug: string, limit = 32): Promise<TPNFT[]> {
  const data = await gql(`
    query SuiCollectionNFTs($slug: String!, $limit: Int!) {
      sui {
        nfts(
          where: {
            _or: [
              { collection: { slug: { _eq: $slug } } },
              { collection: { semantic_slug: { _eq: $slug } } }
            ]
          }
          order_by: { price: asc_nulls_last }
          limit: $limit
        ) {
          id token_id name media_url media_type ranking owner price
        }
      }
    }
  `, { slug, limit })
  return data?.sui?.nfts ?? []
}

/* ── Global recent activity ── */
export async function fetchRecentActivity(limit = 40): Promise<TPActivity[]> {
  const data = await gql(`
    query SuiRecentActivity($limit: Int!) {
      sui {
        recent_actions(
          where: { type: { _in: ["sale", "listing"] } }
          order_by: [{ block_time: desc }, { tx_index: desc }]
          limit: $limit
        ) {
          id type price usd_price sender receiver
          tx_id block_time market_name bought_on_tradeport
          nft {
            id name media_url media_type ranking
            collection { title slug }
          }
        }
      }
    }
  `, { limit })
  return data?.sui?.recent_actions ?? []
}

/* ── Collection activity ── */
export async function fetchCollectionActivity(slug: string, limit = 20): Promise<TPActivity[]> {
  const data = await gql(`
    query SuiCollectionActivity($slug: String!, $limit: Int!) {
      sui {
        recent_actions(
          where: {
            _and: [
              { type: { _in: ["sale", "listing"] } },
              { _or: [
                { nft: { collection: { slug: { _eq: $slug } } } },
                { nft: { collection: { semantic_slug: { _eq: $slug } } } }
              ]}
            ]
          }
          order_by: [{ block_time: desc }, { tx_index: desc }]
          limit: $limit
        ) {
          id type price usd_price sender receiver
          tx_id block_time market_name bought_on_tradeport
          nft {
            id name media_url media_type ranking
            collection { title slug }
          }
        }
      }
    }
  `, { slug, limit })
  return data?.sui?.recent_actions ?? []
}
