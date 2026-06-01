import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import s from './Footer.module.css'

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 9 9" fill="none" aria-hidden>
      <path d="M9 0H0V1H9V0Z" fill="currentColor"/>
      <path d="M8.3 0L0 8.3L0.7 9L9 0.7L8.3 0Z" fill="currentColor"/>
      <path d="M9 0H8V9H9V0Z" fill="currentColor"/>
    </svg>
  )
}

const FOOTER_LINKS = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse NFTs',     to: '/marketplace' },
      { label: 'Collections',     to: '/collections' },
      { label: 'Live Auctions',   to: '/auction' },
      { label: 'Activity Feed',   to: '/activity' },
      { label: 'Watchlist',       to: '/watchlist' },
    ],
  },
  {
    title: 'Create',
    links: [
      { label: 'Mint an NFT',        to: '/mint' },
      { label: 'AI Generator',       to: '/mint/ai' },
      { label: 'Batch Mint',         to: '/mint/batch' },
      { label: 'List for Sale',      to: '/list' },
    ],
  },
  {
    title: 'Earn',
    links: [
      { label: 'XP Leaderboard',     to: '/leaderboard' },
      { label: 'Creator Dashboard',  to: '/dashboard' },
      { label: 'My NFTs',            to: '/profile' },
    ],
  },
  {
    title: 'Build on',
    links: [
      { label: 'Walrus Protocol', href: 'https://walrus.xyz',         ext: true },
      { label: 'Sui Foundation',  href: 'https://sui.io',             ext: true },
      { label: 'Walrus Seal',     href: 'https://docs.wal.app/walrus-seal', ext: true },
      { label: 'GitHub',          href: 'https://github.com/mimisco-git/Tuskr', ext: true },
    ],
  },
]

/* "TUSKR" split into individual spans for staggered letter animation */
const LETTERS = ['T','U','S','K','R']

export default function Footer() {
  const year         = new Date().getFullYear()
  const wrapRef      = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  /* Intersection Observer — triggers animations when footer enters view */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <footer className={s.footer}>

      {/* ── Link columns ── */}
      <div className={s.linksWrap}>
        <div className="container">
          <div className={s.linksGrid}>
            {FOOTER_LINKS.map(col => (
              <div key={col.title} className={s.col}>
                <div className={s.colTitle}>{col.title}</div>
                {col.links.map(l => (
                  'href' in l ? (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.link}
                    >
                      {l.label}
                      <span className={s.ext}><Arrow/></span>
                    </a>
                  ) : (
                    <Link key={l.label} to={l.to!} className={s.link}>
                      {l.label}
                    </Link>
                  )
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Giant wordmark + mascot ── */}
      <div ref={wrapRef} className={s.wordmarkWrap}>

        {/* Copyright */}
        <div className={s.copyright}>
          &copy; {year} Tuskr. All rights reserved.
        </div>

        {/* Teal + purple ambient glow layer behind mascot */}
        <div className={s.glowLayer}/>

        {/*
         * TUSKR wordmark — full viewport width
         * Each letter is a span for staggered entrance animation
         * visible class starts animations via IntersectionObserver
         */}
        <div className={`${s.wordmark} ${visible ? s.wordmarkVisible : ''}`}>
          {LETTERS.map((letter, i) => (
            <span
              key={letter}
              className={s.letter}
              style={{ '--i': i } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </div>

        {/*
         * Mascot — z-index above wordmark
         * mix-blend-mode:screen in CSS removes dark background
         * Slides up via animation when section enters view
         */}
        <div className={`${s.mascotWrap} ${visible ? s.slideUp : ''}`}>
          <img
            src="/mascot-stand.png"
            alt="Tuskr mascot"
            className={s.mascot}
            draggable={false}
          />
        </div>

      </div>
    </footer>
  )
}
