/**
 * NFTImage — robust NFT image component
 * Tries: direct URL → next IPFS gateway → our proxy → fallback text
 * Shows a loading skeleton while the image loads
 */
import { useState } from 'react'
import { resolveMediaUrl, getNextGatewayUrl, proxyUrl } from '../utils/media'

interface NFTImageProps {
  src:       string | null | undefined
  alt:       string
  className?: string
  style?:    React.CSSProperties
}

type Stage = 'loading' | 'direct' | 'gateway2' | 'gateway3' | 'proxy' | 'fail'

export function NFTImage({ src, alt, className, style }: NFTImageProps) {
  const resolved = resolveMediaUrl(src)
  const [stage,   setStage]   = useState<Stage>(resolved ? 'direct' : 'fail')
  const [currUrl, setCurrUrl] = useState(resolved)
  const [loaded,  setLoaded]  = useState(false)

  const initials = (alt || '?').slice(0, 2).toUpperCase()

  const handleError = () => {
    // Try next IPFS gateway
    const next = getNextGatewayUrl(currUrl)
    if (next) {
      setCurrUrl(next)
      setStage(stage === 'direct' ? 'gateway2' : 'gateway3')
      return
    }
    // Try our server-side proxy
    if (stage !== 'proxy') {
      setCurrUrl(proxyUrl(resolved))
      setStage('proxy')
      return
    }
    // All failed — show fallback
    setStage('fail')
  }

  if (stage === 'fail' || !resolved) {
    return (
      <div
        className={className}
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          background:      'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(100,40,220,0.08))',
          color:           'rgba(245,245,247,0.3)',
          fontWeight:      700,
          fontSize:        'clamp(14px, 3vw, 28px)',
          ...style,
        }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {/* Skeleton while loading */}
      {!loaded && (
        <div style={{
          position:  'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s ease infinite',
        }}/>
      )}
      <img
        src={currUrl}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        style={{
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          display:    'block',
          opacity:    loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  )
}

export default NFTImage
