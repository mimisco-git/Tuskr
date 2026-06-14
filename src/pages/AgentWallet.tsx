import { useState } from 'react'
import { Link }     from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { useAgentCommands, type CommandResult } from '../hooks/useAgentCommands'
import { useAgentWallet }    from '../hooks/useAgentWallet'
import usePageTitle          from '../hooks/usePageTitle'

const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'

export default function AgentWallet() {
  usePageTitle('Agent Wallet')
  const account = useCurrentAccount()
  const {
    agentAddr, derived, deriving, policy, log, saving,
    remainingBudget, budgetPct, isExpired, logBlobId,
    deriveKeypair, activatePolicy, revoke, executeAutonomously,
  } = useAgentWallet(account?.address)

  const [maxSpend,  setMaxSpend]  = useState('0.5')
  const [expHours,  setExpHours]  = useState('24')
  const [scope,     setScope]     = useState('tuskr_nft_only')
  const [copied,    setCopied]    = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [testMsg,   setTestMsg]   = useState('')
  const [cmdInput,      setCmdInput]      = useState('')
  const [withdrawing,   setWithdrawing]   = useState(false)
  const [withdrawMsg,   setWithdrawMsg]   = useState('')

const handleActivate = () => {
    activatePolicy({
      maxSpendSui:  parseFloat(maxSpend) || 0.5,
      spentSui:     0,
      scope,
      expiresAt:    Date.now() + parseFloat(expHours) * 3600 * 1000,
    })
  }

  const handleTest = async () => {
    if (!agentAddr || !policy.active) {
      setTestMsg('Activate the agent policy first.')
      return
    }
    setTesting(true)
    setTestMsg('Agent is signing a test transaction...')
    try {
      // Agent sends 1 MIST to owner address — proves autonomous signing works
      const tx = new Transaction()
      tx.setSender(agentAddr)
      const [coin] = tx.splitCoins(tx.gas, [1n])
      tx.transferObjects([coin], tx.pure.address(account?.address || agentAddr))
      const result = await executeAutonomously(tx, 0.000000001, {
        type: 'test', nftName: 'Agent Test Transaction',
      })
      if (result) {
        setTestMsg(`✅ Agent executed successfully! Tx: ${result.digest.slice(0,16)}... Check activity log.`)
      } else {
        setTestMsg('❌ Agent needs testnet SUI. Copy the agent address and use the Sui faucet.')
      }
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('insufficient') || msg.includes('gas')) {
        setTestMsg('❌ Agent needs testnet SUI. Fund the agent address from the Sui faucet, then test again.')
      } else {
        setTestMsg(`❌ ${msg.slice(0, 120)}`)
      }
    } finally { setTesting(false) }
  }

  const handleWithdraw = async () => {
    if (!account?.address || !agentAddr || !derived) {
      setWithdrawMsg('Activate the agent key first.')
      return
    }
    setWithdrawing(true)
    setWithdrawMsg('Building withdrawal transaction...')
    try {
      const { Transaction } = await import('@mysten/sui/transactions')
      const tx = new Transaction()
      tx.setSender(agentAddr)
      // Transfer all gas (minus fee reserve) back to owner wallet
      tx.transferObjects([tx.gas], tx.pure.address(account.address))
      const result = await executeAutonomously(tx, 0, {
        type: 'withdraw', nftName: 'Withdraw to main wallet',
      })
      if (result) {
        setWithdrawMsg(`Withdrawn to your main wallet. Tx: ${result.digest.slice(0,20)}...`)
      } else {
        setWithdrawMsg('Withdrawal failed. Make sure agent has SUI balance.')
      }
    } catch (e: any) {
      setWithdrawMsg(e?.message?.slice(0, 120) || 'Withdrawal failed.')
    } finally { setWithdrawing(false) }
  }

  const copyAddr = () => {
    navigator.clipboard.writeText(agentAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { runCommand, result: cmdResult, running: cmdRunning } =
    useAgentCommands(agentAddr, policy, executeAutonomously)

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
            Agent Wallet
          </h1>
          <p style={{ fontSize:15, color:'rgba(245,245,247,0.4)', lineHeight:1.6 }}>
            Your AI agent gets its own Sui wallet with a strict spending policy. It signs transactions autonomously within the budget, no wallet popup.. Every action is logged on Walrus. You can revoke it instantly.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

          {/* Step 1: Activate Agent Key */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
            <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>
              Step 1: Activate Agent Key
            </div>
            <p style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:12, lineHeight:1.6 }}>
              Your agent key is derived from your wallet signature. Never stored anywhere. Same wallet always produces the same agent address.
            </p>
            {derived && agentAddr ? (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#00d4aa', display:'inline-block' }}/>
                  <span style={{ fontSize:12, fontWeight:700, color:'#00d4aa' }}>Agent key active this session</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <code style={{ fontSize:11, color:'rgba(245,245,247,0.7)', fontFamily:'Space Mono,monospace', wordBreak:'break-all', flex:1 }}>
                    {agentAddr.slice(0,22)}...{agentAddr.slice(-8)}
                  </code>
                  <button onClick={copyAddr} style={{ padding:'4px 8px', borderRadius:6, background:'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.2)', color:'#00d4aa', fontSize:11, cursor:'pointer', flexShrink:0 }}>
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  <a href={`https://suiscan.xyz/testnet/address/${agentAddr}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#00d4aa', textDecoration:'none' }}>View on Suiscan ↗</a>
                  <a href="https://faucet.testnet.sui.io" target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'rgba(245,245,247,0.4)', textDecoration:'none' }}>Get testnet SUI ↗</a>
                </div>
                <p style={{ fontSize:11, color:'rgba(245,245,247,0.3)', marginTop:10, lineHeight:1.5 }}>
                  Send 0.05 SUI to the agent address above for gas. Re-activate after each page refresh.
                </p>
              </div>
            ) : (
              <button
                onClick={async () => { try { await deriveKeypair() } catch(e:any) { alert(e?.message) } }}
                disabled={deriving}
                style={{ width:'100%', padding:'12px', borderRadius:10, background: deriving ? 'rgba(0,212,170,0.3)' : '#00d4aa', color:'#000', fontWeight:700, fontSize:14, border:'none', cursor: deriving ? 'not-allowed' : 'pointer' }}
              >
                {deriving ? 'Sign in your wallet...' : 'Activate Agent Key'}
              </button>
            )}
          </div>

          {/* Step 2: Set Policy */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
            <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>
              Step 2: Set Policy
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
                  <option value="tuskr_all">Tuskr: mint, list and buy</option>
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
                  Revoke Agent
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
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

            {/* What does the agent do? */}
            <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#a5b4fc', marginBottom:8 }}>What the agent does autonomously:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {([
                  { c:'#a5b4fc', text:'Signs Sui transactions using its own Ed25519 keypair. No wallet popup.' },
                  { c:'#a5b4fc', text:'Enforces the 0.5 SUI budget ceiling before every action' },
                  { c:'#a5b4fc', text:'Logs every action permanently to Walrus, verifiable on-chain.' },
                  { c:'#a5b4fc', text:'Respects the 24h expiry. All actions blocked after timeout.' },
                  { c:'#f87171', text:'Instantly disabled when you click Revoke Agent' },
                ] as {c:string,text:string}[]).map((item, i) => (
                  <div key={i} style={{ fontSize:12, color:'rgba(245,245,247,0.6)', display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ flexShrink:0, marginTop:3, width:5, height:5, borderRadius:'50%', background:item.c, display:'inline-block' }}/>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test button */}
            <div>
              <button
                onClick={handleTest}
                disabled={testing || !policy.active}
                style={{ width:'100%', padding:'11px', borderRadius:10, background: testing ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:13, fontWeight:700, cursor: testing ? 'not-allowed' : 'pointer' }}
              >
                {testing ? 'Signing transaction...' : 'Test Agent: Fire a Real Transaction'}
              </button>
              {testMsg && (
                <div style={{ marginTop:10, padding:'10px 14px', background: testMsg.startsWith('✅') ? 'rgba(0,212,170,0.08)' : testMsg.startsWith('❌') ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', border:`1px solid ${testMsg.startsWith('✅') ? 'rgba(0,212,170,0.25)' : testMsg.startsWith('❌') ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius:10, fontSize:12, color:'rgba(245,245,247,0.7)', lineHeight:1.5, fontFamily:'Space Mono,monospace' }}>
                  {testMsg}
                </div>
              )}
              <div style={{ marginTop:8, fontSize:11, color:'rgba(245,245,247,0.25)', fontFamily:'Space Mono,monospace' }}>
                Agent sends 1 MIST to your wallet autonomously. Requires agent address to have testnet SUI for gas.
              </div>
            </div>
          </div>
        )}

        {/* ── AGENT COMMAND PANEL ─────────────────────────────────── */}
        {agentAddr && policy.active && (
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px', marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>Command the Agent</div>
            <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:14, lineHeight:1.6 }}>
              Type what you want in plain English. The agent figures out the rest and executes autonomously.
            </div>

            {/* Examples */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
              {[
                'mint a cyberpunk elephant NFT',
                'buy cheapest NFT under 2 SUI',
                'mint a glowing ocean sunset',
              ].map(ex => (
                <button key={ex} onClick={() => setCmdInput(ex)} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer',
                  background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
                  color:'rgba(165,180,252,0.8)', fontFamily:'Space Mono,monospace',
                }}>
                  {ex}
                </button>
              ))}
            </div>

            {/* Input + button */}
            <div style={{ display:'flex', gap:10 }}>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !cmdRunning) runCommand(cmdInput) }}
                placeholder="mint a neon tiger NFT  /  buy cheapest under 1 SUI  /  list NFT 0x... at 2 SUI"
                disabled={cmdRunning}
                style={{
                  flex:1, padding:'11px 14px', borderRadius:10,
                  background:'rgba(255,255,255,0.05)',
                  border:`1px solid ${cmdRunning ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit',
                }}
              />
              <button
                onClick={() => runCommand(cmdInput)}
                disabled={cmdRunning || !cmdInput.trim()}
                style={{
                  padding:'11px 20px', borderRadius:10, border:'none',
                  background: cmdRunning ? 'rgba(99,102,241,0.3)' : '#6366f1',
                  color:'#fff', fontSize:13, fontWeight:700,
                  cursor: cmdRunning ? 'not-allowed' : 'pointer', whiteSpace:'nowrap',
                }}
              >
                {cmdRunning ? 'Running...' : 'Run'}
              </button>
            </div>

            {/* Result */}
            {cmdResult && (
              <div style={{
                marginTop:14, padding:'14px 16px', borderRadius:12,
                background: cmdResult.status==='done' ? 'rgba(0,212,170,0.07)' : cmdResult.status==='failed' ? 'rgba(239,68,68,0.07)' : 'rgba(99,102,241,0.07)',
                border: `1px solid ${cmdResult.status==='done' ? 'rgba(0,212,170,0.25)' : cmdResult.status==='failed' ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)'}`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  {cmdResult.status === 'done'
                    ? <span style={{ width:8, height:8, borderRadius:'50%', background:'#00d4aa', display:'inline-block', boxShadow:'0 0 6px #00d4aa' }}/>
                    : cmdResult.status === 'failed'
                      ? <span style={{ width:8, height:8, borderRadius:'50%', background:'#f87171', display:'inline-block' }}/>
                      : <span style={{ width:8, height:8, borderRadius:'50%', background:'#a5b4fc', display:'inline-block', animation:'pulse 1s infinite' }}/>
                  }
                  <span style={{ fontSize:12, fontWeight:700, color:'rgba(245,245,247,0.7)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    {cmdResult.status}
                  </span>
                </div>
                <div style={{ fontSize:13, color:'rgba(245,245,247,0.75)', lineHeight:1.6 }}>
                  {cmdResult.message}
                </div>
                {cmdResult.txDigest && (
                  <a href={`https://suiscan.xyz/testnet/tx/${cmdResult.txDigest}`} target="_blank" rel="noopener noreferrer"
                    style={{ display:'block', marginTop:8, fontSize:11, color:'#6366f1', textDecoration:'none', fontFamily:'Space Mono,monospace' }}>
                    Tx on Suiscan: {cmdResult.txDigest.slice(0,24)}...
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activity Log */}        {/* Activity Log */}
        {log.length > 0 && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>On-Chain Activity Log</div>
              {logBlobId && (
                <a href={`${AGGREGATOR}/v1/blobs/${logBlobId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#00d4aa', textDecoration:'none', fontFamily:'Space Mono,monospace' }}>
                  View on Walrus ↗
                </a>
              )}
              {saving && <span style={{ fontSize:11, color:'rgba(245,245,247,0.4)', fontFamily:'Space Mono,monospace' }}>Saving...</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {log.slice(0, 10).map(action => (
                <div key={action.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'rgba(0,0,0,0.2)', borderRadius:10, borderLeft:`3px solid ${action.status==='success'?'#00d4aa':action.status==='blocked'?'#f59e0b':'#f87171'}` }}>
                  <span style={{
                    width:20, height:20, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: action.status==='success' ? 'rgba(0,212,170,0.15)' : action.status==='blocked' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${action.status==='success' ? 'rgba(0,212,170,0.35)' : action.status==='blocked' ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'}`,
                  }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background: action.status==='success' ? '#00d4aa' : action.status==='blocked' ? '#f59e0b' : '#f87171' }}/>
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

        {/* Withdraw funds from agent wallet */}
      {agentAddr && derived && (
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px', marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>Withdraw from Agent Wallet</div>
          <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginBottom:14, lineHeight:1.6 }}>
            Transfer all SUI from the agent wallet back to your main wallet. Use this to collect earnings after NFT sales or to reclaim unused gas.
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || !policy.active}
            style={{ width:'100%', padding:'11px', borderRadius:10, background: withdrawing ? 'rgba(0,212,170,0.2)' : 'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.3)', color:'#00d4aa', fontSize:13, fontWeight:700, cursor: withdrawing ? 'not-allowed' : 'pointer' }}
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw All SUI to My Wallet'}
          </button>
          {withdrawMsg && (
            <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background: withdrawMsg.startsWith('Withdrawn') ? 'rgba(0,212,170,0.08)' : 'rgba(239,68,68,0.08)', border:`1px solid ${withdrawMsg.startsWith('Withdrawn') ? 'rgba(0,212,170,0.25)' : 'rgba(239,68,68,0.2)'}`, fontSize:12, color:'rgba(245,245,247,0.7)', lineHeight:1.5, fontFamily:'Space Mono,monospace' }}>
              {withdrawMsg}
            </div>
          )}
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
