import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSuiClient } from '@mysten/dapp-kit'
import NFTCard, { NFT } from '../components/NFTCard'
import usePageTitle from '../hooks/usePageTitle'
import s from './Home.module.css'

// Featured NFTs loaded from real chain listings below

const FEATURES = [
  { tab:'Permanent', icon:'permanent', tag:'WALRUS BLOB', title:'Always\npermanent.',
    color:'#00d4aa',
    desc:'Your NFT media is stored as a certified, erasure-coded blob on Walrus. Not IPFS, not a server. A blob that outlasts any single node.',
    points:['On-chain blob certification for every file','Erasure-coded across hundreds of nodes','Media survives as long as Walrus runs'] },
  { tab:'Provable', icon:'provable', tag:'SUI MOVE', title:'Always\nprovable.',
    color:'#60a5fa',
    desc:'Every NFT is a Move object on Sui. Ownership enforced at the protocol level, not in a database. The chain is the only truth.',
    points:['Move objects with formal ownership semantics','Royalties enforced on-chain at every sale','Full provenance from mint to current holder'] },
  { tab:'Programmable', icon:'programmable', tag:'SUI PTB', title:'Always\nprogrammable.',
    color:'#a78bfa',
    desc:'Sui Programmable Transaction Blocks let you buy dozens of NFTs atomically. All succeed or all revert. One signature, one fee.',
    points:['Bulk-buy up to 20 NFTs in one transaction','Atomic: never a partial purchase','Gas-efficient batch operations'] },
  { tab:'Private', icon:'private', tag:'WALRUS SEAL', title:'Private\nby design.',
    color:'#f59e0b',
    desc:'Walrus Seal threshold encryption ensures only the verified NFT holder can decrypt the full file. Preview is public; the original is yours.',
    points:['AES-256-GCM keyed to NFT ownership','Threshold decryption via Seal nodes','First marketplace with native content gating'] },
]

const PARTNERS = [
  'Bluefin','Cetus DEX','Baselight','Talus Network',
  'Everlyn','Cudis','Sui Foundation','Mysten Labs',
  'Walrus Protocol','DeepSurge','Move Language','Slushie Wallet',
]

const STARS = [
  { left:'9%',  top:'14%', w:3, dur:5,   del:0,   op:0.7 },
  { left:'13%', top:'28%', w:2, dur:7,   del:2.4, op:0.5 },
  { left:'4%',  top:'45%', w:4, dur:4.5, del:1.1, op:0.6 },
  { left:'22%', top:'18%', w:7, dur:6,   del:3.6, op:0.4 },
  { left:'35%', top:'8%',  w:2, dur:4,   del:0.5, op:0.8 },
  { left:'68%', top:'22%', w:5, dur:5.5, del:0.8, op:0.6 },
  { left:'88%', top:'30%', w:7, dur:7.5, del:3,   op:0.4 },
  { left:'94%', top:'12%', w:2, dur:4.5, del:1.2, op:0.9 },
  { left:'82%', top:'45%', w:4, dur:5,   del:3.8, op:0.5 },
  { left:'55%', top:'35%', w:3, dur:6,   del:0.6, op:0.6 },
  { left:'60%', top:'8%',  w:2, dur:3.5, del:1.5, op:0.8 },
]

function Arrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 9 9" fill="none" aria-hidden>
      <path d="M9 0H0V1H9V0Z" fill="currentColor"/>
      <path d="M8.3 0L0 8.3L0.7 9L9 0.7L8.3 0Z" fill="currentColor"/>
      <path d="M9 0H8V9H9V0Z" fill="currentColor"/>
    </svg>
  )
}

/* Use case SVG icons */
function UCIcon({ type, color }: { type: string; color: string }) {
  const p = { width:48, height:48, viewBox:"0 0 24 24", fill:"none", stroke:color, strokeWidth:1.5, strokeLinecap:"round" as const, strokeLinejoin:"round" as const }
  if (type === 'trade') return (
    <svg {...p}>
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4"/>
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M9 10V6.5a2.5 2.5 0 0 1 5 0V10" strokeWidth={1.3}/>
    </svg>
  )
  if (type === 'create') return (
    <svg {...p}>
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      <circle cx="7" cy="7" r="3" strokeWidth={1.3}/>
    </svg>
  )
  if (type === 'encrypt') return (
    <svg {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <path d="M12 15v2" strokeWidth={2}/>
    </svg>
  )
  return null
}

/* Premium SVG icons for each feature */
function FeatureIcon({ type, size=52, color='#00d4aa' }: { type:string; size?:number; color?:string }) {
  const s = { width:size, height:size, strokeWidth:1.5, fill:'none', stroke:color, strokeLinecap:'round' as const, strokeLinejoin:'round' as const }
  if (type === 'permanent') return (
    <svg viewBox="0 0 24 24" {...s}>
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
      <path d="M12 8v6M9 11l3 3 3-3" strokeWidth={1.4}/>
    </svg>
  )
  if (type === 'provable') return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
      <polyline points="9,12 11,14 15,10" strokeWidth={1.8}/>
    </svg>
  )
  if (type === 'programmable') return (
    <svg viewBox="0 0 24 24" {...s}>
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" strokeWidth={1.4}/>
    </svg>
  )
  if (type === 'private') return (
    <svg viewBox="0 0 24 24" {...s}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <circle cx="12" cy="16" r="1.5" fill={color} stroke="none"/>
    </svg>
  )
  return null
}

/* Small icon for side cards */
function FeatureIconSmall({ type, color }: { type:string; color:string }) {
  return <FeatureIcon type={type} size={28} color={color}/>
}

export default function Home() {
  usePageTitle()
  const [activeFeat, setActiveFeat] = useState(0)
  const [featured, setFeatured] = useState<NFT[]>([])
  const client = useSuiClient()
  const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'
  const [counter, setCounter] = useState({ nfts:0, vol:0, creators:0 })
  const feat = FEATURES[activeFeat]
  const allPartners = [...PARTNERS, ...PARTNERS]

  useEffect(() => {
    // Fetch real recent listings for featured section
    client.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::ListedEvent` },
      limit: 4,
    }).then(async (events) => {
      const items: NFT[] = []
      for (const e of events.data.slice(0,4)) {
        try {
          const p = (e as any).parsedJson ?? {}
          const nftObj = await client.getObject({
            id: p.nft_id,
            options: { showContent:true, showDisplay:true },
          })
          const f = (nftObj.data?.content as any)?.fields ?? {}
          const d = (nftObj.data?.display as any)?.data   ?? {}
          items.push({
            id:       p.listing_id || p.nft_id,
            name:     f.name || d.name || `NFT #${(p.nft_id||'').slice(2,8)}`,
            image:    f.media_url || d.image_url || '',
            price:    p.price ? (Number(p.price)/1e9).toFixed(2) : '0',
            currency: 'SUI',
            creator:  (f.creator||p.seller||'').slice(0,10)+'…',
            listed:   true,
            blobId:   f.blob_id || '',
          })
        } catch {}
      }
      if (items.length > 0) setFeatured(items)
    }).catch(() => {})
  }, [client])

  useEffect(() => {
    const targets = { nfts:2841, vol:14200, creators:390 }
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
    <main style={{ background:'#000', overflow:'hidden' }}>

      {/* ═══ HERO ═══ */}
      <section className={s.hero}>
        <div className={s.aurora}>
          <div className={s.aGlow}/><div className={s.aPurple}/>
          <div className={s.aTealRight}/><div className={s.aDark}/>
        </div>
        <div className={s.stars}>
          {STARS.map((st, i) => (
            <div key={i} className={s.star} style={{
              left:st.left, top:st.top, width:st.w, height:st.w,
              filter:`blur(${Math.max(0.5,st.w*0.4)}px)`,
              '--d':`${st.dur}s`,'--del':`${st.del}s`,'--op':st.op,
            } as React.CSSProperties}/>
          ))}
        </div>

        <div className={s.heroText}>
          <h1 className={s.heroTitle}>NFTs for data<br/>that matters.</h1>
          <p className={s.heroDesc}>
            The first marketplace where every NFT is <strong>provable</strong>,{' '}
            <strong>permanent</strong>, and <strong>always yours</strong>,
            without compromising speed.
          </p>
          <div className={s.heroCta}>
            <Link to="/marketplace" className={`btn btn-outline btn-lg ${s.ctaBtn}`}>
              Start collecting <Arrow/>
            </Link>
            <Link to="/mint" className="btn btn-ghost btn-lg">Mint an NFT</Link>
          </div>
        </div>

        {/* Mascot — blends into aurora, no box */}
        <div className={s.mascotWrap}>
          <img src="/mascot-stand.png" alt="Tuskr mascot" className={s.mascot} draggable={false}/>
        </div>
      </section>

      {/* ═══ NO FAKE STORAGE ═══ */}
      <section className={s.noDowntime}>
        <div className={s.ndInner}>
          <div className={s.ndPre}>Your NFT Marketplace</div>
          <h2 className={s.ndTitle}>No fake storage.<br/>No broken links.<br/>No limits.</h2>
          <p className={s.ndDesc}>For too long, NFT media has lived on servers that vanish.
            <strong> Tuskr fixes that.</strong> Every file on Walrus. Every NFT on Sui.</p>
          <Link to="/marketplace" className={`btn btn-outline btn-lg ${s.ctaBtn}`}>
            Explore marketplace <Arrow/>
          </Link>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <div className={s.statsBar}>
        <div className={s.statsGrid}>
          {([
            [counter.nfts.toLocaleString(),'NFTs Minted'],
            [`${(counter.vol/1000).toFixed(1)}K`,'SUI Volume'],
            [`${counter.creators}+`,'Creators'],
            ['100%','On Walrus'],
          ] as [string,string][]).map(([n,l]) => (
            <div key={l} className={s.statItem}>
              <div className={s.statNum}>{n}</div>
              <div className={s.statLabel}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ POWER TO THE COLLECTOR ═══ */}
      <section className={s.powerSection}>
        <div className="container">
          <h2 className={s.powerTitle}>Power to the<br/>collector.</h2>
          <div className={s.featureTabs}>
            {FEATURES.map((f,i) => (
              <button key={f.tab}
                className={`${s.featureTab} ${i===activeFeat?s.featureTabActive:''}`}
                style={i===activeFeat ? { background:f.color, color:'#000' } : {}}
                onClick={() => setActiveFeat(i)}>{f.tab}</button>
            ))}
          </div>
        </div>
        <div className={s.featureCarousel}>
          <div className={s.featureCardSide} onClick={() => setActiveFeat((activeFeat+3)%4)}>
            <div className={s.featureSideIcon}><FeatureIconSmall type={FEATURES[(activeFeat+3)%4].icon} color={FEATURES[(activeFeat+3)%4].color}/></div>
            <div className={s.featureSideTitle}>{FEATURES[(activeFeat+3)%4].tab}</div>
            <div className={s.featureSideDesc}>Click to view</div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeFeat} className={s.featureCardMain}
              initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
              exit={{opacity:0,y:-8}} transition={{duration:0.22}}>
              <div className={s.featureGlow} style={{ background: `radial-gradient(circle, ${feat.color}22 0%, transparent 65%)` }}/>
              <div className={s.featureIcon}><FeatureIcon type={feat.icon} size={52} color={feat.color}/></div>
              <div className={s.featureTag}><div className={s.featureTagDot} style={{ background:feat.color, boxShadow:`0 0 8px ${feat.color}` }}/>{feat.tag}</div>
              <h3 className={s.featureTitle} style={{whiteSpace:'pre-line'}}>{feat.title}</h3>
              <p className={s.featureDesc}>{feat.desc}</p>
              <div className={s.featurePoints}>
                {feat.points.map(p => (
                  <div key={p} className={s.featurePoint}><div className={s.fpDot}/><span>{p}</span></div>
                ))}
              </div>
              <Link to="/marketplace" className="btn btn-ghost btn-sm" style={{width:'fit-content'}}>See it in action →</Link>
            </motion.div>
          </AnimatePresence>
          <div className={s.featureCardSide} onClick={() => setActiveFeat((activeFeat+1)%4)}>
            <div className={s.featureSideIcon}><FeatureIconSmall type={FEATURES[(activeFeat+1)%4].icon} color={FEATURES[(activeFeat+1)%4].color}/></div>
            <div className={s.featureSideTitle}>{FEATURES[(activeFeat+1)%4].tab}</div>
            <div className={s.featureSideDesc}>Click to view</div>
          </div>
        </div>
        <div className={s.powerCta}>
          <Link to="/marketplace" className={`btn btn-outline btn-lg ${s.ctaBtn}`}>Explore marketplace <Arrow/></Link>
        </div>
      </section>

      {/* ═══ PARTNER MARQUEE ═══ */}
      <section className={s.partnerSection}>
        <p className={s.partnerPre}>Ecosystem Partners</p>
        <div className={s.marqueeOuter}>
          <div className={s.marqueeTrack}>
            {allPartners.map((name,i) => (
              <div key={i} className={s.partnerPill}>
                <span className={s.partnerName}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section className={s.usecaseSection}>
        <div className={s.usecaseHead}>
          <div className={s.usecasePre}>What you can do</div>
          <h2 className={s.usecaseTitle}>Built for<br/>what's next.</h2>
        </div>
        <div className={s.usecaseCarousel}>
          {[
            { icon:'trade',   color:'#00d4aa', pre:'Trade',  title:'NFTs at scale.',        desc:'Bulk-buy dozens of NFTs in one PTB. Move-enforced royalties on every transfer. Earn XP for every trade.', tags:['SUI PTB','WALRUS BLOB','MOVE'],        to:'/marketplace' },
            { icon:'create',  color:'#a78bfa', pre:'Create', title:'AI-powered minting.',    desc:'Groq AI generates the concept. You upload the art. Minted on Sui, stored permanently on Walrus. Earn XP for every mint.', tags:['GROQ AI','WALRUS BLOB','SUI MINT'], to:'/mint/ai' },
            { icon:'encrypt', color:'#f59e0b', pre:'Gate',   title:'Encrypted content.',     desc:'Lock full-resolution files behind Walrus Seal. Only verified NFT holders can decrypt. Preview is public; the original is yours.', tags:['SEAL','AES-256','THRESHOLD'], to:'/mint' },
          ].map((u,i) => (
            <div key={i} className={s.ucCard} style={{ '--uc-color': u.color } as React.CSSProperties}>
              <div className={s.ucIcon}><UCIcon type={u.icon} color={u.color}/></div>
              <div className={s.ucPre}>{u.pre}</div>
              <div className={s.ucTitle}>{u.title}</div>
              <p className={s.ucDesc}>{u.desc}</p>
              <div className={s.ucTags}>{u.tags.map(t => <span key={t} className={s.ucTag}>{t}</span>)}</div>
              <Link to={u.to} className={s.ucLink} onClick={e => e.stopPropagation()}>Get started →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURED NFTS ═══ */}
      <section className={s.nftSection}>
        <div className="container">
          <div className={s.secHead}>
            <div><p className={s.secPre}>On the block</p><h2 className={s.secTitle}>Featured NFTs</h2></div>
            <Link to="/marketplace" className="btn btn-ghost">View all →</Link>
          </div>
          <div className={s.nftGrid}>
            {featured.length > 0
              ? featured.map((nft,i) => <NFTCard key={nft.id} nft={nft} delay={i*0.07}/>)
              : Array.from({length:4}).map((_,i) => (
                  <div key={i} className="skeleton" style={{aspectRatio:'1',borderRadius:20}}/>
                ))
            }
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className={s.ctaSection}>
        <div className={s.ctaCard}>
          <div className={s.ctaGlow}/>
          <h2 className={s.ctaTitle}>Your media.<br/>Forever on Walrus.</h2>
          <p className={s.ctaSub}>No middlemen. No centralized servers. Your NFT, your ownership, secured by Sui.</p>
          <div className={s.ctaButtons}>
            <Link to="/mint" className="btn btn-primary btn-lg">Start minting</Link>
            <Link to="/mint/ai" className="btn btn-ghost btn-lg">✦ AI Generator</Link>
            <Link to="/leaderboard" className="btn btn-ghost btn-lg">🏆 Leaderboard</Link>
          </div>
        </div>
      </section>

    </main>
  )
}
