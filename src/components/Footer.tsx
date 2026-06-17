import { Link } from 'react-router-dom'
import s from './Footer.module.css'

const MAINNET_PKG = '0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56'
const MAINNET_MKT = '0x194b2610a10950958e6bfbb4e36e9b9f5c278e02d740d6d8013b2d60934a5002'
function short(a: string) { return a.slice(0,6)+'...'+a.slice(-4) }

export default function Footer() {
  const net     = localStorage.getItem('tuskr_network') || 'mainnet'
  const suiscan = net === 'testnet'
    ? 'https://suiscan.xyz/testnet'
    : 'https://suiscan.xyz/mainnet'

  return (
    <>
      {/* ── Footer links — ABOVE the brand ── */}
      <footer className={s.footer}>
        <div className="container">
          <div className={s.grid}>
            <div className={s.brandCol}>
              <span className={s.logo}>tuskr</span>
              <p className={s.tagline}>NFTs on Sui. Media on Walrus.</p>
              <div className={s.badges}>
                <span className={s.badge}>⛓ Sui</span>
                <span className={s.badge}>🌊 Walrus</span>
                <span className={s.badge}>✦ AI</span>
              </div>
            </div>
            <div className={s.col}>
              <p className={s.colTitle}>Marketplace</p>
              <Link to="/marketplace" className={s.link}>Explore NFTs</Link>
              <Link to="/marketplace" className={s.link}>Trending</Link>
              <Link to="/activity"    className={s.link}>Activity Feed</Link>
              <Link to="/collections" className={s.link}>Collections</Link>
            </div>
            <div className={s.col}>
              <p className={s.colTitle}>Create</p>
              <Link to="/mint"       className={s.link}>Mint NFT</Link>
              <Link to="/mint/batch" className={s.link}>Batch Mint</Link>
              <Link to="/mint/ai"    className={s.link}>AI Generator</Link>
              <Link to="/auction"    className={s.link}>Auction</Link>
            </div>
            <div className={s.col}>
              <p className={s.colTitle}>Contracts ({net})</p>
              <a href={`${suiscan}/object/${MAINNET_PKG}`} target="_blank" rel="noopener noreferrer" className={s.contract}>
                <span className={s.contractLabel}>Package</span>
                <span className={s.contractAddr}>{short(MAINNET_PKG)}</span>
                <span className={s.contractArrow}>↗</span>
              </a>
              <a href={`${suiscan}/object/${MAINNET_MKT}`} target="_blank" rel="noopener noreferrer" className={s.contract}>
                <span className={s.contractLabel}>Marketplace</span>
                <span className={s.contractAddr}>{short(MAINNET_MKT)}</span>
                <span className={s.contractArrow}>↗</span>
              </a>
              <a href="https://aggregator.walrus.space" target="_blank" rel="noopener noreferrer" className={s.contract}>
                <span className={s.contractLabel}>Walrus Aggregator</span>
                <span className={s.contractArrow}>↗</span>
              </a>
            </div>
          </div>
          <div className={s.bottom}>
            <p className={s.copy}>© 2026 Tuskr. Built for Sui Overflow 2026.</p>
            <div className={s.bottomLinks}>
              <a href="https://github.com/mimisco-git/Tuskr" target="_blank" rel="noopener noreferrer" className={s.bottomLink}>GitHub</a>
              <a href="https://sui.io"     target="_blank" rel="noopener noreferrer" className={s.bottomLink}>Sui</a>
              <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" className={s.bottomLink}>Walrus</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── BRAND CLOSER — absolute last element on every page ── */}
      {/* Same concept as walrus.xyz: giant text + mascot head poking through */}
      <div className={s.brand} aria-hidden="true">
        {/* Mascot — positioned so head rises above the text */}
        <img
          src="/mascot-logo.webp"
          alt=""
          className={s.brandMascot}
          draggable={false}
        />
        {/* Giant "tuskr" — full viewport width, no container */}
        <div className={s.brandText}>tuskr</div>
      </div>
    </>
  )
}
