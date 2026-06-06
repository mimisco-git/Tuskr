/**
 * NFTImage — uses TradePort's public CDN (img.tradeport.gg) to load images.
 * TradePort CDN handles: hotlink protection, CORS, IPFS, dead links.
 * Falls back to our proxy, then gradient placeholder.
 */
import { useState } from 'react'
import { resolveMediaUrl } from '../utils/media'

interface Props {
  src?:       string | null
  alt:        string
  className?: string
  style?:     React.CSSProperties
}

function gradient(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const pairs = [
    ['#00d4aa','#0099ff'], ['#8b5cf6','#00d4aa'], ['#0099ff','#8b5cf6'],
    ['#f59e0b','#ef4444'], ['#10b981','#3b82f6'], ['#a855f7','#3b82f6'],
    ['#06b6d4','#8b5cf6'], ['#00d4aa','#a855f7'],
  ]
  const [a, b] = pairs[Math.abs(h) % pairs.length]
  return `linear-gradient(${Math.abs(h >> 4) % 360}deg, ${a}, ${b})`
}

const STAGES = ['tradeport', 'ours', 'fail'] as const
type Stage = typeof STAGES[number]

export default function NFTImage({ src, alt, className, style }: Props) {
  const resolved = resolveMediaUrl(src)
  const [stage, setStage] = useState<Stage>(resolved ? 'tradeport' : 'fail')
  const [loaded, setLoaded] = useState(false)

  const initials = (alt || '?').slice(0, 2).toUpperCase()
  const bg       = gradient(alt || 'nft')

  const imgSrc = () => {
    if (stage === 'tradeport') {
      return `https://img.tradeport.gg?url=${encodeURIComponent(resolved)}&mime-type=image`
    }
    if (stage === 'ours') {
      return `/api/img?url=${encodeURIComponent(resolved)}`
    }
    return ''
  }

  const onError = () => {
    if (stage === 'tradeport') { setStage('ours');  return }
    if (stage === 'ours')      { setStage('fail');  return }
  }

  const Placeholder = (
    <div style={{ position: 'absolute', inset: 0, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
      <span style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 800,
        color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em',
        textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        {initials}
      </span>
    </div>
  )

  if (stage === 'fail') {
    return (
      <div className={className} style={{ background: bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', ...style }}>
        <span style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 800,
          color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          {initials}
        </span>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {!loaded && Placeholder}
      <img
        src={imgSrc()}
        alt={alt}
        onLoad={()  => setLoaded(true)}
        onError={onError}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease',
          position: 'relative', zIndex: 1,
        }}
      />
    </div>
  )
}
