/**
 * useTradeport — fresh rewrite, simplest possible queries
 * Direct browser call first, proxy fallback
 */

const API_KEY  = 'OpLrmEc.26f3dfafe8f280f066ba11b8b831d61a'
const API_USER = 'mimisco-tech'
const ENDPOINT = 'https://api.indexer.xyz/graphql'
const PROXY    = '/api/tradeport'

async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const body    = JSON.stringify({ query, variables })
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key':    API_KEY,
    'x-api-user':   API_USER,
  }

  // Try direct call first
  let res: Response
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers, body })
  } catch {
    // CORS or network error — try proxy
    res = await fetch(PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
  }

  const json = await res.json().catch(() => null)

  if (!json) throw new Error('Empty or invalid JSON response')

  if (json.errors?.length) {
    const e   = json.errors[0]
    const msg = (e && typeof e === 'object')
      ? (e.message ?? e.extensions?.message ?? JSON.stringify(e))
      : String(e)
    throw new Error(String(msg ?? 'Unknown GraphQL error'))
  }

  if (!json.data) {
    throw new Error(`No data in response: ${JSON.stringify(json).slice(0, 300)}`)
  }

  return json.data
}

/* ── Types ── */
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

export interface TPTrending {
  current_volume:       number | null
  current_trades_count: number | null
  previous_volume:      number | null
  collection:           TPCollection
}

/* ── Collections ── */
export async function fetchSuiCollections(limit = 50): Promise<TPCollection[]> {
  try {
    // Simplest possible query — no order_by
    const data = await gql<any>(`
      query($limit: Int!) {
        sui {
          collections(limit: $limit) {
            id slug title cover_url supply verified floor volume
          }
        }
      }
    `, { limit })
    return data?.sui?.collections ?? []
  } catch (e) {
    console.error('[TP] fetchSuiCollections failed:', e)
    throw e
  }
}

export async function fetchCollection(slug: string): Promise<TPCollection | null> {
  try {
    const data = await gql<any>(`
      query($slug: String!) {
        sui {
          collections(where: { slug: { _eq: $slug } }, limit: 1) {
            id slug title cover_url supply verified floor volume
          }
        }
      }
    `, { slug })
    return data?.sui?.collections?.[0] ?? null
  } catch (e) {
    console.error('[TP] fetchCollection failed:', e)
    return null
  }
}

export async function fetchCollectionNFTs(slug: string, limit = 32): Promise<TPNFT[]> {
  try {
    const data = await gql<any>(`
      query($slug: String!, $limit: Int!) {
        sui {
          nfts(
            where: { collection: { slug: { _eq: $slug } } }
            limit: $limit
          ) {
            id token_id name media_url ranking owner
          }
        }
      }
    `, { slug, limit })
    return data?.sui?.nfts ?? []
  } catch (e) {
    console.error('[TP] fetchCollectionNFTs failed:', e)
    return []
  }
}

export async function fetchRecentActivity(limit = 30): Promise<TPActivity[]> {
  try {
    const data = await gql<any>(`
      query($limit: Int!) {
        sui {
          recent_actions(
            order_by: [{ block_time: desc }]
            limit: $limit
          ) {
            id type price usd_price sender receiver tx_id block_time
            nft {
              id name media_url
              collection { title slug }
            }
          }
        }
      }
    `, { limit })
    return data?.sui?.recent_actions ?? []
  } catch (e) {
    console.error('[TP] fetchRecentActivity failed:', e)
    throw e
  }
}

export async function fetchCollectionActivity(slug: string, limit = 20): Promise<TPActivity[]> {
  try {
    const data = await gql<any>(`
      query($slug: String!, $limit: Int!) {
        sui {
          recent_actions(
            where: { nft: { collection: { slug: { _eq: $slug } } } }
            order_by: [{ block_time: desc }]
            limit: $limit
          ) {
            id type price usd_price sender receiver tx_id block_time
            nft {
              id name media_url
              collection { title slug }
            }
          }
        }
      }
    `, { slug, limit })
    return data?.sui?.recent_actions ?? []
  } catch (e) {
    console.error('[TP] fetchCollectionActivity failed:', e)
    return []
  }
}

/** Trending — silently returns [] if not supported */
export async function fetchTrendingCollections(limit = 8): Promise<TPTrending[]> {
  try {
    const data = await gql<any>(`
      query($limit: Int!) {
        sui {
          collections_trending(
            period: ONE_DAY
            trending_by: VOLUME
            limit: $limit
          ) {
            current_volume current_trades_count previous_volume
            collection {
              id slug title cover_url floor volume supply verified
            }
          }
        }
      }
    `, { limit })
    return data?.sui?.collections_trending ?? []
  } catch {
    return []
  }
}
