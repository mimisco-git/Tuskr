import { useState } from 'react'
import { Link }     from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useAgentWallet }    from '../hooks/useAgentWallet'
import usePageTitle          from '../hooks/usePageTitle'

const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'

export default function AgentWallet() {
  usePageTitle('Agent Wallet')
  const account = useCurrentAccount()
  const {
    agentAddr, policy, log, saving, remainingBudget, budgetPct,
    isExpired, logBlobId, createAgent, activatePolicy, revoke,
  } = useAgentWallet(account?.address)

  const [maxSpend,  setMaxSpend]  = useState('0.5')
  const [expHours,  setExpHours]  = useState('24')
  const [scope,     setScope]     = useState('tuskr_nft_only')
  const [creating,  setCreating]  = useState(false)
  const [copied,    setCopied]    = useState(false)

  const handleCreate = () => {
    setCreating(true)
    createAgent()
    setCreating(false)
  }

  const handleActivate = () => {
    activatePolicy({
      maxSpendSui:  parseFloat(maxSpend) || 0.5,
      spentSui:     0,
      scope,
      expiresAt:    Date.now() + parseFloat(expHours) * 3600 * 1000,
    })
  }

  const copyAddr = () => {
    navigator.clipboard.writeText(agentAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColor = policy.revoked ? '#f87171' : isExpired ? '#f59e0b' : policy.active ? '#00d4aa' : 'rgba(245,245,247,0.3)'
  const statusLabel = policy.revoked ? 'Revoked' : isExpired ? 'Expired' : policy.active ? 'Active' : 'Inactive'

  if (!account) return (
    <main style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🤖</div>
        <h2 style={{ color:'#fff', marginBottom:8 }}>Connect wallet to manage Agent</h2>
        <Link to="/marketplace" style={{ color:'#00d4aa' }}>← Back to Marketplace</Link>
      </div>
    </main>
  )

  return (
    <main style={{ padding:'72px 0 120px' }}>
      <div className="container" style={{ maxWidth:800 }}>

        {/* Header */}
        <Link to="/" style={{ fontSize:13, color:'rgba(245,245,247,0.4)', textDecoration:'none', display:'block', marginBottom:20 }}>← Home</Link>
        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:'clamp(28px,4vw,40px)', fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:8 }}>
            🤖 Agent Wallet
          </h1>
          <p style={{ fontSize:15, color:'rgba(245,245,247,0.4)', lineHeight:1.6 }}>
            Give your AI agent a capped budget and let it mint NFTs autonomously — no wallet popup for every action. Owner can revoke at any time.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

          {/* Step 1 — Create Agent */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
            <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>
              Step 1 — Create Agent
            </div>
            {agentAddr ? (
              <div>
                <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:8 }}>Agent Address</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <code style={{ fontSize:11, color:'#00d4aa', fontFamily:'Space Mono,monospace', wordBreak:'break-all', flex:1 }}>
                    {agentAddr.slice(0,20)}...{agentAddr.slice(-8)}
                  </code>
                  <button onClick={copyAddr} style={{ padding:'4px 8px', borderRadius:6, background:'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.2)', color:'#00d4aa', fontSize:11, cursor:'pointer' }}>
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize:11, color:'rgba(245,245,247,0.3)', marginTop:10, lineHeight:1.5 }}>
                  ⚠ Fund this address with testnet SUI so the agent can pay gas. Use the faucet.
                </p>
                <a href={`https://suiscan.xyz/testnet/address/${agentAddr}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#00d4aa', textDecoration:'none' }}>
                  View on Suiscan ↗
                </a>
              </div>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{ width:'100%', padding:'12px', borderRadius:10, background:'#00d4aa', color:'#000', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}
              >
                {creating ? 'Creating...' : '⚡ Generate Agent Keypair'}
              </button>
            )}
          </div>

          {/* Step 2 — Set Policy */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
            <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>
              Step 2 — Set Policy
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:4 }}>Max spend (SUI)</div>
                <input
                  type="number" min="0.01" max="10" step="0.1"
                  value={maxSpend} onChange={e => setMaxSpend(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:14, boxSizing:'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:4 }}>Expires in (hours)</div>
                <input
                  type="number" min="1" max="168" step="1"
                  value={expHours} onChange={e => setExpHours(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:14, boxSizing:'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:4 }}>Scope</div>
                <select
                  value={scope} onChange={e => setScope(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'rgba(15,15,20,1)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, boxSizing:'border-box' }}
                >
                  <option value="tuskr_nft_only">Tuskr NFT minting only</option>
                  <option value="tuskr_all">Tuskr — mint + list + buy</option>
                </select>
              </div>
              <button
                onClick={handleActivate}
                disabled={!agentAddr}
                style={{ padding:'10px', borderRadius:10, background: agentAddr ? '#6366f1' : 'rgba(99,102,241,0.2)', color:'#fff', fontWeight:700, fontSize:14, border:'none', cursor: agentAddr ? 'pointer' : 'not-allowed' }}
              >
                Activate Agent Policy
              </button>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        {agentAddr && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${statusColor}30`, borderRadius:16, padding:'20px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:statusColor, boxShadow:`0 0 8px ${statusColor}`, display:'inline-block' }}/>
                <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Agent Status: <span style={{ color:statusColor }}>{statusLabel}</span></span>
              </div>
              {policy.active && !policy.revoked && (
                <button onClick={revoke} style={{ padding:'7px 16px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  🚫 Revoke Agent
                </button>
              )}
            </div>

            {/* Budget meter */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'rgba(245,245,247,0.4)' }}>Budget used</span>
                <span style={{ fontSize:12, color:'#fff', fontFamily:'Space Mono,monospace' }}>
                  {policy.spentSui.toFixed(4)} / {policy.maxSpendSui} SUI
                </span>
              </div>
              <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(budgetPct, 100)}%`, background: budgetPct > 80 ? '#f87171' : '#00d4aa', borderRadius:3, transition:'width 0.3s' }}/>
              </div>
              <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', marginTop:4, textAlign:'right' }}>
                {remainingBudget.toFixed(4)} SUI remaining · Scope: {scope} · Expires: {new Date(policy.expiresAt).toLocaleString()}
              </div>
            </div>

            {/* Policy grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { label:'Total Budget', value:`${policy.maxSpendSui} SUI` },
                { label:'Actions Taken', value: log.filter(l => l.status==='success').length },
                { label:'Blocked', value: log.filter(l => l.status==='blocked').length },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', padding:'10px', background:'rgba(0,0,0,0.2)', borderRadius:10 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {log.length > 0 && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>📋 On-Chain Activity Log</div>
              {logBlobId && (
                <a href={`${AGGREGATOR}/v1/blobs/${logBlobId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#00d4aa', textDecoration:'none', fontFamily:'Space Mono,monospace' }}>
                  🌊 View on Walrus ↗
                </a>
              )}
              {saving && <span style={{ fontSize:11, color:'rgba(245,245,247,0.4)', fontFamily:'Space Mono,monospace' }}>Saving to Walrus...</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {log.slice(0, 10).map(action => (
                <div key={action.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'rgba(0,0,0,0.2)', borderRadius:10, borderLeft:`3px solid ${action.status==='success'?'#00d4aa':action.status==='blocked'?'#f59e0b':'#f87171'}` }}>
                  <span style={{ fontSize:16 }}>
                    {action.status==='success' ? '✅' : action.status==='blocked' ? '⛔' : '❌'}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{action.type} · {action.nftName}</div>
                    <div style={{ fontSize:11, color:'rgba(245,245,247,0.35)', fontFamily:'Space Mono,monospace', marginTop:2 }}>
                      {new Date(action.ts).toLocaleTimeString()} · {action.costSui} SUI
                      {action.reason ? ` · ${action.reason}` : ''}
                    </div>
                  </div>
                  {action.txDigest && (
                    <a href={`https://suiscan.xyz/testnet/tx/${action.txDigest}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#6366f1', textDecoration:'none' }}>
                      Tx ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!agentAddr && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(245,245,247,0.25)', fontSize:14 }}>
            Create an agent keypair above to get started. The agent will act within your set policy without requiring a wallet popup for each action.
          </div>
        )}

      </div>
    </main>
  )
}
