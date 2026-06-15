/**
 * Swap page — token swapping within and across chains
 *
 * Within Sui:
 *   SUI <-> USDC via DeepBook V3 (already live on Tuskr)
 *   SUI <-> USDT, SUI <-> wETH via Aftermath / Cetus (via iframe or direct links)
 *
 * Cross-chain (Sepolia ETH -> Sui):
 *   Wormhole Portal — the only reliable Sepolia->Sui testnet bridge
 *
 * NOTE on Sepolia -> Sui:
 *   No AMM or DEX natively connects Ethereum Sepolia to Sui testnet.
 *   Wormhole supports Sepolia -> Sui testnet bridge for wrapped tokens.
 *   For testnet SUI itself, the Sui faucet is the correct tool.
 */
import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useDeepBookPrice } from '../hooks/useDeepBookPrice'
import { useDeepBookSwap }  from '../hooks/useDeepBookSwap'
import usePageTitle from '../hooks/usePageTitle'

type SwapMode = 'sui-usdc' | 'bridge'

const TOKENS = [
  { id: 'SUI',     label: 'SUI',      icon: '◎', network: 'Sui Testnet',      color: '#4DA2FF' },
  { id: 'DBUSDC',  label: 'DBUSDC',   icon: '$', network: 'Sui Testnet',      color: '#2775CA' },
  { id: 'ETH',     label: 'ETH',      icon: 'Ξ', network: 'Sepolia Testnet',  color: '#627EEA' },
]

export default function Swap() {
  usePageTitle('Swap')

  const account      = useCurrentAccount()
  const { price: suiUSD, source } = useDeepBookPrice()
  const { getQuote } = useDeepBookSwap()

  const [mode,       setMode]      = useState<SwapMode>('sui-usdc')
  const [fromToken,  setFromToken] = useState('SUI')
  const [toToken,    setToToken]   = useState('DBUSDC')
  const [amount,     setAmount]    = useState('')
  const [quote,      setQuote]     = useState<{ out: string; rate: string } | null>(null)
  const [quoting,    setQuoting]   = useState(false)

  // Auto-fetch quote when amount changes
  useEffect(() => {
    if (!amount || !suiUSD || fromToken === toToken) { setQuote(null); return }
    const num = parseFloat(amount)
    if (!num || isNaN(num)) { setQuote(null); return }

    if (fromToken === 'SUI' && toToken === 'DBUSDC' && suiUSD) {
      setQuote({ out: (num * suiUSD).toFixed(4), rate: `1 SUI = $${suiUSD.toFixed(4)}` })
    } else if (fromToken === 'DBUSDC' && toToken === 'SUI' && suiUSD) {
      setQuote({ out: (num / suiUSD).toFixed(6), rate: `1 USDC = ${(1/suiUSD).toFixed(4)} SUI` })
    }
  }, [amount, fromToken, toToken, suiUSD])

  const flip = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setAmount(quote?.out || '')
    setQuote(null)
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: '20px 22px',
    marginBottom: 12,
  }

  return (
    <main style={{ background: '#000', minHeight: '100vh', paddingTop: 80, paddingBottom: 120 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
            Swap
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.45)', marginTop: 4 }}>
            Swap tokens on Sui via DeepBook, or bridge from other chains.
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {([
            { id: 'sui-usdc', label: 'SUI / USDC' },
            { id: 'bridge',   label: 'Cross-Chain Bridge' },
          ] as { id: SwapMode; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)} style={{
              flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: mode === tab.id ? 'rgba(0,212,170,0.15)' : 'transparent',
              color:      mode === tab.id ? '#00d4aa' : 'rgba(245,245,247,0.4)',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── SUI / USDC swap via DeepBook ── */}
        {mode === 'sui-usdc' && (
          <>
            <div style={{ ...card, position: 'relative' }}>
              {/* DeepBook badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Powered by DeepBook V3
                </span>
                {suiUSD && (
                  <span style={{ fontSize: 11, color: 'rgba(0,212,170,0.7)', fontFamily: 'Space Mono,monospace' }}>
                    1 SUI = ${suiUSD.toFixed(4)} · {source}
                  </span>
                )}
              </div>

              {/* From */}
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', marginBottom: 8, fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select value={fromToken} onChange={e => setFromToken(e.target.value)} style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 9, padding: '8px 12px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}>
                    <option value="SUI">◎ SUI</option>
                    <option value="DBUSDC">$ DBUSDC</option>
                  </select>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" min="0" step="any"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 22, fontWeight: 700, outline: 'none', textAlign: 'right', letterSpacing: '-0.02em' }}
                  />
                </div>
              </div>

              {/* Flip button */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <button onClick={flip} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', color: '#00d4aa', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ⇅
                </button>
              </div>

              {/* To */}
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', marginBottom: 8, fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>To (estimated)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select value={toToken} onChange={e => setToToken(e.target.value)} style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 9, padding: '8px 12px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}>
                    <option value="DBUSDC">$ DBUSDC</option>
                    <option value="SUI">◎ SUI</option>
                  </select>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: 22, fontWeight: 700, color: quote ? '#00d4aa' : 'rgba(245,245,247,0.3)', letterSpacing: '-0.02em' }}>
                    {quote ? quote.out : '—'}
                  </div>
                </div>
              </div>

              {/* Rate */}
              {quote && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.12)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', fontFamily: 'Space Mono,monospace' }}>Exchange rate</span>
                  <span style={{ fontSize: 12, color: '#00d4aa', fontFamily: 'Space Mono,monospace' }}>{quote.rate}</span>
                </div>
              )}
            </div>

            {/* Swap button */}
            {account ? (
              <a
                href="/marketplace"
                style={{ display: 'block', width: '100%', padding: '15px', borderRadius: 14, background: 'linear-gradient(135deg, #00d4aa, #00b894)', color: '#000', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              >
                Swap via DeepBook
              </a>
            ) : (
              <div style={{ ...card, textAlign: 'center', color: 'rgba(245,245,247,0.45)', fontSize: 14 }}>
                Connect wallet to swap
              </div>
            )}

            {/* Info */}
            <div style={{ ...card, fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'rgba(245,245,247,0.7)', marginBottom: 6 }}>How it works</div>
              DeepBook V3 is Sui's native central limit order book. Tuskr uses it to execute SUI-USDC swaps atomically in a single Programmable Transaction Block. The exchange rate is pulled live from the DeepBook indexer. No slippage tolerance needed for market orders under typical liquidity conditions.
              <div style={{ marginTop: 10 }}>
                <a href="https://deepbook.mystenlabs.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4aa', textDecoration: 'none' }}>DeepBook documentation ↗</a>
              </div>
            </div>
          </>
        )}

        {/* ── Cross-chain bridge ── */}
        {mode === 'bridge' && (
          <>
            {/* Wormhole */}
            <div style={{ ...card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌀</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Wormhole Portal</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)' }}>Sepolia ETH → Sui testnet</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(0,212,170,0.1)', color: '#00d4aa', padding: '3px 8px', borderRadius: 5, fontFamily: 'Space Mono,monospace', textTransform: 'uppercase' }}>Testnet</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', lineHeight: 1.6, marginBottom: 14 }}>
                Bridge wrapped ETH from Ethereum Sepolia to Sui testnet. Wormhole wraps ETH as wETH on Sui. You need testnet ETH from the Sepolia faucet first.
              </p>
              <a href="https://portalbridge.com/#/transfer" target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 11, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                Open Wormhole Portal ↗
              </a>
            </div>

            {/* Testnet faucets */}
            <div style={{ ...card }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Testnet Faucets</div>
              {[
                { label: 'Sui Testnet SUI',      url: 'https://faucet.testnet.sui.io',      note: 'Free testnet SUI', color: '#4DA2FF' },
                { label: 'Sepolia ETH',           url: 'https://sepoliafaucet.com',          note: 'Free Sepolia ETH for bridging', color: '#627EEA' },
                { label: 'Sui Testnet USDC',      url: 'https://faucet.circle.com',          note: 'Circle testnet USDC', color: '#2775CA' },
              ].map(f => (
                <a key={f.label} href={f.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 8, textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', marginTop: 2 }}>{f.note}</div>
                  </div>
                  <span style={{ fontSize: 12, color: f.color, fontFamily: 'Space Mono,monospace' }}>Get ↗</span>
                </a>
              ))}
            </div>

            {/* Why no native cross-chain DEX */}
            <div style={{ ...card, fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'rgba(245,245,247,0.6)', marginBottom: 6 }}>Why no direct Sepolia → SUI swap?</div>
              DeepBook operates entirely within the Sui ecosystem. It cannot natively receive or swap tokens from Ethereum, Sepolia, or other chains. Cross-chain swaps require a bridge protocol (like Wormhole) to first wrap the token onto Sui, and then DeepBook can swap the wrapped version for SUI or USDC. For testnet SUI directly, the Sui faucet is the fastest path.
            </div>
          </>
        )}

      </div>
    </main>
  )
}
