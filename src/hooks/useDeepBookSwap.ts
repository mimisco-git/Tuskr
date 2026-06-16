/**
 * useDeepBookSwap — Buy NFTs with USDC via DeepBook V3 on Sui
 *
 * DeepBook V3 pool::swap_exact_quote_for_base signature:
 *   (pool, Coin<USDC>, Coin<DEEP>, min_sui_out: u64, clock)
 *   → (Coin<SUI>, Coin<USDC> change, Coin<DEEP> change)
 *
 * DeepBook V3 pool::swap_exact_base_for_quote signature:
 *   (pool, Coin<SUI>, Coin<DEEP>, min_usdc_out: u64, clock)
 *   → (Coin<USDC>, Coin<SUI> change, Coin<DEEP> change)
 *
 * Both require passing actual Coin objects (not u64 amounts).
 * DEEP fee coin can be a zero-balance coin via coin::zero<DEEP>().
 */
import { useState, useCallback }                                              from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient }     from '@mysten/dapp-kit'
import { Transaction }                                                        from '@mysten/sui/transactions'
import { useNetwork }                                                         from './useNetwork'

// ── DeepBook V3 constants ─────────────────────────────────────────────────────
const TESTNET = {
  PKG:       '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c',
  POOL:      '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5',
  SUI_TYPE:  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  USDC_TYPE: '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c::usdc::USDC',
  DEEP_TYPE: '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c::deep::DEEP',
  COIN_LABEL:'DBUSDC',
}
const MAINNET = {
  PKG:       '0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748',
  POOL:      '0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407',
  SUI_TYPE:  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  USDC_TYPE: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  DEEP_TYPE: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
  COIN_LABEL:'USDC',
}
const CLOCK  = '0x0000000000000000000000000000000000000000000000000000000000000006'
const SUI_PKG= '0x0000000000000000000000000000000000000000000000000000000000000002'

export function useDeepBookSwap() {
  const account             = useCurrentAccount()
  const { network }         = useNetwork()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const client              = useSuiClient()

  const [quoting,  setQuoting]  = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [quote,    setQuote]    = useState<{ usdcNeeded: number; suiAmount: number } | null>(null)

  const cfg = network.name === 'mainnet' ? MAINNET : TESTNET

  // ── Helper: build a zero-balance DEEP coin in the PTB ───────────────────────
  const deepZeroInTx = (tx: Transaction) =>
    tx.moveCall({
      target: `${SUI_PKG}::coin::zero`,
      typeArguments: [cfg.DEEP_TYPE],
      arguments: [],
    })

  // ── Helper: get and prepare a USDC coin for spending ────────────────────────
  const prepareUsdcCoin = async (tx: Transaction, usdcMicro: bigint) => {
    if (!account) throw new Error('No wallet connected')

    const coins = await client.getCoins({ owner: account.address, coinType: cfg.USDC_TYPE })
    if (!coins.data.length) {
      throw new Error(`No ${cfg.COIN_LABEL} in wallet. Get testnet ${cfg.COIN_LABEL} from the DeepBook testnet faucet first.`)
    }

    const total = coins.data.reduce((s, c) => s + BigInt(c.balance), 0n)
    if (total < usdcMicro) {
      const need = (Number(usdcMicro) / 1e6).toFixed(4)
      const have = (Number(total) / 1e6).toFixed(4)
      throw new Error(`Not enough ${cfg.COIN_LABEL}: need ${need}, wallet has ${have}. Use the faucet on the Swap page.`)
    }

    // Merge multiple coins into one if needed
    const primary = tx.object(coins.data[0].coinObjectId)
    if (coins.data.length > 1) {
      tx.mergeCoins(primary, coins.data.slice(1).map(c => tx.object(c.coinObjectId)))
    }

    // Split exact amount needed
    const [exactUsdc] = tx.splitCoins(primary, [tx.pure.u64(usdcMicro)])
    return exactUsdc
  }

  // ── Get a price quote ────────────────────────────────────────────────────────
  const getQuote = useCallback(async (suiAmount: number) => {
    setQuoting(true)
    setQuote(null)
    try {
      const res  = await fetch('/api/deepbook-price')
      const data = await res.json()
      if (data.price) {
        const usdcNeeded = suiAmount * data.price * 1.01 // 1% slippage buffer
        setQuote({ usdcNeeded: Math.ceil(usdcNeeded * 1e6) / 1e6, suiAmount })
        return usdcNeeded
      }
    } catch { /* silent */ } finally { setQuoting(false) }
    return null
  }, [])

  // ── Swap USDC→SUI + buy NFT in one PTB ──────────────────────────────────────
  const swapAndBuy = useCallback(async (
    listingId:   string,
    priceInMist: bigint,
    usdcAmount:  number,
  ) => {
    if (!account) throw new Error('No wallet connected')
    setSwapping(true)
    try {
      const pkg      = import.meta.env.VITE_TESTNET_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID || ''
      const mkt      = import.meta.env.VITE_TESTNET_MARKETPLACE_ID || import.meta.env.VITE_MARKETPLACE_ID || ''
      const usdcMicro = BigInt(Math.ceil(usdcAmount * 1_000_000))

      const tx = new Transaction()
      tx.setSender(account.address)

      // Step 1: Prepare USDC coin + zero DEEP coin
      const exactUsdc  = await prepareUsdcCoin(tx, usdcMicro)
      const [deepZero] = deepZeroInTx(tx)

      // Step 2: Swap USDC → SUI via DeepBook
      // pool::swap_exact_quote_for_base(pool, Coin<USDC>, Coin<DEEP>, min_sui_out, clock)
      // → (Coin<SUI>, Coin<USDC> change, Coin<DEEP> change)
      const [suiOut, usdcChange, deepChange] = tx.moveCall({
        target: `${cfg.PKG}::pool::swap_exact_quote_for_base`,
        typeArguments: [cfg.SUI_TYPE, cfg.USDC_TYPE, cfg.DEEP_TYPE],
        arguments: [
          tx.object(cfg.POOL),
          exactUsdc,
          deepZero,
          tx.pure.u64(priceInMist),  // min SUI out — slippage protection
          tx.object(CLOCK),
        ],
      })

      // Step 3: Buy NFT with the SUI received from swap
      tx.moveCall({
        target: `${pkg}::tuskr_marketplace::buy`,
        arguments: [
          tx.object(mkt),
          tx.object(listingId),
          suiOut,
        ],
      })

      // Step 4: Return change to user
      tx.transferObjects([usdcChange, deepChange], account.address)

      return await signAndExecute({ transaction: tx as never })
    } finally {
      setSwapping(false)
    }
  }, [account, cfg, signAndExecute, client])

  // ── Standalone swap: DBUSDC→SUI or SUI→DBUSDC ───────────────────────────────
  const executeSwap = useCallback(async (
    fromToken: 'SUI' | 'DBUSDC',
    amountIn:  number,
  ) => {
    if (!account) throw new Error('No wallet connected')
    setSwapping(true)
    try {
      const tx = new Transaction()
      tx.setSender(account.address)

      if (fromToken === 'DBUSDC') {
        // DBUSDC → SUI: swap_exact_quote_for_base
        const usdcMicro  = BigInt(Math.floor(amountIn * 1_000_000))
        const exactUsdc  = await prepareUsdcCoin(tx, usdcMicro)
        const [deepZero] = deepZeroInTx(tx)

        const [suiOut, usdcChange, deepChange] = tx.moveCall({
          target: `${cfg.PKG}::pool::swap_exact_quote_for_base`,
          typeArguments: [cfg.SUI_TYPE, cfg.USDC_TYPE, cfg.DEEP_TYPE],
          arguments: [
            tx.object(cfg.POOL),
            exactUsdc,
            deepZero,
            tx.pure.u64(0),   // min SUI out — accept any amount on testnet
            tx.object(CLOCK),
          ],
        })

        // Return everything to user
        tx.transferObjects([suiOut, usdcChange, deepChange], account.address)

      } else {
        // SUI → DBUSDC: swap_exact_base_for_quote
        const suiMist    = BigInt(Math.floor(amountIn * 1_000_000_000))
        const [suiCoin]  = tx.splitCoins(tx.gas, [tx.pure.u64(suiMist)])
        const [deepZero] = deepZeroInTx(tx)

        const [usdcOut, suiChange, deepChange] = tx.moveCall({
          target: `${cfg.PKG}::pool::swap_exact_base_for_quote`,
          typeArguments: [cfg.SUI_TYPE, cfg.USDC_TYPE, cfg.DEEP_TYPE],
          arguments: [
            tx.object(cfg.POOL),
            suiCoin,
            deepZero,
            tx.pure.u64(0),   // min USDC out
            tx.object(CLOCK),
          ],
        })

        tx.transferObjects([usdcOut, suiChange, deepChange], account.address)
      }

      return await signAndExecute({ transaction: tx as never })
    } finally {
      setSwapping(false)
    }
  }, [account, cfg, signAndExecute, client])

  return {
    getQuote, swapAndBuy, executeSwap,
    quote, quoting, swapping,
    coinLabel: cfg.COIN_LABEL,
    poolId:    cfg.POOL,
  }
}
