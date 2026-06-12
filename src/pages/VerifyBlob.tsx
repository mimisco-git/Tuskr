/**
 * /verify/:blobId
 * Shows a Walrus blob as a properly rendered image
 * with metadata and proof of decentralized storage
 */
import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import s from './VerifyBlob.module.css'

export default function VerifyBlob() {
  const { blobId } = useParams<{ blobId: string }>()
  const [loaded,  setLoaded]  = useState(false)
  const [failed,  setFailed]  = useState(false)

  const net    = localStorage.getItem('tuskr_network') || 'testnet'
  const agg    = net === 'mainnet'
    ? 'https://aggregator.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space'
  const rawUrl = `${agg}/v1/blobs/${blobId}`
  // Use our proxy so browser gets correct Content-Type
  const imgSrc = `/api/img?url=${encodeURIComponent(rawUrl)}`

  useEffect(() => { document.title = 'Verify on Walrus — Tuskr' }, [])

  return (
    <main className={s.page}>
      <div className={s.card}>

        {/* Header */}
        <div className={s.header}>
          <div className={s.badge}>
            <span className={s.dot}/>
            <span>Verified on Walrus</span>
          </div>
          <h1 className={s.title}>NFT Media Proof</h1>
          <p className={s.sub}>
            This image is permanently stored on Walrus decentralized storage.
            It exists across hundreds of nodes and cannot be taken down.
          </p>
        </div>

        {/* Image */}
        <div className={s.imgWrap}>
          {!loaded && !failed && <div className={s.skeleton}/>}
          {failed && (
            <div className={s.error}>
              <p className={s.errorIcon}>⚠</p>
              <p>Could not load blob. It may have expired on testnet.</p>
              <p className={s.errorSub}>Testnet blobs have a limited lifespan.</p>
            </div>
          )}
          <img
            src={imgSrc}
            alt="Walrus NFT blob"
            className={`${s.img} ${loaded ? s.imgVisible : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => { setFailed(true); setLoaded(false) }}
          />
        </div>

        {/* Proof details */}
        <div className={s.proof}>
          <div className={s.proofRow}>
            <span className={s.proofLabel}>Blob ID</span>
            <code className={s.proofVal}>{blobId}</code>
          </div>
          <div className={s.proofRow}>
            <span className={s.proofLabel}>Network</span>
            <span className={s.proofVal}>{net}</span>
          </div>
          <div className={s.proofRow}>
            <span className={s.proofLabel}>Aggregator</span>
            <a href={rawUrl} target="_blank" rel="noopener noreferrer" className={s.proofLink}>
              {agg} ↗
            </a>
          </div>
          <div className={s.proofRow}>
            <span className={s.proofLabel}>Storage</span>
            <span className={s.proofVal} style={{ color: '#00d4aa' }}>
              Walrus Decentralized Network
            </span>
          </div>
        </div>

        {/* Direct link */}
        <div className={s.footer}>
          <a href={rawUrl} target="_blank" rel="noopener noreferrer" className={s.rawLink}>
            View raw blob on Walrus ↗
          </a>
          <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" className={s.walrusLink}>
            walrus.xyz ↗
          </a>
        </div>

      </div>
    </main>
  )
}
