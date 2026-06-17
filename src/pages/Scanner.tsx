/**
 * NFT Media Health Scanner — /scanner
 * Paste any Sui NFT object ID. Tuskr checks storage type,
 * permanence score, and live accessibility.
 */
import { useState, useCallback } from 'react'
import { useSuiClient }          from '@mysten/dapp-kit'
import { Link }                  from 'react-router-dom'
import usePageTitle              from '../hooks/usePageTitle'

/* ── SVG icon kit ────────────────────────────────────────────────────────── */
const Icon = {
  Walrus: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 14c2-3 4-3 6 0s4 3 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 9c2-3 4-3 6 0s4 3 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".5"/>
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Warning: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="10" cy="14.5" r="1" fill="currentColor"/>
    </svg>
  ),
  XCircle: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Diamond: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2l8 8-8 8-8-8 8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 10h16" stroke="currentColor" strokeWidth="1" opacity=".4"/>
    </svg>
  ),
  Circle: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Embedded: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Link: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5a3.5 3.5 0 004.95 0l2-2a3.5 3.5 0 00-4.95-4.95l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9.5 6.5a3.5 3.5 0 00-4.95 0l-2 2a3.5 3.5 0 004.95 4.95l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

/* ── Storage classification ──────────────────────────────────────────────── */
type StorageClass = 'walrus'|'arweave'|'ipfs'|'centralized'|'embedded'|'unknown'
interface StorageInfo {
  class: StorageClass; label: string; score: number
  risk: 'none'|'low'|'medium'|'high'|'critical'
  description: string; color: string
  IconComp: React.FC
}

function classifyUrl(url: string): StorageInfo {
  if (!url || url === 'null' || url === 'undefined') return {
    class:'unknown', label:'No Media URL', score:0, risk:'critical', color:'#f87171', IconComp: Icon.XCircle,
    description:'This NFT has no media URL. The media may already be permanently lost.',
  }
  if (url.startsWith('data:')) return {
    class:'embedded', label:'Embedded Data', score:85, risk:'low', color:'#60a5fa', IconComp: Icon.Embedded,
    description:'Media is embedded as a data URI directly in the NFT metadata. Not at risk of link rot but not ideal for large files.',
  }
  if (url.includes('walrus-testnet.walrus.space')||url.includes('aggregator.walrus.space')||url.includes('wal.app')) return {
    class:'walrus', label:'Walrus — Permanently Stored', score:100, risk:'none', color:'#00d4aa', IconComp: Icon.Walrus,
    description:'Media is cryptographically committed to the Walrus decentralised network. The blob ID is written on-chain. This media cannot be deleted, censored, or lost. Verifiable by anyone, forever.',
  }
  if (url.includes('arweave.net')||url.startsWith('ar://')) return {
    class:'arweave', label:'Arweave', score:80, risk:'low', color:'#a78bfa', IconComp: Icon.Circle,
    description:'Stored on Arweave\'s permaweb with endowment-funded permanence. Good, but relies on Arweave\'s continued operation. No on-chain blob ID verification.',
  }
  if (url.includes('ipfs.io')||url.includes('nftstorage')||url.includes('pinata')||url.includes('cloudflare-ipfs')||url.startsWith('ipfs://')||url.includes('/ipfs/')) return {
    class:'ipfs', label:'IPFS — Pin at Risk', score:35, risk:'high', color:'#fb923c', IconComp: Icon.Warning,
    description:'IPFS content only persists while someone keeps paying for pins. Services shut down, subscriptions lapse, and developers move on. Over 60% of IPFS-pinned NFT media disappears within 3 years.',
  }
  return {
    class:'centralized', label:'Centralised Server — Critical', score:10, risk:'critical', color:'#f87171', IconComp: Icon.XCircle,
    description:'Media is hosted on a centralised server. When the company shuts down, the payment lapses, or the S3 bucket is misconfigured, this NFT\'s image is gone permanently. This has already happened to millions of NFTs.',
  }
}

/* ── Scan result type ────────────────────────────────────────────────────── */
interface ScanResult {
  objectId: string; name: string; description: string
  imageUrl: string; storage: StorageInfo
  accessible: boolean|null; blobId: string
  owner: string; scanTime: string
}

/* ── Score ring ──────────────────────────────────────────────────────────── */
const ScoreRing = ({ score, color }: { score:number; color:string }) => {
  const r = 38, circ = 2*Math.PI*r, dash = (score/100)*circ
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ filter:`drop-shadow(0 0 8px ${color}80)`, transition:'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }}/>
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="20" fontWeight="800" fontFamily="Arial" letterSpacing="-1">{score}</text>
    </svg>
  )
}

/* ── Scan beam animation ─────────────────────────────────────────────────── */
const ScanBeam = () => (
  <div style={{ position:'relative', height:3, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden', margin:'16px 0' }}>
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,#00d4aa,transparent)',
      animation:'beam 1.4s ease-in-out infinite' }}/>
  </div>
)

/* ── Phase messages ──────────────────────────────────────────────────────── */
const phases = [
  'Connecting to Sui RPC…',
  'Fetching NFT object data…',
  'Reading on-chain fields…',
  'Classifying storage type…',
  'Verifying media accessibility…',
  'Calculating permanence score…',
]

export default function Scanner() {
  usePageTitle('NFT Media Health Scanner | Tuskr')
  const client = useSuiClient()

  const [input,    setInput]   = useState('')
  const [scanning, setScanning]= useState(false)
  const [phaseIdx, setPhase]   = useState(0)
  const [result,   setResult]  = useState<ScanResult|null>(null)
  const [error,    setError]   = useState<string|null>(null)
  const [imgLoaded,setImgLoaded]=useState(false)

  const scan = useCallback(async () => {
    const id = input.trim()
    if (!id) return
    setScanning(true); setResult(null); setError(null)
    setPhase(0); setImgLoaded(false)

    // Cycle phase messages during scan
    const interval = setInterval(() => setPhase(p => (p+1) % phases.length), 600)

    try {
      const obj = await client.getObject({ id,
        options: { showContent:true, showDisplay:true, showOwner:true }
      })
      if (!obj.data) throw new Error('Object not found. Check the ID and try again.')

      const content = (obj.data.content as any)?.fields ?? {}
      const display = (obj.data.display as any)?.data  ?? {}
      const owner   = typeof obj.data.owner==='object' && 'AddressOwner' in (obj.data.owner as any)
        ? (obj.data.owner as any).AddressOwner : 'Shared'

      const name    = content.name        || display.name        || `NFT ${id.slice(0,8)}…`
      const desc    = content.description || display.description || ''
      const blobId  = content.blob_id     || ''
      const rawMedia= content.media_url   ?? content.image_url   ?? ''
      const imageUrl= display.image_url ||
        (typeof rawMedia==='string' ? rawMedia : rawMedia?.url ?? rawMedia?.fields?.url ?? '') ||
        (blobId ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}` : '')

      const storage = classifyUrl(imageUrl)

      let accessible: boolean|null = null
      if (imageUrl) {
        try {
          const walrusUrl = imageUrl.includes('walrus') ? imageUrl+'?mime=image/png' : imageUrl
          const r = await fetch(`/api/img?url=${encodeURIComponent(walrusUrl)}`,
            { method:'HEAD', signal:AbortSignal.timeout(8000) })
          accessible = r.ok
        } catch { accessible = false }
      }

      setResult({ objectId:id, name, description:desc, imageUrl,
        storage, accessible, blobId, owner, scanTime: new Date().toLocaleTimeString() })

    } catch(e:any) {
      setError(e?.message?.slice(0,180) || 'Scan failed. Check the object ID and try again.')
    } finally {
      clearInterval(interval)
      setScanning(false)
    }
  }, [input, client])

  const s = (bg: string, border: string): React.CSSProperties => ({
    background: bg, border:`1px solid ${border}`,
    borderRadius:18, padding:'22px 24px', marginBottom:14,
  })

  return (
    <main style={{ background:'#000', minHeight:'100vh', paddingTop:80, paddingBottom:120 }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign:'center', marginBottom:40, paddingTop:20 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:18,
            padding:'5px 16px', borderRadius:99,
            background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.22)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#f87171',
              boxShadow:'0 0 8px #f87171', animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:11, color:'#f87171', fontFamily:'Space Mono,monospace',
              fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
              40% of NFTs have broken media
            </span>
          </div>

          <h1 style={{ fontSize:'clamp(28px,5vw,46px)', fontWeight:900, color:'#fff',
            letterSpacing:'-0.04em', lineHeight:1.1, margin:'0 0 16px' }}>
            NFT Media{' '}
            <span style={{ color:'#00d4aa', textShadow:'0 0 40px rgba(0,212,170,0.35)' }}>
              Health Scanner
            </span>
          </h1>
          <p style={{ fontSize:16, color:'rgba(245,245,247,0.45)', lineHeight:1.7,
            maxWidth:500, margin:'0 auto' }}>
            Paste any Sui NFT object ID. We check if the media still exists,
            where it lives, and how permanent that storage truly is.
          </p>
        </div>

        {/* ── Input ── */}
        <div style={s('rgba(255,255,255,0.02)', scanning ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.07)')}>
          <div style={{ fontSize:10, color:'rgba(245,245,247,0.35)', fontFamily:'Space Mono,monospace',
            textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
            Sui NFT Object ID
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter' && scan()}
              placeholder="0x1a2b3c4d…  — paste any Sui NFT object ID"
              style={{ flex:1, background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.09)',
                borderRadius:12, padding:'13px 18px', color:'#fff', fontSize:14,
                fontFamily:'Space Mono,monospace', outline:'none',
                transition:'border-color 0.25s', boxSizing:'border-box',
              }}/>
            <button onClick={scan} disabled={scanning||!input.trim()} style={{
              padding:'0 22px', borderRadius:12, fontWeight:800, fontSize:14, border:'none',
              background: scanning ? 'rgba(0,212,170,0.15)' : 'linear-gradient(135deg,#00d4aa,#00b894)',
              color: scanning ? '#00d4aa' : '#000',
              cursor: scanning||!input.trim() ? 'not-allowed' : 'pointer',
              opacity: !input.trim()&&!scanning ? 0.45 : 1,
              minWidth:100, transition:'all 0.2s',
            }}>
              {scanning ? 'Scanning' : 'Scan NFT'}
            </button>
          </div>

          {scanning && (
            <>
              <ScanBeam />
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:14, height:14, borderRadius:'50%',
                  border:'2px solid rgba(0,212,170,0.3)', borderTopColor:'#00d4aa',
                  animation:'spin 0.7s linear infinite', flexShrink:0 }}/>
                <span style={{ fontSize:12, color:'rgba(0,212,170,0.8)',
                  fontFamily:'Space Mono,monospace', transition:'opacity 0.3s' }}>
                  {phases[phaseIdx]}
                </span>
              </div>
            </>
          )}

          {error && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10,
              background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
              fontSize:12, color:'#f87171', fontFamily:'Space Mono,monospace', lineHeight:1.6 }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Result ── */}
        {result && (() => {
          const st = result.storage
          const rgb = st.class==='walrus' ? '0,212,170'
            : st.class==='arweave' ? '167,139,250'
            : st.class==='ipfs' ? '251,146,60'
            : st.class==='embedded' ? '96,165,250'
            : '248,113,113'

          return (
            <div style={{ animation:'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

              {/* Health card */}
              <div style={{
                borderRadius:20, padding:'26px',
                background:`linear-gradient(160deg,rgba(${rgb},0.09) 0%,rgba(0,0,0,0.5) 100%)`,
                border:`1px solid rgba(${rgb},0.25)`,
                boxShadow:`0 0 80px rgba(${rgb},0.08)`,
                marginBottom:14,
              }}>
                <div style={{ display:'flex', gap:22, alignItems:'flex-start', flexWrap:'wrap' }}>

                  {/* Score */}
                  <div style={{ flexShrink:0, textAlign:'center' }}>
                    <ScoreRing score={st.score} color={st.color} />
                    <div style={{ fontSize:9, color:'rgba(245,245,247,0.35)',
                      fontFamily:'Space Mono,monospace', textTransform:'uppercase',
                      letterSpacing:'0.1em', marginTop:6 }}>Permanence</div>
                  </div>

                  {/* Details */}
                  <div style={{ flex:1, minWidth:220 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                      <span style={{ color:st.color }}>
                        <st.IconComp />
                      </span>
                      <span style={{ fontSize:14, fontWeight:800, color:st.color,
                        fontFamily:'Space Mono,monospace' }}>
                        {st.label}
                      </span>
                    </div>
                    <h2 style={{ fontSize:21, fontWeight:900, color:'#fff', margin:'0 0 8px',
                      letterSpacing:'-0.03em', lineHeight:1.2 }}>{result.name}</h2>
                    {result.description && (
                      <p style={{ fontSize:13, color:'rgba(245,245,247,0.4)', margin:'0 0 12px', lineHeight:1.6 }}>
                        {result.description.slice(0,120)}{result.description.length>120?'…':''}
                      </p>
                    )}
                    <p style={{ fontSize:13, color:'rgba(245,245,247,0.55)', lineHeight:1.65, margin:'0 0 16px' }}>
                      {st.description}
                    </p>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6,
                        padding:'5px 12px', borderRadius:99, fontSize:11,
                        fontFamily:'Space Mono,monospace', fontWeight:700,
                        background: result.accessible ? 'rgba(0,212,170,0.1)' : 'rgba(239,68,68,0.1)',
                        border:`1px solid ${result.accessible ? 'rgba(0,212,170,0.3)' : 'rgba(239,68,68,0.25)'}`,
                        color: result.accessible ? '#00d4aa' : '#f87171',
                      }}>
                        {result.accessible ? 'Media loading now' : 'Media not accessible'}
                      </span>
                      {result.blobId && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6,
                          padding:'5px 12px', borderRadius:99, fontSize:11,
                          fontFamily:'Space Mono,monospace', fontWeight:700,
                          background:'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.3)',
                          color:'#00d4aa' }}>
                          Walrus blob on-chain
                        </span>
                      )}
                    </div>
                  </div>

                  {/* NFT image */}
                  {result.imageUrl && (
                    <div style={{ flexShrink:0 }}>
                      <div style={{ width:88, height:88, borderRadius:12,
                        border:`1px solid rgba(${rgb},0.25)`,
                        background:'rgba(255,255,255,0.03)', overflow:'hidden', position:'relative' }}>
                        {!imgLoaded && (
                          <div style={{ position:'absolute', inset:0, display:'flex',
                            alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:20, height:20, borderRadius:'50%',
                              border:`2px solid rgba(${rgb},0.3)`,
                              borderTopColor:st.color, animation:'spin 0.8s linear infinite' }}/>
                          </div>
                        )}
                        <img
                          src={`/api/img?url=${encodeURIComponent(result.imageUrl.includes('walrus') ? result.imageUrl+'?mime=image/png' : result.imageUrl)}`}
                          alt={result.name}
                          onLoad={() => setImgLoaded(true)}
                          onError={e => {
                            const t = e.target as HTMLImageElement
                            if (!t.src.includes('/api/img')) return
                            t.src = result.imageUrl
                          }}
                          style={{ width:'100%', height:'100%', objectFit:'cover',
                            opacity: imgLoaded ? 1 : 0, transition:'opacity 0.4s' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={s('rgba(255,255,255,0.02)','rgba(255,255,255,0.07)')}>
                <div style={{ fontSize:10, color:'rgba(245,245,247,0.3)',
                  fontFamily:'Space Mono,monospace', textTransform:'uppercase',
                  letterSpacing:'0.1em', marginBottom:16 }}>On-chain data</div>
                {([
                  ['Object ID', result.objectId],
                  ['Owner',     result.owner],
                  ['Media URL', result.imageUrl||'—'],
                  ['Blob ID',   result.blobId||'— not on Walrus'],
                  ['Scanned',   result.scanTime],
                ] as [string,string][]).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', gap:16, padding:'10px 0',
                    borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:11, color:'rgba(245,245,247,0.3)',
                      fontFamily:'Space Mono,monospace', minWidth:90, flexShrink:0, paddingTop:1 }}>{k}</span>
                    <span style={{ fontSize:11, color:'rgba(245,245,247,0.6)',
                      fontFamily:'Space Mono,monospace', wordBreak:'break-all', lineHeight:1.6 }}>
                      {v.length>72 ? v.slice(0,72)+'…' : v}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {st.class !== 'walrus' ? (
                <div style={s('linear-gradient(160deg,rgba(0,212,170,0.07),rgba(0,0,0,0.4))',
                  'rgba(0,212,170,0.2)')}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:8 }}>
                    This NFT media is at risk of disappearing
                  </div>
                  <p style={{ fontSize:13, color:'rgba(245,245,247,0.5)', lineHeight:1.7, marginBottom:18, margin:'0 0 18px' }}>
                    Every NFT minted on Tuskr has its media stored permanently on Walrus.
                    The blob ID is written on-chain at mint time. Verifiable forever.
                  </p>
                  <Link to="/mint" style={{ display:'inline-flex', alignItems:'center', gap:8,
                    padding:'11px 22px', borderRadius:12,
                    background:'linear-gradient(135deg,#00d4aa,#00b894)',
                    color:'#000', fontSize:14, fontWeight:800, textDecoration:'none',
                    boxShadow:'0 8px 24px rgba(0,212,170,0.2)' }}>
                    Mint with permanent Walrus storage
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M8 3l5 5-5 5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>
              ) : (
                <div style={s('linear-gradient(160deg,rgba(0,212,170,0.07),rgba(0,0,0,0.4))',
                  'rgba(0,212,170,0.2)')}>
                  <div style={{ textAlign:'center', padding:'8px 0' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
                      <span style={{ color:'#00d4aa' }}><Icon.Walrus /></span>
                      <span style={{ fontSize:15, fontWeight:700, color:'#00d4aa' }}>
                        This NFT is permanently secured on Walrus
                      </span>
                    </div>
                    <p style={{ fontSize:13, color:'rgba(245,245,247,0.4)', lineHeight:1.6, margin:0 }}>
                      The blob ID is on-chain. This image will be here in 100 years.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── The problem stats ── */}
        {!result && !scanning && (
          <>
            <div style={s('rgba(255,255,255,0.02)','rgba(255,255,255,0.07)')}>
              <div style={{ fontSize:13, fontWeight:700, color:'rgba(245,245,247,0.7)', marginBottom:16 }}>
                Why this matters
              </div>
              {[
                { n:'40%+', t:'of NFTs minted in 2021 already have broken or inaccessible media', c:'#f87171' },
                { n:'60%+', t:'of IPFS-pinned NFT images disappear within 3 years when pins expire', c:'#fb923c' },
                { n:'$0',   t:'compensation to NFT holders when centralised servers go offline', c:'#fbbf24' },
                { n:'100%', t:'of Tuskr NFTs have media verified on Walrus — cryptographically permanent', c:'#00d4aa' },
              ].map(({n,t,c}) => (
                <div key={n} style={{ display:'flex', gap:18, padding:'12px 0',
                  borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center' }}>
                  <span style={{ fontSize:20, fontWeight:900, color:c, minWidth:56,
                    fontFamily:'Space Mono,monospace', letterSpacing:'-0.03em', flexShrink:0 }}>{n}</span>
                  <span style={{ fontSize:13, color:'rgba(245,245,247,0.5)', lineHeight:1.6 }}>{t}</span>
                </div>
              ))}
            </div>

            <div style={s('rgba(255,255,255,0.02)','rgba(255,255,255,0.07)')}>
              <div style={{ fontSize:13, fontWeight:700, color:'rgba(245,245,247,0.7)', marginBottom:14 }}>
                Storage types — ranked by permanence
              </div>
              {([
                [Icon.Walrus,   '#00d4aa', 100, 'Walrus',             'Blob ID on-chain. Cryptographically permanent. Verifiable forever.'],
                [Icon.Circle,   '#a78bfa',  80, 'Arweave',            'Endowment-funded permanence. Good, but not on-chain verified.'],
                [Icon.Warning,  '#fb923c',  35, 'IPFS',               'Pins expire. Over 60% disappear within 3 years.'],
                [Icon.XCircle,  '#f87171',  10, 'Centralised Server', 'Company closes or server goes down and the art is gone forever.'],
              ] as [React.FC, string, number, string, string][]).map(([Ic,col,sc,lab,desc]) => (
                <div key={lab} style={{ display:'flex', gap:14, padding:'12px 0',
                  borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center' }}>
                  <span style={{ color:col, flexShrink:0 }}><Ic /></span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(245,245,247,0.8)', marginBottom:2 }}>{lab}</div>
                    <div style={{ fontSize:12, color:'rgba(245,245,247,0.38)', lineHeight:1.5 }}>{desc}</div>
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div style={{ fontSize:17, fontWeight:900, color:col,
                      fontFamily:'Space Mono,monospace', letterSpacing:'-0.03em' }}>{sc}</div>
                    <div style={{ fontSize:8, color:'rgba(245,245,247,0.25)',
                      fontFamily:'Space Mono,monospace', textTransform:'uppercase' }}>score</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes beam    { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
      `}</style>
    </main>
  )
}
