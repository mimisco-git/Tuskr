import { Link } from 'react-router-dom'
import s from './Footer.module.css'

const MAINNET_PKG  = '0xd3a0071d104926cdc53e3e0ddb1fc9bfe3f38b5dd0a9e844707bb49b7a3c6787'
const MAINNET_MKT  = '0x9524c9adde77ae46b14ef9703b62899bb823124a30d8597a1fd837157d911650'

function short(addr: string) { return addr.slice(0,6)+'...'+addr.slice(-4) }

export default function Footer() {
  const net = localStorage.getItem('tuskr_network') || 'mainnet'
  const suiscan = net === 'testnet' ? 'https://suiscan.xyz/testnet' : 'https://suiscan.xyz/mainnet'

  return (
    <>
      {/* Tuskr mascot brand — same style as walrus.xyz */}
      <div className={s.brandSection}>
        <div className={s.brandWord}>tuskr</div>
        <div className={s.brandMascotWrap}>
          <img src="/mascot.png" alt="Tuskr mascot" className={s.brandMascot} draggable={false}/>
        </div>
      </div>

      <footer className={s.footer}>
      <div className="container">
        <div className={s.grid}>

          <div className={s.brand}>
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
            <a href="https://sui.io" target="_blank" rel="noopener noreferrer" className={s.bottomLink}>Sui</a>
            <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" className={s.bottomLink}>Walrus</a>
          </div>
        </div>
      </div>
      </footer>
    </>
  )
}
