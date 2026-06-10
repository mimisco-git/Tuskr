/**
 * NFTImage
 * 
 * Strategy:
 * 1. Build TradePort CDN URL: https://img.tradeport.gg?url={encoded}&mime-type=image
 * 2. Route it through OUR proxy: /api/img?url={encoded_tradeport_cdn_url}
 *    Our proxy sends Referer: tradeport.xyz so their CDN accepts the request.
 * 3. Gradient fallback if all fails.
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

export default function NFTImage({ src, alt, className, style }: Props) {
  const resolved = resolveMediaUrl(src)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const initials = (alt || '?').slice(0, 2).toUpperCase()
  const bg       = gradient(alt || 'nft')

  // Walrus/IPFS URLs: go directly through our proxy (TradePort can't fetch these)
  // External NFT images: route through TradePort CDN (handles hotlink protection)
  const isWalrus = resolved.includes('walrus.space') || resolved.includes('walrus-testnet')
  const isIpfs   = resolved.includes('ipfs') || resolved.includes('arweave')

  const imgSrc = !resolved ? ''
    : (isWalrus || isIpfs)
      ? `/api/img?url=${encodeURIComponent(resolved)}`
      : `/api/img?url=${encodeURIComponent(`https://img.tradeport.gg?url=${encodeURIComponent(resolved)}&mime-type=image`)}`

  const Placeholder = (
    <div style={{
      position: 'absolute', inset: 0, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0,
    }}>
      <span style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 800,
        color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em',
        textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        {initials}
      </span>
    </div>
  )

  // Check if URL is a Walrus blob that likely expired
  const isWalrusBlob = resolved.includes('walrus')

  if (!imgSrc || failed) {
    return (
      <div className={className} style={{ background: bg, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4, ...style }}>
        <span style={{ fontSize: 'clamp(14px,3vw,26px)', fontWeight: 800,
          color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          {initials}
        </span>
        {failed && isWalrusBlob && (
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 99,
            letterSpacing: '0.08em' }}>
            BLOB EXPIRED
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {!loaded && Placeholder}
      <img
        src={imgSrc}
        alt={alt}
        onLoad={()  => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease',
          position: 'relative', zIndex: 1,
        }}
      />
    </div>
  )
}
