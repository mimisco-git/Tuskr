import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NFTImage from '../components/NFTImage'
import usePageTitle from '../hooks/usePageTitle'

const PKG = '0x10436eb7339e639f96dc65d86850e047ed567851d1cd539884c28e56d4afaee0'
const COL = '0xa2c8e96f5a083c351db9b20f2e28dd34a64ebd013fd4927e1d242555903a6529'
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'

export default function GenesisCollection() {
  usePageTitle('Tuskr Genesis Collection')
  const [col,     setCol]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/collections?type=collection')
      .then(r => r.json())
      .then(d => { setCol(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <main style={{ padding: '100px 0', textAlign: 'center', color: 'rgba(245,245,247,0.4)' }}>
      <div style={{ fontSize: 14, fontFamily: 'Space Mono,monospace' }}>Loading collection...</div>
    </main>
  )

  if (!col) return (
    <main style={{ padding: '100px 0', textAlign: 'center' }}>
      <p style={{ color: 'rgba(245,245,247,0.4)' }}>Could not load collection.</p>
      <Link to="/collections" style={{ color: '#00d4aa' }}>← Back to Collections</Link>
    </main>
  )

  return (
    <main style={{ padding: '72px 0 120px' }}>
      <div className="container">

        {/* Back */}
        <Link to="/collections" style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
          ← Collections
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
          <div style={{ width: 100, height: 100, borderRadius: 20, background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, flexShrink: 0 }}>
            🐘
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
                {col.name}
              </h1>
              <span style={{ fontSize: 11, background: 'rgba(0,212,170,0.12)', color: '#00d4aa', borderRadius: 8, padding: '3px 10px', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Testnet
              </span>
            </div>
            <p style={{ fontSize: 15, color: 'rgba(245,245,247,0.45)', margin: '0 0 16px', lineHeight: 1.6 }}>
              {col.description}
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Items', value: col.supply },
                { label: 'Royalty', value: `${col.royaltyBps / 100}%` },
                { label: 'Max Supply', value: col.maxSupply === 0 ? '∞' : col.maxSupply },
                { label: 'Network', value: 'Sui Testnet' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(245,245,247,0.3)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={col.suiscanUrl} target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f7', fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
              View on Suiscan ↗
            </a>
            <a href={`https://suiscan.xyz/testnet/object/${PKG}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f7', fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
              Contract ↗
            </a>
          </div>
        </div>

        {/* Contract details */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Contract Info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', minWidth: 80 }}>Package</span>
              <code style={{ fontSize: 12, color: '#00d4aa', fontFamily: 'Space Mono,monospace', wordBreak: 'break-all' }}>{PKG}</code>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', minWidth: 80 }}>Collection</span>
              <code style={{ fontSize: 12, color: '#00d4aa', fontFamily: 'Space Mono,monospace', wordBreak: 'break-all' }}>{COL}</code>
            </div>
          </div>
        </div>

        {/* NFT Grid */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
          Items ({col.nfts?.length ?? 0})
        </h2>

        {col.nfts?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(245,245,247,0.3)', fontSize: 15 }}>
            No NFTs minted yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {col.nfts?.map((nft: any) => (
              <div key={nft.nftId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,212,170,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                <div style={{ aspectRatio: '1', background: 'rgba(0,0,0,0.4)', position: 'relative' }}>
                  {nft.imageUrl ? (
                    <NFTImage
                      src={nft.imageUrl}
                      alt={nft.name}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🐘</div>
                  )}
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '3px 8px', fontSize: 11, color: '#00d4aa', fontFamily: 'Space Mono,monospace' }}>
                    #{nft.edition}
                  </div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{nft.name}</div>
                  {nft.blobId && !nft.blobId.includes('YOUR_') && (
                    <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', fontFamily: 'Space Mono,monospace' }}>
                      🌊 {nft.blobId.slice(0, 16)}...
                    </div>
                  )}
                  <a href={`https://suiscan.xyz/testnet/object/${nft.nftId}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: '#00d4aa', textDecoration: 'none', fontWeight: 600 }}>
                    View on Suiscan ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
