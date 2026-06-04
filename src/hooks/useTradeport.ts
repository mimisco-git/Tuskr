/**
 * useTradeport — queries real Sui NFT data from TradePort / Indexer.xyz
 * via our Vercel proxy (keeps API key server-side)
 */

const PROXY = '/api/tradeport'

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`TradePort API error: ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

/* ── Types ── */
export interface TPCollection {
  id: string
  slug: string
  title: string
  cover_url: string | null
  image: string | null
  description: string | null
  supply: number | null
  verified: boolean
  floor: number | null
  volume: number | null
  num_owners: number | null
  market_cap: number | null
}

export interface TPNFT {
  token_id: string
  name: string | null
  image: string | null
  list_price: number | null
  owner: string | null
  rarity_rank: number | null
}

export interface TPActivity {
  tx_hash: string
  activity_type: string
  price: number | null
  created_at: string
  nft: { name: string | null; image: string | null } | null
  collection: { title: string | null; slug: string | null } | null
}

/* ── Queries ── */

export async function fetchSuiCollections(limit = 50): Promise<TPCollection[]> {
  const data = await gql(`
    query SuiCollections($limit: Int!) {
      sui {
        collections(
          order_by: { volume: desc_nulls_last }
          limit: $limit
        ) {
          id slug title cover_url image description
          supply verified floor volume num_owners market_cap
        }
      }
    }
  `, { limit })
  return data?.sui?.collections ?? []
}

export async function fetchCollection(slug: string): Promise<TPCollection | null> {
  const data = await gql(`
    query SuiCollection($slug: String!) {
      sui {
        collections(where: { slug: { _eq: $slug } }) {
          id slug title cover_url image description
          supply verified floor volume num_owners market_cap
        }
      }
    }
  `, { slug })
  return data?.sui?.collections?.[0] ?? null
}

export async function fetchCollectionNFTs(slug: string, limit = 24): Promise<TPNFT[]> {
  const data = await gql(`
    query SuiCollectionNFTs($slug: String!, $limit: Int!) {
      sui {
        nfts(
          where: { collection: { slug: { _eq: $slug } } }
          order_by: { list_price: asc_nulls_last }
          limit: $limit
        ) {
          token_id name image list_price owner rarity_rank
        }
      }
    }
  `, { slug, limit })
  return data?.sui?.nfts ?? []
}

export async function fetchRecentActivity(limit = 20): Promise<TPActivity[]> {
  const data = await gql(`
    query SuiActivity($limit: Int!) {
      sui {
        activities(
          order_by: { created_at: desc }
          where: { activity_type: { _in: ["sale", "listing"] } }
          limit: $limit
        ) {
          tx_hash activity_type price created_at
          nft { name image }
          collection { title slug }
        }
      }
    }
  `, { limit })
  return data?.sui?.activities ?? []
}
