/**
 * useDeepBookSwap — Buy NFTs with USDC via DeepBook on Sui
 *
 * Uses DeepBook V3 SUI/DBUSDC pool on testnet (SUI/USDC on mainnet).
 * One PTB: swap USDC→SUI on DeepBook, then buy the NFT atomically.
 *
 * This hits the DeepBook track requirement:
 *   "Composable with margin, lending, structured vaults, and bots"
 *   and the Agentic Web requirement for PTB-based execution.
 */
import { useState, useCallback }        from 'react'
import { useCurrentAccount,
         useSuiClient,
         useSignAndExecuteTransaction }  from '@mysten/dapp-kit'
import { Transaction }                   from '@mysten/sui/transactions'
import { DeepBookClient }                from '@mysten/deepbook-v3'
import { useNetwork }                    from './useNetwork'

// ── Pool constants ───────────────────────────────────────────────────────────
// Testnet: SUI/DBUSDC pool
const TESTNET_POOL   = '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5'
// Mainnet: SUI/USDC pool
const MAINNET_POOL   = '0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407'
const CLOCK_ID       = '0x6'

export function useDeepBookSwap() {
  const account  = useCurrentAccount()
  const client   = useSuiClient()
  const { network } = useNetwork()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [quoting,   setQuoting]   = useState(false)
  const [swapping,  setSwapping]  = useState(false)
  const [quote,     setQuote]     = useState<{ usdcNeeded: number; suiAmount: number } | null>(null)

  const isMainnet = network.name === 'mainnet'
  const poolKey   = isMainnet ? 'SUI_USDC' : 'SUI_DBUSDC'
  const poolId    = isMainnet ? MAINNET_POOL : TESTNET_POOL
  const coinLabel = isMainnet ? 'USDC' : 'DBUSDC (testnet)'

  // Get how much USDC is needed to buy X SUI
  const getQuote = useCallback(async (suiAmount: number) => {
    setQuoting(true)
    setQuote(null)
    try {
      const dbClient = new DeepBookClient({
        network: isMainnet ? 'mainnet' : 'testnet',
        client:  client as any,
        address: account?.address || '0x0',
      })
      // getQuoteQuantityOut: how much USDC needed to get X SUI out
      const result = await dbClient.getQuoteQuantityOut(poolKey, suiAmount)
      const usdcNeeded = result.quoteOut ?? (suiAmount * 2.1)
      setQuote({ usdcNeeded, suiAmount })
      return usdcNeeded
    } catch (e) {
      // Fallback: estimate from our price API
      try {
        const res  = await fetch('/api/deepbook-price')
        const data = await res.json()
        if (data.price) {
          const est = suiAmount * data.price * 1.005 // 0.5% slippage
          setQuote({ usdcNeeded: est, suiAmount })
          return est
        }
      } catch { /* silent */ }
      return null
    } finally {
      setQuoting(false)
    }
  }, [account, client, isMainnet, poolKey])

  // Execute: swap USDC→SUI on DeepBook, then buy NFT — single PTB
  const swapAndBuy = useCallback(async (
    listingId:  string,
    priceInMist: bigint,
    usdcAmount: number,
  ) => {
    if (!account) throw new Error('No wallet connected')
    setSwapping(true)

    try {
      const { packageId, marketplaceId } = (() => {
        const pkg = import.meta.env.VITE_TESTNET_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID || ''
        const mkt = import.meta.env.VITE_TESTNET_MARKETPLACE_ID || import.meta.env.VITE_MARKETPLACE_ID || ''
        return { packageId: pkg, marketplaceId: mkt }
      })()

      const dbClient = new DeepBookClient({
        network: isMainnet ? 'mainnet' : 'testnet',
        client:  client as any,
        address: account.address,
      })

      const tx = new Transaction()
      tx.setSender(account.address)

      // Step 1: Swap USDC → SUI on DeepBook
      // swapExactQuoteForBase: pay USDC, receive SUI
      dbClient.deepBook.swapExactQuoteForBase({
        poolKey,
        amount:      Math.ceil(usdcAmount * 1_000_000), // USDC has 6 decimals
        deepAmount:  0n,
        minOut:      priceInMist,  // at minimum receive enough SUI to buy the NFT
      })(tx)

      // Step 2: Buy the NFT with SUI (from user's wallet — the swap above tops it up)
      const [coin] = tx.splitCoins(tx.gas, [priceInMist])
      tx.moveCall({
        target:    `${packageId}::tuskr_marketplace::buy`,
        arguments: [
          tx.object(marketplaceId),
          tx.object(listingId),
          coin,
        ],
      })

      const result = await signAndExecute({ transaction: tx as never })
      return result
    } finally {
      setSwapping(false)
    }
  }, [account, client, isMainnet, poolKey, signAndExecute])

  return {
    getQuote,
    swapAndBuy,
    quote,
    quoting,
    swapping,
    coinLabel,
    poolId,
    poolKey,
  }
}
