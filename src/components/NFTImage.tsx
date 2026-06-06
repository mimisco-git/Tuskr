/**
 * NFTImage — premium fallback when image is unavailable
 * Tries multiple IPFS gateways before showing the styled fallback
 */
import { useState } from 'react'
import { resolveMediaUrl, getNextGatewayUrl, proxyUrl } from '../utils/media'

interface NFTImageProps {
  src?:       string | null
  alt:        string
  className?: string
  style?:     React.CSSProperties
}

// Generate a consistent gradient from the name
function getGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    ['#00d4aa', '#0099ff'],
    ['#8b5cf6', '#00d4aa'],
    ['#0099ff', '#8b5cf6'],
    ['#f59e0b', '#ef4444'],
    ['#00d4aa', '#8b5cf6'],
    ['#3b82f6', '#06b6d4'],
    ['#a855f7', '#3b82f6'],
    ['#10b981', '#3b82f6'],
  ]
  const pair = colors[Math.abs(hash) % colors.length]
  const angle = (Math.abs(hash >> 4) % 360)
  return `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]})`
}

export function NFTImage({ src, alt, className, style }: NFTImageProps) {
  const resolved = resolveMediaUrl(src)
  const [stage,  setStage]  = useState<'direct'|'next'|'proxy'|'fail'>(resolved ? 'direct' : 'fail')
  const [url,    setUrl]    = useState(resolved)
  const [loaded, setLoaded] = useState(false)

  const initials  = (alt || '?').slice(0, 2).toUpperCase()
  const gradient  = getGradient(alt || 'nft')

  const onError = () => {
    if (stage === 'direct') {
      const next = getNextGatewayUrl(url)
      if (next) { setUrl(next); setStage('next'); return }
      // Try proxy
      setUrl(proxyUrl(resolved)); setStage('proxy'); return
    }
    if (stage === 'next') {
      setUrl(proxyUrl(resolved)); setStage('proxy'); return
    }
    setStage('fail')
  }

  if (stage === 'fail') {
    return (
      <div
        className={className}
        style={{
          background:     gradient,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '4px',
          ...style,
        }}
      >
        <span style={{
          fontSize:   'clamp(16px, 3vw, 28px)',
          fontWeight: 800,
          color:      'rgba(255,255,255,0.9)',
          letterSpacing: '-0.03em',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {initials}
        </span>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {!loaded && (
        <div style={{
          position:   'absolute', inset: 0,
          background: gradient,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize:   'clamp(16px, 3vw, 28px)',
            fontWeight: 800,
            color:      'rgba(255,255,255,0.7)',
            letterSpacing: '-0.03em',
          }}>
            {initials}
          </span>
        </div>
      )}
      <img
        src={url}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={onError}
        style={{
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          display:    'block',
          opacity:    loaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
          position:   'relative',
          zIndex:     1,
        }}
      />
    </div>
  )
}

export default NFTImage
