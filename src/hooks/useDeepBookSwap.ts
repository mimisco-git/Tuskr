/**
 * useDeepBookSwap — Buy NFTs with USDC via DeepBook on Sui
 *
 * Uses direct Move calls to DeepBook V3 pool (no SDK import needed).
 * swap_exact_quote_for_base: pay USDC, receive SUI, buy NFT — one PTB.
 *
 * Testnet pool: SUI/DBUSDC  0x1c19362...
 * Mainnet pool: SUI/USDC    0xe05dafb5...
 */
import { useState, useCallback }                           from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction }                                     from '@mysten/sui/transactions'
import { useNetwork }                                      from './useNetwork'

// ── DeepBook V3 constants ────────────────────────────────────────────────────
const TESTNET = {
  PKG:  '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c',
  POOL: '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5',
  SUI_TYPE:   '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  USDC_TYPE:  '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c::usdc::USDC',
  DEEP_TYPE:  '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c::deep::DEEP',
  COIN_LABEL: 'DBUSDC',
}
const MAINNET = {
  PKG:  '0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748',
  POOL: '0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407',
  SUI_TYPE:   '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  USDC_TYPE:  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  DEEP_TYPE:  '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
  COIN_LABEL: 'USDC',
}
const CLOCK = '0x0000000000000000000000000000000000000000000000000000000000000006'

export function useDeepBookSwap() {
  const account  = useCurrentAccount()
  const { network } = useNetwork()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [quoting,  setQuoting]  = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [quote,    setQuote]    = useState<{ usdcNeeded: number; suiAmount: number } | null>(null)

  const cfg = network.name === 'mainnet' ? MAINNET : TESTNET

  // Get a USDC quote using our DeepBook price API (no SDK needed)
  const getQuote = useCallback(async (suiAmount: number) => {
    setQuoting(true)
    setQuote(null)
    try {
      const res  = await fetch('/api/deepbook-price')
      const data = await res.json()
      if (data.price) {
        // Add 1% buffer for slippage
        const usdcNeeded = suiAmount * data.price * 1.01
        setQuote({ usdcNeeded: Math.ceil(usdcNeeded * 1e6) / 1e6, suiAmount })
        return usdcNeeded
      }
    } catch { /* silent */ } finally { setQuoting(false) }
    return null
  }, [])

  // Execute: DeepBook swap USDC→SUI + NFT buy in one PTB
  const swapAndBuy = useCallback(async (
    listingId:   string,
    priceInMist: bigint,
    usdcAmount:  number,
  ) => {
    if (!account) throw new Error('No wallet connected')
    setSwapping(true)

    try {
      const pkg = import.meta.env.VITE_TESTNET_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID || ''
      const mkt = import.meta.env.VITE_TESTNET_MARKETPLACE_ID || import.meta.env.VITE_MARKETPLACE_ID || ''

      const tx = new Transaction()
      tx.setSender(account.address)

      // Amount in USDC micro-units (6 decimals)
      const usdcMicro = BigInt(Math.ceil(usdcAmount * 1_000_000))

      // ── Step 1: Swap USDC → SUI on DeepBook pool ──
      // pool::swap_exact_quote_for_base<Base, Quote, DeepCoin>
      // Pays USDC (quote), receives SUI (base)
      const [suiOut] = tx.moveCall({
        target: `${cfg.PKG}::pool::swap_exact_quote_for_base`,
        typeArguments: [cfg.SUI_TYPE, cfg.USDC_TYPE, cfg.DEEP_TYPE],
        arguments: [
          tx.object(cfg.POOL),
          tx.pure.u64(usdcMicro),      // exact quote amount in
          tx.pure.u64(priceInMist),    // min base amount out (slippage protection)
          tx.object(CLOCK),
        ],
      })

      // ── Step 2: Buy the NFT with the SUI received ──
      tx.moveCall({
        target: `${pkg}::tuskr_marketplace::buy`,
        arguments: [
          tx.object(mkt),
          tx.object(listingId),
          suiOut,  // SUI from DeepBook swap
        ],
      })

      return await signAndExecute({ transaction: tx as never })
    } finally {
      setSwapping(false)
    }
  }, [account, cfg, signAndExecute])

  return {
    getQuote, swapAndBuy, quote, quoting, swapping,
    coinLabel: cfg.COIN_LABEL,
    poolId:    cfg.POOL,
  }
}
