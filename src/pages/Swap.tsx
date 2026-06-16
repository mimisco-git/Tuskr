/**
 * Swap — SUI <-> DBUSDC via DeepBook V3
 * Cross-chain bridge info via Wormhole
 */
import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useDeepBookPrice }  from '../hooks/useDeepBookPrice'
import { useDeepBookSwap }   from '../hooks/useDeepBookSwap'
import usePageTitle from '../hooks/usePageTitle'

type SwapMode = 'sui-usdc' | 'bridge'

export default function Swap() {
  usePageTitle('Swap | Tuskr')

  const account                               = useCurrentAccount()
  const { price: suiUSD, source: priceSource } = useDeepBookPrice()
  const { executeSwap, swapping, poolId }     = useDeepBookSwap()

  const [mode,      setMode]     = useState<SwapMode>('sui-usdc')
  const [fromToken, setFromToken]= useState<'SUI'|'DBUSDC'>('SUI')
  const [toToken,   setToToken]  = useState<'SUI'|'DBUSDC'>('DBUSDC')
  const [amount,    setAmount]   = useState('')
  const [quote,     setQuote]    = useState('')
  const [txMsg,     setTxMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  // Auto-quote when amount or direction changes
  useEffect(() => {
    setTxMsg(null)
    if (!amount || !suiUSD) { setQuote(''); return }
    const n = parseFloat(amount)
    if (!n || isNaN(n)) { setQuote(''); return }
    if (fromToken === 'SUI') setQuote((n * suiUSD).toFixed(4))
    else                     setQuote((n / suiUSD).toFixed(6))
  }, [amount, fromToken, suiUSD])

  const flip = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setAmount(quote)
    setQuote(amount)
    setTxMsg(null)
  }

  const handleSwap = async () => {
    if (!account || !amount || !parseFloat(amount)) return
    setTxMsg(null)
    try {
      await executeSwap(fromToken, parseFloat(amount))
      setTxMsg({ ok: true, text: `Swapped ${amount} ${fromToken} via DeepBook. Check your wallet for ${toToken}.` })
      setAmount('')
      setQuote('')
    } catch (e: any) {
      const msg = e?.message || String(e)
      setTxMsg({ ok: false, text: msg.includes('user rejected') ? 'Transaction cancelled.' : `Swap failed: ${msg.slice(0, 120)}` })
    }
  }

  // Shared card style
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18, padding: '20px 22px', marginBottom: 12,
  }
  const inputBox: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 8,
  }
  const tokenSel: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 9, padding: '8px 12px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  }
  const numInput: React.CSSProperties = {
    flex: 1, background: 'transparent', border: 'none', color: '#fff',
    fontSize: 22, fontWeight: 700, outline: 'none', textAlign: 'right' as const,
    letterSpacing: '-0.02em',
  }
  const label11: React.CSSProperties = {
    fontSize: 10, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8,
  }

  return (
    <main style={{ background: '#000', minHeight: '100vh', paddingTop: 80, paddingBottom: 120 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Swap
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa', flexShrink: 0, display: 'inline-block' }}/>
            <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', fontFamily: 'Space Mono,monospace' }}>
              {suiUSD ? `1 SUI = $${suiUSD.toFixed(4)} USDC · ${priceSource}` : 'Loading DeepBook rate...'}
            </span>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {([
            { id: 'sui-usdc' as SwapMode, label: 'SUI / USDC · DeepBook' },
            { id: 'bridge'   as SwapMode, label: 'Cross-Chain Bridge' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: mode === tab.id ? 'rgba(0,212,170,0.15)' : 'transparent',
              color:      mode === tab.id ? '#00d4aa' : 'rgba(245,245,247,0.4)',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DeepBook SUI / USDC swap ── */}
        {mode === 'sui-usdc' && (
          <>
            <div style={card}>
              {/* DeepBook badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                    Powered by DeepBook V3
                  </span>
                </div>
                {poolId && (
                  <span style={{ fontSize: 10, color: 'rgba(245,245,247,0.2)', fontFamily: 'Space Mono,monospace' }}>
                    Pool: {poolId.slice(0, 8)}...
                  </span>
                )}
              </div>

              {/* From */}
              <div style={inputBox}>
                <div style={label11}>From</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select value={fromToken} onChange={e => { setFromToken(e.target.value as any); setToToken(e.target.value === 'SUI' ? 'DBUSDC' : 'SUI') }} style={tokenSel}>
                    <option value="SUI">◎ SUI</option>
                    <option value="DBUSDC">$ DBUSDC</option>
                  </select>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" min="0" step="any"
                    style={numInput}
                  />
                </div>
              </div>

              {/* Flip */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <button onClick={flip} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)',
                  color: '#00d4aa', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  ⇅
                </button>
              </div>

              {/* To */}
              <div style={inputBox}>
                <div style={label11}>To (estimated)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...tokenSel, cursor: 'default', opacity: 0.7 }}>
                    {toToken === 'SUI' ? '◎ SUI' : '$ DBUSDC'}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' as const, fontSize: 22, fontWeight: 700, color: quote ? '#00d4aa' : 'rgba(245,245,247,0.3)', letterSpacing: '-0.02em' }}>
                    {quote || '—'}
                  </div>
                </div>
              </div>

              {/* Rate and slippage */}
              {suiUSD && (
                <div style={{ padding: '10px 14px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.12)', borderRadius: 10, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', fontFamily: 'Space Mono,monospace' }}>Rate · DeepBook</span>
                    <span style={{ fontSize: 11, color: '#00d4aa',              fontFamily: 'Space Mono,monospace' }}>
                      {fromToken === 'SUI' ? `1 SUI = ${suiUSD.toFixed(4)} DBUSDC` : `1 DBUSDC = ${(1/suiUSD).toFixed(4)} SUI`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', fontFamily: 'Space Mono,monospace' }}>Pool</span>
                    <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', fontFamily: 'Space Mono,monospace' }}>
                      SUI/DBUSDC · Sui Testnet
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction feedback */}
            {txMsg && (
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 12,
                background: txMsg.ok ? 'rgba(0,212,170,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${txMsg.ok ? 'rgba(0,212,170,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                <span style={{ fontSize: 13, color: txMsg.ok ? '#00d4aa' : '#f87171', fontFamily: 'Space Mono,monospace' }}>
                  {txMsg.ok ? '✓ ' : '✗ '}{txMsg.text}
                </span>
              </div>
            )}

            {/* Swap button */}
            {!account ? (
              <div style={{ ...card, textAlign: 'center' as const, color: 'rgba(245,245,247,0.4)', fontSize: 14, padding: '20px' }}>
                Connect your wallet to swap
              </div>
            ) : (
              <button
                onClick={handleSwap}
                disabled={swapping || !amount || !parseFloat(amount)}
                style={{
                  display: 'block', width: '100%', padding: '15px',
                  borderRadius: 14, marginBottom: 12,
                  background: swapping ? 'rgba(0,212,170,0.3)' : 'linear-gradient(135deg, #00d4aa, #00b894)',
                  color: '#000', fontSize: 16, fontWeight: 800,
                  border: 'none', cursor: swapping ? 'wait' : 'pointer',
                  opacity: (!amount || !parseFloat(amount)) ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {swapping
                  ? 'Waiting for wallet...'
                  : `Swap ${fromToken} for ${toToken} via DeepBook`}
              </button>
            )}

            {/* Info */}
            <div style={{ ...card, fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'rgba(245,245,247,0.65)', marginBottom: 6 }}>How DeepBook swap works</div>
              DeepBook V3 is Sui's native central limit order book. Your swap executes against real on-chain liquidity in a single Programmable Transaction Block. The rate above is pulled live from the DeepBook price indexer. On testnet, use DBUSDC (DeepBook test USDC) rather than Circle USDC.
              <div style={{ marginTop: 10 }}>
                <a href={`https://suiscan.xyz/testnet/object/${poolId}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4aa', textDecoration: 'none' }}>
                  View pool on Suiscan ↗
                </a>
              </div>
            </div>
          </>
        )}

        {/* ── Cross-chain bridge ── */}
        {mode === 'bridge' && (
          <>
            {/* Wormhole */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌀</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Wormhole Portal</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)' }}>Sepolia ETH to Sui testnet</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(0,212,170,0.1)', color: '#00d4aa', padding: '3px 8px', borderRadius: 5, fontFamily: 'Space Mono,monospace', textTransform: 'uppercase' as const }}>Testnet</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', lineHeight: 1.6, marginBottom: 14 }}>
                Bridge wrapped ETH from Ethereum Sepolia to Sui testnet. Wormhole wraps ETH as wETH on Sui. Once on Sui, DeepBook can swap it for SUI or DBUSDC.
              </p>
              <a href="https://portalbridge.com/#/transfer" target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 11, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 14, fontWeight: 700, textAlign: 'center' as const, textDecoration: 'none', boxSizing: 'border-box' as const }}>
                Open Wormhole Portal ↗
              </a>
            </div>

            {/* Faucets */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Testnet Faucets</div>
              {[
                { label: 'Sui Testnet SUI',  url: 'https://faucet.testnet.sui.io',   note: 'Free testnet SUI',          color: '#4DA2FF' },
                { label: 'Sepolia ETH',      url: 'https://sepoliafaucet.com',        note: 'Required before bridging',  color: '#627EEA' },
                { label: 'Circle USDC',      url: 'https://faucet.circle.com',        note: 'Testnet USDC',             color: '#2775CA' },
              ].map(f => (
                <a key={f.label} href={f.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  textDecoration: 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', marginTop: 2 }}>{f.note}</div>
                  </div>
                  <span style={{ fontSize: 12, color: f.color, fontFamily: 'Space Mono,monospace' }}>Get ↗</span>
                </a>
              ))}
            </div>

            <div style={{ ...card, fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'rgba(245,245,247,0.6)', marginBottom: 6 }}>Why no direct Sepolia to SUI swap?</div>
              DeepBook runs entirely within Sui. It cannot receive tokens from Ethereum or other chains. Wormhole wraps your ETH as wETH on Sui first, then DeepBook can swap wETH for SUI or USDC. For testnet SUI, the Sui faucet above is the fastest route.
            </div>
          </>
        )}

      </div>
    </main>
  )
}
