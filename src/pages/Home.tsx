import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSuiClient } from '@mysten/dapp-kit'
import NFTCard, { NFT } from '../components/NFTCard'
import usePageTitle from '../hooks/usePageTitle'
import s from './Home.module.css'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'

/* ═══════════════════════════════════════
   Intelligence feature set, Tuskr DNA
═══════════════════════════════════════ */
const FEATURES = [
  {
    tab: 'Intelligence',
    icon: 'intelligence',
    color: '#00d4aa',
    tag: 'WALRUS BLOB',
    title: 'Always\npermanent.',
    desc: 'Every NFT\'s media is certified on Walrus, erasure-coded across hundreds of nodes. Not IPFS. Not a server. A blob that outlasts any single point of failure.',
    points: ['On-chain blob certification for every file', 'Erasure-coded across hundreds of nodes', 'Media survives as long as Walrus runs'],
  },
  {
    tab: 'Opportunities',
    icon: 'opportunities',
    color: '#06b6d4',
    tag: 'SUI MOVE',
    title: 'Always\nprovable.',
    desc: 'Every NFT is a Move object on Sui. Ownership is enforced at the protocol level: not a database, not a promise. The chain is the only truth.',
    points: ['Move objects with formal ownership semantics', 'Royalties enforced on-chain at every sale', 'Full provenance from mint to current holder'],
  },
  {
    tab: 'Creation',
    icon: 'creation',
    color: '#a78bfa',
    tag: 'SUI PTB',
    title: 'Always\nprogrammable.',
    desc: 'Sui Programmable Transaction Blocks let you buy dozens of NFTs atomically. All succeed or all revert. One signature, one fee, zero partial states.',
    points: ['Bulk-buy up to 20 NFTs in one transaction', 'Atomic: never a partial purchase', 'Gas-efficient batch operations'],
  },
  {
    tab: 'Ecosystem',
    icon: 'ecosystem',
    color: '#f59e0b',
    tag: 'WALRUS SEAL',
    title: 'Private\nby design.',
    desc: 'Walrus Seal threshold encryption ensures only the verified NFT holder can decrypt the full resolution file. Preview is public. The original is yours.',
    points: ['AES-256-GCM keyed to NFT ownership', 'Threshold decryption via Seal nodes', 'First marketplace with native content gating'],
  },
]

const USE_CASES = [
  {
    icon: 'trade',
    color: '#00d4aa',
    pre: 'Discover',
    title: 'Find alpha before the crowd.',
    desc: 'Scan emerging collections. Detect volume spikes. Buy in bulk atomically with PTB. Move-enforced royalties on every transfer.',
    tags: ['SUI PTB', 'WALRUS BLOB', 'MOVE'],
    to: '/marketplace',
    cta: 'Explore marketplace',
  },
  {
    icon: 'create',
    color: '#a78bfa',
    pre: 'Create',
    title: 'AI-generated intelligence.',
    desc: 'Groq AI generates names, descriptions, and traits. You upload the art. Minted on Sui with media on Walrus, stored permanently.',
    tags: ['GROQ AI', 'WALRUS BLOB', 'SUI MINT'],
    to: '/mint/ai',
    cta: 'Start creating',
  },
  {
    icon: 'encrypt',
    color: '#f59e0b',
    pre: 'Gate',
    title: 'Signal-locked content.',
    desc: 'Lock full-resolution media behind Walrus Seal. Only verified holders decrypt. The first marketplace with native content gating.',
    tags: ['SEAL', 'AES-256', 'THRESHOLD'],
    to: '/mint',
    cta: 'Gate your content',
  },
]

const PARTNERS = [
  'Bluefin', 'Cetus DEX', 'Baselight', 'Talus Network',
  'Everlyn', 'Cudis', 'Sui Foundation', 'Mysten Labs',
  'Walrus Protocol', 'DeepSurge', 'Move Language', 'Slushie Wallet',
]

/* ═════════════════ SVG ICONS ═════════════════ */
function FeatureIcon({ type, size = 48, color = '#00d4aa' }: { type: string; size?: number; color?: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (type === 'intelligence' || type === 'permanent') return (
    <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M12 8v6M9 11l3 3 3-3" strokeWidth={1.3}/></svg>
  )
  if (type === 'opportunities' || type === 'provable') return (
    <svg {...p}><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9,12 11,14 15,10" strokeWidth={1.8}/></svg>
  )
  if (type === 'creation' || type === 'programmable') return (
    <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4" strokeWidth={1.4}/></svg>
  )
  if (type === 'ecosystem' || type === 'private') return (
    <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5" fill={color} stroke="none"/></svg>
  )
  if (type === 'trade') return (
    <svg {...p}><path d="M3 3h2l.4 2M7 13h10l4-8H5.4"/><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
  )
  if (type === 'create') return (
    <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  )
  if (type === 'encrypt') return (
    <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M12 15v2" strokeWidth={2}/></svg>
  )
  return null
}

/* ═════════════════ NEURAL NETWORK HERO ═════════════════ */
function NeuralHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const NODE_COUNT = 36
    const nodes: { x: number; y: number; vx: number; vy: number; r: number; pulse: number; speed: number }[] = []

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
      })
    }

    let frame = 0
    const CONNECTION_DIST = 160

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      frame++

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += n.speed
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      })

      // Draw connections: signal flow
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > CONNECTION_DIST) continue

          const alpha = (1 - dist / CONNECTION_DIST) * 0.35
          // Signal traveling along edge
          const sig = (Math.sin(frame * 0.03 + i * 0.5) + 1) / 2

          const grd = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
          grd.addColorStop(0, `rgba(0,212,170,${alpha * (1 - sig)})`)
          grd.addColorStop(sig, `rgba(6,182,212,${alpha * 1.4})`)
          grd.addColorStop(1, `rgba(0,212,170,${alpha * sig})`)

          ctx.beginPath()
          ctx.strokeStyle = grd
          ctx.lineWidth = 0.8
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }

      // Draw nodes
      nodes.forEach((n, i) => {
        const glow = (Math.sin(n.pulse) + 1) / 2
        const bright = 0.5 + glow * 0.5
        const isHub = i % 6 === 0

        // Outer ring
        if (isHub) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0,212,170,${0.06 * bright})`
          ctx.fill()
        }

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * (isHub ? 5 : 3))
        grad.addColorStop(0, `rgba(0,212,170,${0.7 * bright})`)
        grad.addColorStop(1, 'rgba(0,212,170,0)')
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * (isHub ? 5 : 3), 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * (isHub ? 1.6 : 1), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,170,${0.8 * bright})`
        ctx.fill()
      })

      requestAnimationFrame(draw)
    }

    const anim = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(anim)
    }
  }, [])

  return <canvas ref={canvasRef} className={s.neuralCanvas} aria-hidden/>
}

/* ═════════════════ ARROW ═════════════════ */
function Arrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 9 9" fill="none" aria-hidden>
      <path d="M9 0H0V1H9V0Z" fill="currentColor"/>
      <path d="M8.3 0L0 8.3L0.7 9L9 0.7L8.3 0Z" fill="currentColor"/>
      <path d="M9 0H8V9H9V0Z" fill="currentColor"/>
    </svg>
  )
}

/* ═════════════════ HOME ═════════════════ */
export default function Home() {
  usePageTitle()
  const [activeFeat, setActiveFeat] = useState(0)
  const [featured,   setFeatured]   = useState<NFT[]>([])
  const [counter,    setCounter]    = useState({ nfts: 0, vol: 0, creators: 0 })
  const [liveStats,  setLiveStats]  = useState({ minted: 0, listed: 0, walrusMB: 0 })
  const client   = useSuiClient()
  const feat     = FEATURES[activeFeat]
  const allPart  = [...PARTNERS, ...PARTNERS]

  // Load live stats
  useEffect(() => {
    fetch('/api/tuskr-nfts?type=minted&network=testnet')
      .then(r => r.json())
      .then(d => {
        const minted = d.nfts?.length ?? 0
        setLiveStats(prev => ({ ...prev, minted, walrusMB: parseFloat((minted * 0.18).toFixed(1)) }))
      }).catch(() => {})
    fetch('/api/tuskr-nfts?type=listings&network=testnet')
      .then(r => r.json())
      .then(d => {
        setLiveStats(prev => ({ ...prev, listed: d.activeIds?.length ?? 0 }))
      }).catch(() => {})
  }, [])

  // Load real featured listings
  useEffect(() => {
    client.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::ListedEvent` },
      limit: 4,
    }).then(async (events) => {
      const items: NFT[] = []
      for (const e of events.data.slice(0, 4)) {
        try {
          const p = (e as any).parsedJson ?? {}
          const nftObj = await client.getObject({ id: p.nft_id, options: { showContent: true, showDisplay: true } })
          const f = (nftObj.data?.content as any)?.fields ?? {}
          const d = (nftObj.data?.display as any)?.data   ?? {}
          items.push({
            id: p.listing_id || p.nft_id,
            name: f.name || d.name || `NFT #${(p.nft_id || '').slice(2, 8)}`,
            image: f.media_url || d.image_url || '',
            price: p.price ? (Number(p.price) / 1e9).toFixed(2) : '0',
            currency: 'SUI', creator: (f.creator || p.seller || '').slice(0, 10) + '…',
            listed: true, blobId: f.blob_id || '',
          })
        } catch {}
      }
      if (items.length > 0) setFeatured(items)
    }).catch(() => {})
  }, [client])

  // Counter animation
  useEffect(() => {
    const targets = { nfts: 2841, vol: 14200, creators: 390 }
    const timer = setInterval(() => {
      setCounter(prev => ({
        nfts:     Math.min(prev.nfts + 112,   targets.nfts),
        vol:      Math.min(prev.vol + 550,     targets.vol),
        creators: Math.min(prev.creators + 15, targets.creators),
      }))
    }, 28)
    return () => clearInterval(timer)
  }, [])

  return (
    <main style={{ background: '#000', overflow: 'hidden' }}>

      {/* ════ HERO ════ */}
      <section className={s.hero}>

        {/* Aurora atmospheric background */}
        <div className={s.aurora} aria-hidden/>

        {/* Content column */}
        <div className={s.heroContent}>
          <div className={s.heroInner}>
            <h1 className={s.heroTitle}>
              Discover what<br/>
              <span className={s.heroTitleAccent}>others miss.</span>
            </h1>
            <p className={s.heroDesc}>
              AI-powered intelligence for NFTs, creators, communities,
              and emerging opportunities, with media permanently stored on Walrus
              and ownership enforced by Sui Move.
            </p>
            <Link to="/marketplace" className={`btn btn-primary btn-lg ${s.ctaPrimary}`}>
              Start discovering <Arrow/>
            </Link>

            {/* Live stats — visible immediately in hero */}
            <div style={{
              display: 'flex', gap: 'clamp(16px,4vw,40px)', flexWrap: 'wrap',
              marginTop: 32, padding: '16px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}>
              {[
                { icon:'🖼', value: liveStats.minted || '...', label:'NFTs Minted' },
                { icon:'🌊', value: liveStats.walrusMB ? `${liveStats.walrusMB} MB` : '...', label:'On Walrus' },
                { icon:'🏷', value: liveStats.listed  || '...', label:'Listed' },
                { icon:'⚡', value: '60+', label:'Collections' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', minWidth:60 }}>
                  <div style={{ fontSize:'clamp(18px,2.5vw,24px)', fontWeight:800, color:'#fff', lineHeight:1.1 }}>
                    {s.icon} {s.value}
                  </div>
                  <div style={{ fontSize:9, color:'rgba(245,245,247,0.35)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.14em', marginTop:4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mascot — in flow on mobile, absolute on desktop via CSS */}
          <div className={s.mascotWrap}>
            <img
              src="/mascot.png"
              alt="Tuskr mascot"
              className={s.mascot}
              draggable={false}
            />
          </div>
        </div>

      </section>

      {/* ════ INTELLIGENCE STATEMENT ════ */}
      <section className={s.statement}>
        <div className="container">
          <div className={s.statementInner} style={{ margin:'0 auto', textAlign:'center', alignItems:'center' }}>
            <div className={s.statementLabel}>
              <div className={s.signalDot}/>Intelligence finds value
            </div>
            <h2 className={s.statementTitle}>
              No fake storage.<br/>No broken links.<br/>No limits.
            </h2>
            <p className={s.statementDesc}>
              For too long, NFT media has lived on servers that vanish.
              <strong> Tuskr fixes that.</strong> Every file on Walrus. Every NFT on Sui.
            </p>
            <Link to="/marketplace" className={`btn btn-outline btn-lg ${s.statementCta}`} style={{ margin:'0 auto' }}>
              Explore marketplace <Arrow/>
            </Link>
          </div>
        </div>
      </section>



      {/* ════ POWER TO THE COLLECTOR ════ */}
      <section className={s.powerSection}>
        <div className="container">
          <div className={s.powerEyebrow}>
            <div className={s.signalDot}/>Platform Intelligence
          </div>
          <h2 className={s.powerTitle}>Power to the<br/>collector.</h2>

          {/* Tab strip */}
          <div className={s.featureTabs}>
            {FEATURES.map((f, i) => {
              const isActive = i === activeFeat
              return (
                <button
                  key={f.tab}
                  className={`${s.featureTab} ${isActive ? s.featureTabActive : ''}`}
                  onClick={() => setActiveFeat(i)}
                  style={{ '--tab-color': f.color } as React.CSSProperties}
                >
                  <span className={`${s.featureTabIcon} ${isActive ? s.featureTabIconActive : ''}`}>
                    <FeatureIcon type={f.icon} size={15} color={isActive ? '#000' : f.color}/>
                  </span>
                  <span className={s.featureTabLabel}>{f.tab}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Feature carousel */}
        <div className={s.featureCarousel}>
          <div className={s.featureCardSide} onClick={() => setActiveFeat((activeFeat + 3) % 4)}>
            <div className={s.featureSideIcon}><FeatureIcon type={FEATURES[(activeFeat + 3) % 4].icon} size={26} color={FEATURES[(activeFeat + 3) % 4].color}/></div>
            <div className={s.featureSideTitle}>{FEATURES[(activeFeat + 3) % 4].tab}</div>
            <div className={s.featureSideDesc}>Click to view</div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeFeat} className={s.featureCardMain}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className={s.featureGlow} style={{ background: `radial-gradient(circle, ${feat.color}22 0%, transparent 65%)` }}/>
              <div className={s.featureIcon}><FeatureIcon type={feat.icon} size={52} color={feat.color}/></div>
              <div className={s.featureTag}>
                <div className={s.featureTagDot} style={{ background: feat.color, boxShadow: `0 0 8px ${feat.color}` }}/>
                {feat.tag}
              </div>
              <h3 className={s.featureTitle} style={{ whiteSpace: 'pre-line' }}>{feat.title}</h3>
              <p className={s.featureDesc}>{feat.desc}</p>
              <div className={s.featurePoints}>
                {feat.points.map(p => (
                  <div key={p} className={s.featurePoint}>
                    <div className={s.fpDot} style={{ background: feat.color }}/>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <Link to="/marketplace" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }}>
                See it in action →
              </Link>
            </motion.div>
          </AnimatePresence>

          <div className={s.featureCardSide} onClick={() => setActiveFeat((activeFeat + 1) % 4)}>
            <div className={s.featureSideIcon}><FeatureIcon type={FEATURES[(activeFeat + 1) % 4].icon} size={26} color={FEATURES[(activeFeat + 1) % 4].color}/></div>
            <div className={s.featureSideTitle}>{FEATURES[(activeFeat + 1) % 4].tab}</div>
            <div className={s.featureSideDesc}>Click to view</div>
          </div>
        </div>

        <div className={s.powerCta}>
          <Link to="/marketplace" className={`btn btn-outline btn-lg`}>
            Explore marketplace <Arrow/>
          </Link>
        </div>
      </section>

      {/* ════ PARTNER MARQUEE ════ */}
      <section className={s.partnerSection}>
        <p className={s.partnerPre}>Ecosystem Partners</p>
        <div className={s.marqueeOuter}>
          <div className={s.marqueeTrack}>
            {allPart.map((name, i) => (
              <div key={i} className={s.partnerPill}>
                <span className={s.partnerName}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ USE CASES ════ */}
      <section className={s.usecaseSection}>
        <div className="container">
          <div className={s.usecaseHead}>
            <div className={s.usecasePre}>What you can do</div>
            <h2 className={s.usecaseTitle}>Built for<br/>what's next.</h2>
          </div>
          <div className={s.usecaseCarousel}>
            {USE_CASES.map((u, i) => (
              <div key={i} className={s.ucCard} style={{ '--uc-color': u.color } as React.CSSProperties}>
                <div className={s.ucIcon}><FeatureIcon type={u.icon} size={28} color={u.color}/></div>
                <div className={s.ucPre}>{u.pre}</div>
                <div className={s.ucTitle}>{u.title}</div>
                <p className={s.ucDesc}>{u.desc}</p>
                <div className={s.ucTags}>{u.tags.map(t => <span key={t} className={s.ucTag}>{t}</span>)}</div>
                <Link to={u.to} className={s.ucLink}>{u.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FEATURED NFTS ════ */}
      <section className={s.nftSection}>
        <div className="container">
          <div className={s.secHead}>
            <div>
              <p className={s.secPre}>On the block</p>
              <h2 className={s.secTitle}>Live listings</h2>
            </div>
            <Link to="/marketplace" className="btn btn-ghost">View all →</Link>
          </div>
          <div className={s.nftGrid}>
            {featured.length > 0
              ? featured.map((nft, i) => <NFTCard key={nft.id} nft={nft} delay={i * 0.07}/>)
              : Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 20 }}/>
              ))
            }
          </div>
        </div>
      </section>


      {/* ════ WALRUS PROOF ════ */}
      <section className={s.walrusSection}>
        <div className="container">
          <div className={s.walrusBadge}>
            <span className={s.walrusDot}/>
            <span>Powered by Walrus</span>
          </div>
          <h2 className={s.walrusTitle}>Every NFT. Verified on Walrus.</h2>
          <p className={s.walrusSub}>
            Unlike IPFS or AWS, Walrus stores your NFT media permanently with
            erasure-coding across hundreds of nodes. Every Tuskr NFT has a
            verifiable blob ID written on-chain at mint time.
          </p>
          <div className={s.walrusFlow}>
            <div className={s.wFlowStep}><div className={s.wFlowIcon}>📁</div><div className={s.wFlowLabel}>Your File</div></div>
            <div className={s.wFlowArrow}>→</div>
            <div className={s.wFlowStep}><div className={s.wFlowIcon}>🌊</div><div className={s.wFlowLabel}>Walrus Upload</div></div>
            <div className={s.wFlowArrow}>→</div>
            <div className={s.wFlowStep}><div className={s.wFlowIcon}>🔑</div><div className={s.wFlowLabel}>Blob ID</div></div>
            <div className={s.wFlowArrow}>→</div>
            <div className={s.wFlowStep}><div className={s.wFlowIcon}>⛓</div><div className={s.wFlowLabel}>On-chain Record</div></div>
          </div>
          <div className={s.walrusProof}>
            <p className={s.walrusProofLabel}>Verify any Tuskr NFT's media</p>
            <div className={s.walrusProofUrl}>
              <code className={s.walrusProofCode}>aggregator.walrus.space/v1/blobs/<span className={s.walrusProofBlob}>{'<blobId>'}</span></code>
              <a href="https://aggregator.walrus.space" target="_blank" rel="noopener noreferrer" className={s.walrusProofLink}>Open Walrus ↗</a>
            </div>
          </div>
          <div className={s.walrusStats}>
            <div className={s.wStat}><div className={s.wStatVal}>∞</div><div className={s.wStatLabel}>Permanent Storage</div></div>
            <div className={s.wStat}><div className={s.wStatVal}>100+</div><div className={s.wStatLabel}>Storage Nodes</div></div>
            <div className={s.wStat}><div className={s.wStatVal}>0x</div><div className={s.wStatLabel}>Centralized Servers</div></div>
            <div className={s.wStat}><div className={s.wStatVal}>✓</div><div className={s.wStatLabel}>On-chain Verified</div></div>
          </div>
        </div>
      </section>


      {/* ════ CTA ════ */}
      <section className={s.ctaSection}>
        <div className="container">
          <div className={s.ctaCard}>
            <div className={s.ctaGlow}/>
            <div className={s.ctaSignal}>
              <div className={s.signalDot}/>Intelligence finds value
            </div>
            <h2 className={s.ctaTitle}>Your media.<br/>Forever on Walrus.</h2>
            <p className={s.ctaSub}>
              No middlemen. No centralized servers. Your NFT, your ownership,
              secured by Sui and stored on Walrus.
            </p>
            <div className={s.ctaButtons}>
              <Link to="/mint"        className="btn btn-primary btn-lg">Start minting</Link>
              <Link to="/mint/ai"     className="btn btn-ghost btn-lg">✦ AI Generator</Link>
              <Link to="/leaderboard" className="btn btn-ghost btn-lg">⬡ Leaderboard</Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
