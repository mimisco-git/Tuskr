import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import type { SuiObjectData } from '@mysten/sui/client'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0xd3a0071d104926cdc53e3e0ddb1fc9bfe3f38b5dd0a9e844707bb49b7a3c6787'
const MARKETPLACE_ID = import.meta.env.VITE_MARKETPLACE_ID ?? '0x9524c9adde77ae46b14ef9703b62899bb823124a30d8597a1fd837157d911650'

export interface MintParams {
  name: string
  description: string
  blobId: string
  mediaUrl: string
  royaltyBps: number
}

export interface ListParams {
  nftId: string
  priceInMist: bigint
}

export function useNFTMarketplace() {
  const client = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const mintNFT = async (params: MintParams) => {
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::tuskr_nft::mint`,
      arguments: [
        tx.pure.string(params.name),
        tx.pure.string(params.description),
        tx.pure.string(params.blobId),
        tx.pure.string(params.mediaUrl),
        tx.pure.u16(params.royaltyBps),
      ],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const listNFT = async (params: ListParams) => {
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::tuskr_marketplace::list`,
      arguments: [
        tx.object(MARKETPLACE_ID),
        tx.object(params.nftId),
        tx.pure.u64(params.priceInMist),
      ],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const buyNFT = async (listingId: string, priceInMist: bigint) => {
    const tx = new Transaction()
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceInMist)])
    tx.moveCall({
      target: `${PACKAGE_ID}::tuskr_marketplace::buy`,
      arguments: [
        tx.object(MARKETPLACE_ID),
        tx.object(listingId),
        coin,
      ],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const bulkBuyNFTs = async (listings: { id: string; price: bigint }[]) => {
    const tx = new Transaction()
    for (const listing of listings) {
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(listing.price)])
      tx.moveCall({
        target: `${PACKAGE_ID}::tuskr_marketplace::buy`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.object(listing.id),
          coin,
        ],
      })
    }
    return await signAndExecute({ transaction: tx as never })
  }

  const delistNFT = async (listingId: string) => {
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::tuskr_marketplace::delist`,
      arguments: [
        tx.object(MARKETPLACE_ID),
        tx.object(listingId),
      ],
    })
    return await signAndExecute({ transaction: tx as never })
  }

  const fetchOwnedNFTs = async (address: string): Promise<SuiObjectData[]> => {
    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${PACKAGE_ID}::tuskr_nft::TuskrNFT`,
      },
      options: { showContent: true, showDisplay: true },
    })
    return objects.data.map((o) => o.data).filter(Boolean) as SuiObjectData[]
  }


  /* Fetch NFTs this address has listed on the marketplace via events */
  const fetchListedByUser = async (address: string) => {
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::Listed` },
        limit: 100,
      })
      return events.data.filter(e => (e.sender === address || (e.parsedJson as any)?.seller === address))
    } catch { return [] }
  }

  /* Fetch sold NFTs — events where this address was the seller */
  const fetchSoldByUser = async (address: string) => {
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::Sold` },
        limit: 100,
      })
      return events.data.filter(e => (e.sender === address || (e.parsedJson as any)?.seller === address))
    } catch { return [] }
  }
  return { mintNFT, listNFT, buyNFT, bulkBuyNFTs, delistNFT, fetchOwnedNFTs, fetchListedByUser, fetchSoldByUser }
}
