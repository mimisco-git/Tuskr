import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import type { SuiObjectData } from '@mysten/sui/jsonRpc'

/**
 * Reads network from localStorage so it matches the UI switcher.
 * Falls back to env vars (set at build time by Vercel).
 */
function getNetworkIds() {
  try {
    const net = localStorage.getItem('tuskr_network')
    if (net === 'testnet') {
      return {
        packageId:     import.meta.env.VITE_TESTNET_PACKAGE_ID     ?? '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56',
        marketplaceId: import.meta.env.VITE_TESTNET_MARKETPLACE_ID ?? '0x194b2610a10950958e6bfbb4e36e9b9f5c278e02d740d6d8013b2d60934a5002',
      }
    }
  } catch {}
  // Default: mainnet
  return {
    packageId:     import.meta.env.VITE_PACKAGE_ID     ?? '0xd3a0071d104926cdc53e3e0ddb1fc9bfe3f38b5dd0a9e844707bb49b7a3c6787',
    marketplaceId: import.meta.env.VITE_MARKETPLACE_ID ?? '0x9524c9adde77ae46b14ef9703b62899bb823124a30d8597a1fd837157d911650',
  }
}

export interface MintParams {
  name: string
  description: string
  blobId: string
  mediaUrl: string
  royaltyBps: number
  sealedBlobId?: string  // optional — if set, calls mint_with_seal
}

export interface ListParams {
  nftId: string
  priceInMist: bigint
}

export function useNFTMarketplace() {
  const client = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const mintNFT = async (params: MintParams) => {
    const { packageId, marketplaceId } = getNetworkIds()

    // Validate inputs before sending
    if (!params.name.trim())     throw new Error('NFT name is required')
    if (!params.blobId.trim())   throw new Error('Blob ID is required — upload to Walrus first')
    if (!params.mediaUrl.trim()) throw new Error('Media URL is required')

    const tx = new Transaction()
    if (params.sealedBlobId) {
      // mint_with_seal: stores Seal-encrypted content blob ID on-chain
      tx.moveCall({
        target: `${packageId}::tuskr_nft::mint_with_seal`,
        arguments: [
          tx.pure.string(params.name),
          tx.pure.string(params.description || ''),
          tx.pure.string(params.blobId),
          tx.pure.string(params.mediaUrl),
          tx.pure.string(params.sealedBlobId),
          tx.pure.u16(params.royaltyBps),
        ],
      })
    } else {
      tx.moveCall({
        target: `${packageId}::tuskr_nft::mint`,
        arguments: [
          tx.pure.string(params.name),
          tx.pure.string(params.description || ''),
          tx.pure.string(params.blobId),
          tx.pure.string(params.mediaUrl),
          tx.pure.u16(params.royaltyBps),
        ],
      })
    }

    try {
      const result = await signAndExecute({ transaction: tx as never })
      return result
    } catch (err: any) {
      // Re-throw with a cleaner message
      const msg = err?.message || err?.toString() || 'Transaction failed'
      // Common failure reasons
      if (msg.includes('Package not found') || msg.includes('package not found')) {
        throw new Error(`Wrong network: contract not found. Switch your wallet to match the selected network (mainnet/testnet).`)
      }
      if (msg.includes('rejected') || msg.includes('Rejected')) {
        throw new Error('Transaction rejected in wallet.')
      }
      if (msg.includes('InsufficientGas') || msg.includes('gas')) {
        throw new Error('Insufficient gas. You need more SUI in your wallet.')
      }
      throw new Error(msg)
    }
  }

  const listNFT = async (params: ListParams) => {
    const { packageId, marketplaceId } = getNetworkIds()
    const tx = new Transaction()
    tx.moveCall({
      target: `${packageId}::tuskr_marketplace::list`,
      arguments: [
        tx.object(marketplaceId),
        tx.object(params.nftId),
        tx.pure.u64(params.priceInMist),
      ],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const buyNFT = async (listingId: string, priceInMist: bigint) => {
    const { packageId, marketplaceId } = getNetworkIds()
    const tx = new Transaction()
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceInMist)])
    tx.moveCall({
      target: `${packageId}::tuskr_marketplace::buy`,
      arguments: [
        tx.object(marketplaceId),
        tx.object(listingId),
        coin,
      ],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const bulkBuyNFTs = async (listings: { id: string; price: bigint }[]) => {
    const { packageId, marketplaceId } = getNetworkIds()
    const tx = new Transaction()
    for (const listing of listings) {
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(listing.price)])
      tx.moveCall({
        target: `${packageId}::tuskr_marketplace::buy`,
        arguments: [tx.object(marketplaceId), tx.object(listing.id), coin],
      })
    }
    return await signAndExecute({ transaction: tx as never })
  }

  const delistNFT = async (listingId: string) => {
    const { packageId, marketplaceId } = getNetworkIds()
    const tx = new Transaction()
    tx.moveCall({
      target: `${packageId}::tuskr_marketplace::delist`,
      arguments: [tx.object(marketplaceId), tx.object(listingId)],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const fetchOwnedNFTs = async (address: string): Promise<SuiObjectData[]> => {
    const { packageId } = getNetworkIds()
    const OLD_PKG = '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
    const seen = new Set<string>()
    const results: SuiObjectData[] = []

    const addObj = (o: any) => {
      if (o?.objectId && !seen.has(o.objectId)) {
        seen.add(o.objectId)
        results.push(o)
      }
    }

    // 1. Query by struct type for both packages (catches minted NFTs)
    await Promise.all([packageId, OLD_PKG].map(pkg =>
      client.getOwnedObjects({
        owner: address,
        filter: { StructType: `${pkg}::tuskr_nft::TuskrNFT` },
        options: { showContent: true, showDisplay: true, showOwner: true },
      }).then(r => r.data.forEach(o => o.data && addObj(o.data)))
      .catch(() => {})
    ))

    // 2. Find NFTs bought via marketplace SoldEvent (buyer = address)
    // This catches bought NFTs that might be missed by struct type filter
    try {
      const rpcUrl = 'https://fullnode.testnet.sui.io:443'
      const buyerEvents = await Promise.all([packageId, OLD_PKG].map(pkg =>
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'suix_queryEvents',
            params: [{ MoveEventType: `${pkg}::tuskr_marketplace::SoldEvent` }, null, 200, false],
          }),
        }).then(r => r.json()).then(d => d.result?.data || []).catch(() => [])
      ))

      const boughtNftIds = buyerEvents.flat()
        .filter((e: any) => {
          const buyer = e.parsedJson?.buyer || ''
          return buyer.toLowerCase() === address.toLowerCase() ||
                 ('0x' + buyer.replace(/^0x/i,'')).toLowerCase() === ('0x' + address.replace(/^0x/i,'')).toLowerCase()
        })
        .map((e: any) => {
          const id = e.parsedJson?.nft_id || ''
          return id ? '0x' + id.replace(/^0x/i, '') : ''
        })
        .filter(Boolean)

      if (boughtNftIds.length > 0) {
        const nftObjs = await client.multiGetObjects({
          ids: [...new Set(boughtNftIds)],
          options: { showContent: true, showDisplay: true, showOwner: true },
        }).catch(() => [])
        ;(nftObjs as any[]).forEach(o => o.data && addObj(o.data))
      }
    } catch { /* buyer event lookup optional */ }

    return results
  }

  const fetchListedByUser = async (address: string) => {
    const { packageId } = getNetworkIds()
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${packageId}::tuskr_marketplace::Listed` },
        limit: 100,
      })
      return events.data.filter(e =>
        e.sender === address || (e.parsedJson as any)?.seller === address
      )
    } catch { return [] }
  }

  const fetchSoldByUser = async (address: string) => {
    const { packageId } = getNetworkIds()
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${packageId}::tuskr_marketplace::Sold` },
        limit: 100,
      })
      return events.data.filter(e =>
        e.sender === address || (e.parsedJson as any)?.seller === address
      )
    } catch { return [] }
  }

  return {
    mintNFT, listNFT, buyNFT, bulkBuyNFTs, delistNFT,
    fetchOwnedNFTs, fetchListedByUser, fetchSoldByUser,
    getNetworkIds,
  }
}
