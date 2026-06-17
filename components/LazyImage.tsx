import { useState, useRef, useEffect } from 'react'
import s from './LazyImage.module.css'

interface Props {
  src: string
  alt: string
  className?: string
  aspectRatio?: string
}

export default function LazyImage({ src, alt, className = '', aspectRatio = '1' }: Props) {
  const [loaded, setLoaded]   = useState(false)
  const [inView, setInView]   = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${s.wrap} ${className}`}
      style={{ aspectRatio }}
    >
      {/* Shimmer placeholder */}
      {!loaded && <div className={`${s.shimmer} skeleton`} />}

      {/* Real image — proxied through /api/img to avoid CORS on Walrus/IPFS URLs */}
      {inView && (
        <img
          src={src && src.startsWith('http') ? `/api/img?url=${encodeURIComponent(src)}` : src}
          alt={alt}
          className={`${s.img} ${loaded ? s.visible : s.hidden}`}
          onLoad={() => setLoaded(true)}
          onError={e => {
            // If proxy fails, try the raw URL directly as last resort
            const t = e.target as HTMLImageElement
            if (!t.src.startsWith('/api/img')) return
            t.src = src
          }}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
}
