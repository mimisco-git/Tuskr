/**
 * Swap — DeepBook SUI/USDC exchange + Cross-chain bridge
 *
 * Working direction:  DBUSDC -> SUI  (swap_exact_quote_for_base, proven on-chain)
 * SUI -> DBUSDC:      handled in marketplace "Buy with USDC" on each listing
 */
import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useDeepBookPrice } from '../hooks/useDeepBookPrice'
import { useDeepBookSwap }  from '../hooks/useDeepBookSwap'
import usePageTitle from '../hooks/usePageTitle'

type SwapMode = 'sui-usdc' | 'bridge'

export default function Swap() {
  usePageTitle('Swap | Tuskr')

  const account                                = useCurrentAccount()
  const { price: suiUSD, source: priceSource } = useDeepBookPrice()
  const { executeSwap, swapping, poolId }      = useDeepBookSwap()

  const [mode,     setMode]   = useState<SwapMode>('sui-usdc')
  const [amount,   setAmount] = useState('')
  const [txMsg,    setTxMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  // DBUSDC → SUI: quote based on DeepBook live rate
  const estimatedSui = suiUSD && amount && parseFloat(amount)
    ? (parseFloat(amount) / suiUSD).toFixed(6)
    : ''

  useEffect(() => { setTxMsg(null) }, [amount])

  const handleSwap = async () => {
    if (!account || !amount || !parseFloat(amount)) return
    setTxMsg(null)
    try {
      await executeSwap('DBUSDC', parseFloat(amount))
      setTxMsg({ ok: true, text: `Swapped ${amount} DBUSDC for ~${estimatedSui} SUI via DeepBook. Check your wallet.` })
      setAmount('')
    } catch (e: any) {
      const msg = e?.message || String(e)
      setTxMsg({
        ok: false,
        text: msg.includes('user rejected') || msg.includes('cancel')
          ? 'Transaction cancelled.'
          : msg.includes('insufficient') || msg.includes('balance')
            ? 'Insufficient DBUSDC balance. Use the faucet below to get testnet DBUSDC.'
            : `Swap failed: ${msg.slice(0, 120)}`
      })
    }
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18, padding: '20px 22px', marginBottom: 12,
  }
  const box: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 8,
  }
  const mono11: React.CSSProperties = {
    fontSize: 10, color: 'rgba(245,245,247,0.35)',
    fontFamily: 'Space Mono,monospace', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', marginBottom: 8,
  }

  return (
    <main style={{ background: '#000', minHeight: '100vh', paddingTop: 80, paddingBottom: 120 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px' }}>Swap</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa', display: 'inline-block', flexShrink: 0 }}/>
            <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', fontFamily: 'Space Mono,monospace' }}>
              {suiUSD ? `1 SUI = $${suiUSD.toFixed(4)} DBUSDC · ${priceSource}` : 'Loading DeepBook rate...'}
            </span>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {([
            { id: 'sui-usdc' as SwapMode, label: 'DBUSDC / SUI  ·  DeepBook' },
            { id: 'bridge'   as SwapMode, label: 'Cross-Chain Bridge' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: mode === tab.id ? 'rgba(0,212,170,0.15)' : 'transparent',
              color:      mode === tab.id ? '#00d4aa' : 'rgba(245,245,247,0.4)',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── DeepBook swap ── */}
        {mode === 'sui-usdc' && (
          <>
            <div style={card}>
              {/* DeepBook label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                  Powered by DeepBook V3
                </span>
                {poolId && (
                  <a href={`https://suiscan.xyz/testnet/object/${poolId}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: 'rgba(0,212,170,0.5)', fontFamily: 'Space Mono,monospace', textDecoration: 'none' }}>
                    View pool ↗
                  </a>
                )}
              </div>

              {/* From: DBUSDC */}
              <div style={box}>
                <div style={mono11}>From · DeepBook USDC (DBUSDC)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 14px', color: '#fff', fontSize: 15, fontWeight: 700 }}>
                    $ DBUSDC
                  </div>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" min="0" step="any"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 22, fontWeight: 700, outline: 'none', textAlign: 'right' as const, letterSpacing: '-0.02em' }}
                  />
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', color: '#00d4aa', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ↓
                </div>
              </div>

              {/* To: SUI */}
              <div style={box}>
                <div style={mono11}>To (estimated) · Sui</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 14px', color: '#fff', fontSize: 15, fontWeight: 700 }}>
                    ◎ SUI
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' as const, fontSize: 22, fontWeight: 700, color: estimatedSui ? '#00d4aa' : 'rgba(245,245,247,0.3)', letterSpacing: '-0.02em' }}>
                    {estimatedSui || '—'}
                  </div>
                </div>
              </div>

              {/* Rate */}
              {suiUSD && (
                <div style={{ padding: '10px 14px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.12)', borderRadius: 10, marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  {[
                    ['Rate · DeepBook',  `1 DBUSDC = ${(1/suiUSD).toFixed(4)} SUI`],
                    ['Route',            'DBUSDC → DeepBook Pool → SUI'],
                    ['Transaction type', 'Programmable Transaction Block (atomic)'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace' }}>{k}</span>
                      <span style={{ fontSize: 11, color: k === 'Rate · DeepBook' ? '#00d4aa' : 'rgba(245,245,247,0.55)', fontFamily: 'Space Mono,monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TX feedback */}
            {txMsg && (
              <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 12, background: txMsg.ok ? 'rgba(0,212,170,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${txMsg.ok ? 'rgba(0,212,170,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                <span style={{ fontSize: 13, color: txMsg.ok ? '#00d4aa' : '#f87171', fontFamily: 'Space Mono,monospace' }}>
                  {txMsg.ok ? '✓ ' : '✗ '}{txMsg.text}
                </span>
              </div>
            )}

            {/* Swap button */}
            {!account ? (
              <div style={{ ...card, textAlign: 'center' as const, color: 'rgba(245,245,247,0.4)', fontSize: 14, padding: 20 }}>
                Connect your wallet to swap
              </div>
            ) : (
              <button onClick={handleSwap} disabled={swapping || !amount || !parseFloat(amount)} style={{
                display: 'block', width: '100%', padding: 15, borderRadius: 14, marginBottom: 12,
                background: swapping ? 'rgba(0,212,170,0.3)' : 'linear-gradient(135deg, #00d4aa, #00b894)',
                color: '#000', fontSize: 16, fontWeight: 800, border: 'none',
                cursor: swapping ? 'wait' : (!amount || !parseFloat(amount)) ? 'not-allowed' : 'pointer',
                opacity: (!amount || !parseFloat(amount)) && !swapping ? 0.5 : 1, transition: 'opacity 0.2s',
              }}>
                {swapping ? 'Confirm in your wallet...' : 'Swap DBUSDC for SUI via DeepBook'}
              </button>
            )}

            {/* SUI->USDC note */}
            <div style={{ ...card, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(245,245,247,0.7)', marginBottom: 6 }}>
                Want to swap SUI for DBUSDC?
              </div>
              <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.6, marginBottom: 12 }}>
                Go to the Marketplace, click any NFT listing, and use the "Buy with USDC" button. Tuskr builds a DeepBook PTB that swaps your SUI for DBUSDC and completes the purchase atomically.
              </div>
              <a href="/marketplace" style={{ fontSize: 13, color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                Go to Marketplace ↗
              </a>
            </div>

            {/* How to get DBUSDC */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
                How to get DBUSDC (testnet)
              </div>

              {/* Step 1 */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: '#00d4aa' }}>1</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>DeepBook Testnet UI</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.6, marginBottom: 8 }}>
                    The DeepBook testnet interface lets you mint DBUSDC directly to your wallet. Connect your wallet, go to the Tokens section, and mint testnet DBUSDC.
                  </div>
                  <a href="https://deepbook.mystenlabs.com" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#00d4aa', textDecoration: 'none', fontFamily: 'Space Mono,monospace' }}>
                    deepbook.mystenlabs.com ↗
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: '#00d4aa' }}>2</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Sui Testnet Faucet</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.6, marginBottom: 8 }}>
                    Get free testnet SUI first (needed for gas fees when minting DBUSDC).
                  </div>
                  <a href="https://faucet.testnet.sui.io" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#00d4aa', textDecoration: 'none', fontFamily: 'Space Mono,monospace' }}>
                    faucet.testnet.sui.io ↗
                  </a>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: '#00d4aa' }}>3</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Bridge from Sepolia ETH</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.6, marginBottom: 8 }}>
                    Already have Sepolia ETH? Bridge it to Sui as wETH via Wormhole, then swap for DBUSDC via DeepBook. Or switch to the Cross-Chain Bridge tab.
                  </div>
                  <button onClick={() => setMode('bridge')}
                    style={{ fontSize: 12, color: '#00d4aa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono,monospace', padding: 0 }}>
                    Open Bridge tab ↗
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Cross-chain bridge ── */}
        {mode === 'bridge' && (
          <>
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
                Bridge wrapped ETH from Ethereum Sepolia to Sui testnet. Wormhole wraps ETH as wETH on Sui. Once on Sui, use the DeepBook swap above to exchange for SUI.
              </p>
              <a href="https://portalbridge.com/#/transfer" target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', width: '100%', padding: 12, borderRadius: 11, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 14, fontWeight: 700, textAlign: 'center' as const, textDecoration: 'none', boxSizing: 'border-box' as const }}>
                Open Wormhole Portal ↗
              </a>
            </div>

            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Testnet Faucets</div>
              {[
                { label: 'Sui Testnet SUI',  url: 'https://faucet.testnet.sui.io',   note: 'Free SUI for gas',         color: '#4DA2FF' },
                { label: 'Sepolia ETH',      url: 'https://sepoliafaucet.com',        note: 'Required before bridging', color: '#627EEA' },
                { label: 'Circle USDC',      url: 'https://faucet.circle.com',        note: 'Testnet USDC',            color: '#2775CA' },
              ].map(f => (
                <a key={f.label} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, marginBottom: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
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
              DeepBook operates only within Sui. It cannot receive tokens from Ethereum. Use Wormhole to wrap ETH as wETH on Sui first, then swap via DeepBook. For testnet SUI directly, the faucet above is fastest.
            </div>
          </>
        )}

      </div>
    </main>
  )
}
