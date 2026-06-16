/**
 * Swap — DeepBook V3 bidirectional SUI/DBUSDC + Cross-chain Bridge
 */
import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit'
import { useDeepBookPrice } from '../hooks/useDeepBookPrice'
import { useDeepBookSwap }  from '../hooks/useDeepBookSwap'
import usePageTitle from '../hooks/usePageTitle'

type SwapMode   = 'sui-usdc' | 'bridge'
type TokenId    = 'SUI' | 'DBUSDC'

const TOKENS: Record<TokenId, { symbol: string; icon: string; decimals: number; label: string }> = {
  SUI:    { symbol: 'SUI',    icon: '◎', decimals: 9, label: 'Sui' },
  DBUSDC: { symbol: 'DBUSDC', icon: '$', decimals: 6, label: 'DeepBook USDC' },
}

function fmt(n: number, dec: number) {
  return n < 0.0001 ? n.toFixed(8) : n.toFixed(Math.min(dec, 4))
}

export default function Swap() {
  usePageTitle('Swap | Tuskr')

  const account  = useCurrentAccount()
  const { price: suiUSD, source, history: priceHistory } = useDeepBookPrice()
  const { executeSwap, swapping, poolId } = useDeepBookSwap()

  const [mode,      setMode]     = useState<SwapMode>('sui-usdc')
  const [fromToken, setFrom]     = useState<TokenId>('DBUSDC')
  const [amount,    setAmount]   = useState('')
  const [txMsg,     setTxMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  const toToken: TokenId = fromToken === 'SUI' ? 'DBUSDC' : 'SUI'

  // Quote computation
  const amountNum = parseFloat(amount) || 0
  const estimated = suiUSD && amountNum > 0
    ? fromToken === 'SUI'
      ? fmt(amountNum * suiUSD, 4)
      : fmt(amountNum / suiUSD, 6)
    : ''

  useEffect(() => { setTxMsg(null) }, [amount, fromToken])

  const flip = () => {
    setFrom(toToken)
    setAmount(estimated)
    setTxMsg(null)
  }

  const handleSwap = async () => {
    if (!account || amountNum <= 0) return
    setTxMsg(null)
    try {
      await executeSwap(fromToken, amountNum)
      setTxMsg({
        ok: true,
        text: `Swapped ${amount} ${TOKENS[fromToken].symbol} → ~${estimated} ${TOKENS[toToken].symbol} via DeepBook`
      })
      setAmount('')
    } catch (e: any) {
      const msg = e?.message || String(e)
      const friendly = msg.includes('user rejected') || msg.includes('cancel')
        ? 'Transaction cancelled.'
        : msg.includes('insufficient') || msg.includes('balance')
          ? `Insufficient ${TOKENS[fromToken].symbol} balance.`
          : msg.includes('argument') || msg.includes('arity')
            ? 'DeepBook pool rejected the transaction. Try a smaller amount or check your SUI balance.'
            : `Swap failed: ${msg.slice(0, 100)}`
      setTxMsg({ ok: false, text: friendly })
    }
  }

  // Sparkline mini chart
  const Sparkline = () => {
    if (priceHistory.length < 3) return null
    const pts = priceHistory
    const mn = Math.min(...pts.map((p: { t: number; p: number }) => p.p))
    const mx = Math.max(...pts.map((p: { t: number; p: number }) => p.p))
    const rng = mx - mn || 0.001
    const w = 80, h = 24
    const path = pts.map((p: { t: number; p: number }, i: number) => {
      const x = (i / (pts.length - 1)) * w
      const y = h - ((p.p - mn) / rng) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    const rising = pts.length > 0 && pts[pts.length-1].p >= pts[0].p
    const pct = pts.length > 1 ? Math.abs((pts[pts.length-1].p - pts[0].p) / pts[0].p * 100).toFixed(2) : '0.00'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <path d={path} fill="none" stroke={rising ? '#00d4aa' : '#f87171'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
        </svg>
        <span style={{ fontSize: 10, color: rising ? '#00d4aa' : '#f87171', fontFamily: 'Space Mono,monospace', fontWeight: 700 }}>
          {rising ? '+' : '-'}{pct}%
        </span>
      </div>
    )
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18, padding: '20px 22px', marginBottom: 12,
  }
  const box: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 8,
  }
  const mono10: React.CSSProperties = {
    fontSize: 10, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8,
  }

  return (
    <main style={{ background: '#000', minHeight: '100vh', paddingTop: 80, paddingBottom: 120 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 10px' }}>Swap</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa', display: 'inline-block' }}/>
              <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.45)', fontFamily: 'Space Mono,monospace' }}>
                {suiUSD ? `1 SUI = $${suiUSD.toFixed(4)} · ${source}` : 'Loading...'}
              </span>
            </div>
            <Sparkline />
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {([
            { id: 'sui-usdc' as SwapMode, label: 'SUI / DBUSDC · DeepBook' },
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
              {/* DeepBook header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>◈</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,245,247,0.6)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                    DeepBook V3
                  </span>
                </div>
                {poolId && (
                  <a href={`https://suiscan.xyz/testnet/object/${poolId}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: 'rgba(0,212,170,0.5)', fontFamily: 'Space Mono,monospace', textDecoration: 'none' }}>
                    SUI/DBUSDC pool ↗
                  </a>
                )}
              </div>

              {/* FROM */}
              <div style={box}>
                <div style={mono10}>From</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={flip} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap' as const, minWidth: 110,
                  }}>
                    <span style={{ fontSize: 16 }}>{TOKENS[fromToken].icon}</span>
                    <span>{TOKENS[fromToken].symbol}</span>
                    <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', marginLeft: 2 }}>⇅</span>
                  </button>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" min="0" step="any"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 22, fontWeight: 700, outline: 'none', textAlign: 'right' as const, letterSpacing: '-0.02em' }}
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(245,245,247,0.3)', fontFamily: 'Space Mono,monospace', textAlign: 'right' as const }}>
                  {TOKENS[fromToken].label}
                </div>
              </div>

              {/* Flip arrow */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <button onClick={flip} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
                  color: '#00d4aa', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>⇅</button>
              </div>

              {/* TO */}
              <div style={box}>
                <div style={mono10}>To (estimated)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '8px 14px', color: 'rgba(245,245,247,0.5)',
                    fontSize: 15, fontWeight: 700, minWidth: 110,
                  }}>
                    <span style={{ fontSize: 16 }}>{TOKENS[toToken].icon}</span>
                    <span>{TOKENS[toToken].symbol}</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' as const, fontSize: 22, fontWeight: 700, color: estimated ? '#00d4aa' : 'rgba(245,245,247,0.25)', letterSpacing: '-0.02em' }}>
                    {estimated || '—'}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(245,245,247,0.3)', fontFamily: 'Space Mono,monospace', textAlign: 'right' as const }}>
                  {TOKENS[toToken].label}
                </div>
              </div>

              {/* Rate breakdown */}
              {suiUSD && (
                <div style={{ padding: '12px 14px', background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 10, marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
                  {([
                    ['Rate · DeepBook', fromToken === 'SUI' ? `1 SUI = ${suiUSD.toFixed(4)} DBUSDC` : `1 DBUSDC = ${(1/suiUSD).toFixed(4)} SUI`],
                    ['Route',           `${TOKENS[fromToken].symbol} → DeepBook Pool → ${TOKENS[toToken].symbol}`],
                    ['Network',         'Sui Testnet · Programmable Transaction Block'],
                  ] as [string,string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace' }}>{k}</span>
                      <span style={{ fontSize: 11, color: k === 'Rate · DeepBook' ? '#00d4aa' : 'rgba(245,245,247,0.55)', fontFamily: 'Space Mono,monospace', textAlign: 'right' as const, maxWidth: 220 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TX feedback */}
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
              <div style={{ ...card, textAlign: 'center' as const, color: 'rgba(245,245,247,0.4)', fontSize: 14, padding: 20 }}>
                Connect your wallet to swap
              </div>
            ) : (
              <button onClick={handleSwap} disabled={swapping || amountNum <= 0} style={{
                display: 'block', width: '100%', padding: 15, borderRadius: 14, marginBottom: 12,
                background: swapping ? 'rgba(0,212,170,0.3)' : 'linear-gradient(135deg, #00d4aa, #00b894)',
                color: '#000', fontSize: 16, fontWeight: 800, border: 'none',
                cursor: swapping ? 'wait' : amountNum <= 0 ? 'not-allowed' : 'pointer',
                opacity: amountNum <= 0 && !swapping ? 0.45 : 1, transition: 'opacity 0.2s',
              }}>
                {swapping
                  ? 'Confirm in your wallet...'
                  : amountNum > 0
                    ? `Swap ${TOKENS[fromToken].symbol} for ${TOKENS[toToken].symbol} via DeepBook`
                    : 'Enter an amount'}
              </button>
            )}

            {/* How to get DBUSDC */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Need DBUSDC for testnet?</div>
              {[
                { n: '1', title: 'DeepBook Testnet UI', desc: 'Mint DBUSDC directly to your wallet from the DeepBook testnet interface.', url: 'https://deepbook.mystenlabs.com', linkText: 'deepbook.mystenlabs.com ↗' },
                { n: '2', title: 'Sui Testnet Faucet', desc: 'Get free testnet SUI first (needed for gas when minting DBUSDC).', url: 'https://faucet.testnet.sui.io', linkText: 'faucet.testnet.sui.io ↗' },
                { n: '3', title: 'Bridge from Sepolia', desc: 'Have Sepolia ETH? Bridge via Wormhole to get wrapped ETH on Sui.', action: () => setMode('bridge'), linkText: 'Open Bridge tab ↗', isButton: true },
              ].map(f => (
                <div key={f.n} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, color: '#00d4aa' }}>{f.n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', lineHeight: 1.6, marginBottom: 6 }}>{f.desc}</div>
                    {(f as any).isButton
                      ? <button onClick={(f as any).action} style={{ fontSize: 12, color: '#00d4aa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono,monospace', padding: 0 }}>{f.linkText}</button>
                      : <a href={(f as any).url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#00d4aa', textDecoration: 'none', fontFamily: 'Space Mono,monospace' }}>{f.linkText}</a>
                    }
                  </div>
                </div>
              ))}
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
                Bridge wrapped ETH from Ethereum Sepolia to Sui testnet. Once on Sui, use the DeepBook swap tab to exchange for SUI or DBUSDC.
              </p>
              <a href="https://portalbridge.com/#/transfer" target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: 12, borderRadius: 11, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 14, fontWeight: 700, textAlign: 'center' as const, textDecoration: 'none', boxSizing: 'border-box' as const }}>
                Open Wormhole Portal ↗
              </a>
            </div>

            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Testnet Faucets</div>
              {[
                { label: 'Sui Testnet SUI',  url: 'https://faucet.testnet.sui.io', note: 'Free SUI for gas',       color: '#4DA2FF' },
                { label: 'Sepolia ETH',      url: 'https://sepoliafaucet.com',      note: 'Bridge source token',   color: '#627EEA' },
                { label: 'Circle USDC',      url: 'https://faucet.circle.com',      note: 'Testnet USDC',         color: '#2775CA' },
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
              DeepBook only operates within Sui. Wormhole wraps your ETH as wETH on Sui first, then you can swap via DeepBook. For testnet SUI, the faucet above is the fastest route.
            </div>
          </>
        )}

      </div>
    </main>
  )
}
