import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import type { SuiObjectData } from '@mysten/sui/client'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
const MARKETPLACE_ID = import.meta.env.VITE_MARKETPLACE_ID ?? '0xd1a40986e214e59d9882b3e47c861eea3b732367958d27c03e9fc3b1f747a3b2'

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

  return { mintNFT, listNFT, buyNFT, bulkBuyNFTs, delistNFT, fetchOwnedNFTs }
}
