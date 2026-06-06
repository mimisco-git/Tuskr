/**
 * NFTImage — routes ALL images through our proxy first.
 * Solves: 403, CORS, hotlink protection, ERR_NAME_NOT_RESOLVED
 * Falls back to gradient placeholder with collection initials.
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

function Fallback({ alt, className, style }: { alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ background: gradient(alt), display: 'flex',
      alignItems: 'center', justifyContent: 'center', ...style }}>
      <span style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 800,
        color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em',
        textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        {(alt || '?').slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

export default function NFTImage({ src, alt, className, style }: Props) {
  const resolved = resolveMediaUrl(src)   // filter bad URLs
  const proxyUrl = resolved ? `/api/img?url=${encodeURIComponent(resolved)}` : ''
  const [failed,  setFailed]  = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  if (!proxyUrl || failed) {
    return <Fallback alt={alt} className={className} style={style}/>
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {/* Gradient shows while image loads */}
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0,
          background: gradient(alt), display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
          <span style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 800,
            color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.02em' }}>
            {(alt || '?').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      <img
        src={proxyUrl}
        alt={alt}
        onLoad={()  => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          opacity: loaded ? 1 : 0, transition: 'opacity 0.3s',
          position: 'relative', zIndex: 1,
        }}
      />
    </div>
  )
}
