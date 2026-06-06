/**
 * useTradeport — TradePort / Indexer.xyz GraphQL
 * Each function catches its own errors and returns empty data on failure.
 * Nothing can break another function.
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    if (!res.ok) throw new Error(`proxy-${res.status}`)
  } catch {
    res = await fetch(DIRECT, {
      method: 'POST',
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
  catch { throw new Error(`Bad response (${res.status}): ${text.slice(0, 200)}`) }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  // GraphQL error handling — show full detail
  if (json.errors?.length) {
    const err   = json.errors[0]
    const parts = [
      err?.message,
      err?.extensions?.message,
      err?.extensions?.code,
      JSON.stringify(json.errors),
    ].filter(Boolean)
    throw new Error(parts[0] || `GraphQL error: ${JSON.stringify(json.errors)}`)
  }

  if (!json.data) {
    throw new Error(`No data: ${JSON.stringify(json).slice(0, 200)}`)
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
    id:         string
    name:       string | null
    media_url:  string | null
    collection: { title: string | null; slug: string | null } | null
  } | null
}

export interface TPTrending {
  current_volume:       number | null
  current_trades_count: number | null
  previous_volume:      number | null
  collection: TPCollection
}

/* ── Queries — each wraps in try/catch, never throws to caller ── */

export async function fetchSuiCollections(limit = 50): Promise<TPCollection[]> {
  try {
    const data = await gql(`
      query GetCollections($limit: Int!) {
        sui {
          collections(
            order_by: { volume: desc_nulls_last }
            limit: $limit
          ) {
            id slug title cover_url supply verified floor volume
          }
        }
      }
    `, { limit })
    return data?.sui?.collections ?? []
  } catch (e) {
    console.error('[TradePort] fetchSuiCollections:', e)
    throw e  // re-throw so pages can show error
  }
}

export async function fetchCollection(slug: string): Promise<TPCollection | null> {
  try {
    const data = await gql(`
      query GetCollection($slug: String!) {
        sui {
          collections(
            where: { slug: { _eq: $slug } }
            limit: 1
          ) {
            id slug title cover_url supply verified floor volume
          }
        }
      }
    `, { slug })
    return data?.sui?.collections?.[0] ?? null
  } catch (e) {
    console.error('[TradePort] fetchCollection:', e)
    return null
  }
}

export async function fetchCollectionNFTs(slug: string, limit = 32): Promise<TPNFT[]> {
  try {
    const data = await gql(`
      query GetNFTs($slug: String!, $limit: Int!) {
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
    console.error('[TradePort] fetchCollectionNFTs:', e)
    return []
  }
}

export async function fetchRecentActivity(limit = 30): Promise<TPActivity[]> {
  try {
    const data = await gql(`
      query GetActivity($limit: Int!) {
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
    console.error('[TradePort] fetchRecentActivity:', e)
    throw e
  }
}

export async function fetchCollectionActivity(slug: string, limit = 20): Promise<TPActivity[]> {
  try {
    const data = await gql(`
      query GetCollectionActivity($slug: String!, $limit: Int!) {
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
    console.error('[TradePort] fetchCollectionActivity:', e)
    return []
  }
}

/** Trending — returns empty array silently if API tier doesn't support it */
export async function fetchTrendingCollections(limit = 8): Promise<TPTrending[]> {
  try {
    const data = await gql(`
      query GetTrending($limit: Int!) {
        sui {
          collections_trending(
            period: ONE_DAY
            trending_by: VOLUME
            limit: $limit
          ) {
            current_volume
            current_trades_count
            previous_volume
            collection {
              id slug title cover_url floor volume supply verified
            }
          }
        }
      }
    `, { limit })
    return data?.sui?.collections_trending ?? []
  } catch {
    // Silently return empty if this tier doesn't support trending
    return []
  }
}
