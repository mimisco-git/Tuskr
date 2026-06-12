/**
 * useSeal — Seal encryption / decryption for Tuskr NFTs
 *
 * Seal: threshold encryption where only NFT owners can decrypt private content.
 * Key servers verify ownership by calling seal_approve in the Move contract.
 *
 * Testnet key servers (portal.mystenlabs.com/seal):
 *   0xb012378c... — Mysten Labs decentralized
 *   0x73d05d62... — Independent
 */
import { SealClient, SessionKey } from '@mysten/seal'
import { Transaction }            from '@mysten/sui/transactions'
import {
  useSuiClient,
  useCurrentAccount,
  useSignPersonalMessage,
} from '@mysten/dapp-kit'
import { useCallback, useRef } from 'react'
import { useNetwork }           from './useNetwork'

const SEAL_SERVERS = [
  {
    objectId: '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98',
    weight: 1,
  },
  {
    objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
    weight: 1,
  },
]

export function useSeal() {
  const client    = useSuiClient()
  const account   = useCurrentAccount()
  const { network } = useNetwork()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

  // Cache the SealClient
  const sealRef = useRef<SealClient | null>(null)
  if (!sealRef.current) {
    try {
      sealRef.current = new SealClient({
        suiClient:     client as any,
        serverConfigs: SEAL_SERVERS,
        verifyKeyServers: false,
      })
    } catch (e) {
      console.error('[Seal] Failed to create client:', e)
    }
  }

  /**
   * Encrypt arbitrary bytes for a specific NFT.
   * The encrypted blob can then be uploaded to Walrus.
   * Only the NFT owner will be able to decrypt it.
   */
  const encrypt = useCallback(async (
    data:      Uint8Array,
    nftId:     string,
    packageId: string,
  ): Promise<Uint8Array | null> => {
    const seal = sealRef.current
    if (!seal) return null
    try {
      const { encryptedObject } = await seal.encrypt({
        threshold: 1,
        packageId,
        id:        nftId,
        data,
      })
      return encryptedObject
    } catch (e) {
      console.error('[Seal] Encrypt failed:', e)
      return null
    }
  }, [])

  /**
   * Decrypt Seal-encrypted bytes.
   * Flow:
   *  1. Create a SessionKey (proves identity to key servers)
   *  2. User signs the session key message in their wallet
   *  3. Build seal_approve transaction for the key servers to verify
   *  4. SealClient.decrypt fetches key shares and decrypts
   */
  const decrypt = useCallback(async (
    encryptedBytes: Uint8Array,
    nftId:          string,
    packageId:      string,
  ): Promise<Uint8Array | null> => {
    if (!account) throw new Error('No wallet connected')
    const seal = sealRef.current
    if (!seal) throw new Error('Seal client not initialized')

    // 1. Create session key (valid 10 minutes)
    const sessionKey = await SessionKey.create({
      address:   account.address,
      packageId,
      ttlMin:    10,
      suiClient: client as any,
    })

    // 2. Sign the session key personal message with the user's wallet
    const message = sessionKey.getPersonalMessage()
    const { signature } = await signPersonalMessage({ message })
    await sessionKey.setPersonalMessageSignature(signature)

    // 3. Build seal_approve transaction
    // The Move function: seal_approve(id: vector<u8>, nft: &TuskrNFT, ctx: &TxContext)
    // id = hex-decoded NFT object ID bytes
    const idBytes = Array.from(
      nftId.replace('0x', '').match(/../g)!.map((b: string) => parseInt(b, 16))
    )
    const tx = new Transaction()
    tx.moveCall({
      target:    `${packageId}::tuskr_nft::seal_approve`,
      arguments: [
        tx.pure.vector('u8', idBytes),
        tx.object(nftId),
      ],
    })
    const txBytes = await tx.build({
      client: client as any,
      onlyTransactionKind: true,
    })

    // 4. Decrypt — Seal fetches key shares from servers, verifies seal_approve
    const decrypted = await seal.decrypt({
      data:       encryptedBytes,
      sessionKey,
      txBytes,
    })
    return decrypted
  }, [account, client, signPersonalMessage])

  return {
    encrypt,
    decrypt,
    isAvailable: !!account && !!sealRef.current,
  }
}
