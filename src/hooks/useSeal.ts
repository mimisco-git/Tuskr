/**
 * useSeal — Seal encryption/decryption for NFT metadata
 *
 * Seal (seal.mystenlabs.com) provides threshold encryption where
 * only NFT owners can decrypt private content stored on Walrus.
 *
 * Architecture:
 *   1. Encrypt: NFT description/traits encrypted with Seal → stored on Walrus
 *   2. Decrypt: NFT owner creates SessionKey → Seal key servers verify ownership
 *              via seal_approve → client-side decryption
 *
 * Testnet key servers (from https://seal-docs.wal.app/Pricing):
 *   - Decentralized: 0xb012378c...  (Mysten-operated, 3-of-5 MPC)
 *   - Independent:   0x73d05d62...
 */
import { SealClient, SessionKey } from '@mysten/seal'
import { Transaction } from '@mysten/sui/transactions'
import { useSuiClient, useCurrentAccount, useSignTransaction } from '@mysten/dapp-kit'
import { useCallback } from 'react'
import { useNetwork } from './useNetwork'

// Testnet key server configurations (from seal-docs.wal.app)
const SEAL_SERVERS_TESTNET = [
  {
    objectId:      '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98',
    aggregatorUrl: 'https://seal-aggregator-testnet.mystenlabs.com',
    weight:        1,
  },
  {
    objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
    weight:   1,
  },
]

// Mainnet key servers — update once Seal mainnet is available
const SEAL_SERVERS_MAINNET = SEAL_SERVERS_TESTNET

export function useSeal() {
  const client      = useSuiClient()
  const account     = useCurrentAccount()
  const { mutateAsync: signTx } = useSignTransaction()
  const { network } = useNetwork()

  const getSealClient = useCallback((): SealClient | null => {
    try {
      const servers = network.name === 'mainnet' ? SEAL_SERVERS_MAINNET : SEAL_SERVERS_TESTNET
      return new SealClient({
        suiClient:        client as any,
        serverConfigs:    servers,
        verifyKeyServers: false, // skip for testnet speed
      })
    } catch (e) {
      console.error('[Seal] Failed to create client:', e)
      return null
    }
  }, [client, network.name])

  /**
   * Encrypt data (e.g., NFT description bytes) for a specific NFT.
   * The NFT object ID is the identity — only the owner can decrypt.
   */
  const encrypt = useCallback(async (
    data:      Uint8Array,
    nftId:     string,   // The NFT objectId used as identity
    packageId: string,
  ): Promise<Uint8Array | null> => {
    const seal = getSealClient()
    if (!seal) return null
    try {
      const { encryptedObject } = await seal.encrypt({
        threshold:  1,       // 1-of-2 threshold (either server can decrypt)
        packageId,
        id:        nftId,
        data,
      })
      return encryptedObject
    } catch (e) {
      console.error('[Seal] Encrypt failed:', e)
      return null
    }
  }, [getSealClient])

  /**
   * Decrypt Seal-encrypted data.
   * Requires the user to sign a SessionKey transaction in their wallet.
   * Seal key servers verify ownership via the seal_approve function.
   */
  const decrypt = useCallback(async (
    encryptedData: Uint8Array,
    nftId:         string,
    packageId:     string,
  ): Promise<Uint8Array | null> => {
    if (!account) { console.warn('[Seal] No wallet connected'); return null }
    const seal = getSealClient()
    if (!seal) return null

    try {
      // Create a session key (user signs once, valid for 10 minutes)
      const sessionKey = await SessionKey.create({
        address:   account.address,
        packageId,
        ttlMin:    10,
        suiClient: client as any,
        signer: {
          sign: async (data: Uint8Array) => {
            const tx = new Transaction()
            tx.setSender(account.address)
            const result = await signTx({ transaction: tx as any })
            // Return the signature bytes
            const bytes = atob(result.signature); return new Uint8Array([...bytes].map(c => c.charCodeAt(0)))
          }
        } as any,
      })

      // Build seal_approve transaction bytes
      // This calls the seal_approve function in the NFT contract
      const tx = new Transaction()
      tx.moveCall({
        target:    `${packageId}::tuskr_nft::seal_approve`,
        arguments: [
          tx.pure.vector('u8', Array.from(nftId.replace('0x','').match(/../g)!.map(b => parseInt(b,16)))),
          tx.object(nftId),
        ],
      })
      const txBytes = await tx.build({ client: client as any, onlyTransactionKind: true })

      // Decrypt — key servers verify the approve tx and release key shares
      const decrypted = await seal.decrypt({
        data:       encryptedData,
        sessionKey,
        txBytes,
      })
      return decrypted
    } catch (e) {
      console.error('[Seal] Decrypt failed:', e)
      return null
    }
  }, [account, client, getSealClient, signTx])

  return {
    encrypt,
    decrypt,
    isAvailable: !!account,
  }
}
