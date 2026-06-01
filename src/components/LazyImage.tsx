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

      {/* Real image — only loads when in viewport */}
      {inView && (
        <img
          src={src}
          alt={alt}
          className={`${s.img} ${loaded ? s.visible : s.hidden}`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
}
