import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useWalrus } from '../hooks/useWalrus'
import usePageTitle from '../hooks/usePageTitle'
import s from './CreateCollection.module.css'

export default function CreateCollection() {
  usePageTitle('Create Collection')
  const account  = useCurrentAccount()
  const navigate = useNavigate()
  const { uploadBlob, uploading } = useWalrus()

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [coverFile,   setCoverFile]   = useState<File | null>(null)
  const [coverPreview,setCoverPreview]= useState<string | null>(null)
  const [royalty,     setRoyalty]     = useState(5)
  const [created,     setCreated]     = useState(false)
  const [coverBlobId, setCoverBlobId] = useState('')

  const handleCover = (f: File) => {
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  const handleCreate = async () => {
    if (!name.trim() || !account) return
    let blobId = ''
    if (coverFile) {
      const r = await uploadBlob(coverFile, account.address)
      if (r) blobId = r.blobId
    }
    setCoverBlobId(blobId)
    setCreated(true)
  }

  if (!account) return (
    <main className={s.page}>
      <div className="container">
        <div className={s.connectBox}>
          <div className={s.connectIcon}>🔗</div>
          <h2 className={s.connectTitle}>Connect your wallet</h2>
          <p className={s.connectSub}>You need a connected wallet to create a collection.</p>
          <Link to="/marketplace" className="btn btn-primary">Go to Marketplace</Link>
        </div>
      </div>
    </main>
  )

  if (created) return (
    <main className={s.page}>
      <div className="container">
        <div className={s.successBox}>
          <div className={s.successIcon}>🎉</div>
          <h2 className={s.successTitle}>Collection Created!</h2>
          <p className={s.successSub}>
            <strong>{name}</strong> is ready. Start minting NFTs into it. Each NFT you mint goes into your collection automatically.
          </p>
          {coverBlobId && (
            <div className={s.blobRow}>
              <span className={s.blobLabel}>Cover stored on Walrus</span>
              <code className={s.blobId}>{coverBlobId.slice(0, 24)}...</code>
            </div>
          )}
          <div className={s.successActions}>
            <Link to="/mint" className="btn btn-primary">Mint First NFT →</Link>
            <Link to="/collections" className="btn btn-ghost">View Collections</Link>
          </div>
        </div>
      </div>
    </main>
  )

  return (
    <main className={s.page}>
      <div className="container">

        <div className={s.header}>
          <Link to="/collections" className={s.back}>← Collections</Link>
          <h1 className={s.title}>Create Collection</h1>
          <p className={s.sub}>
            Collections on Tuskr group your minted NFTs together. Set a name,
            cover image and royalty, then start minting.
          </p>
        </div>

        <div className={s.layout}>

          {/* Cover image */}
          <div className={s.coverSide}>
            <label className={s.coverDrop} style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : 'none' }}>
              {!coverPreview && (
                <div className={s.coverPlaceholder}>
                  <span className={s.coverIcon}>🖼</span>
                  <span className={s.coverLabel}>Upload cover image</span>
                  <span className={s.coverHint}>Recommended 1200×400px</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className={s.hiddenInput}
                onChange={e => e.target.files?.[0] && handleCover(e.target.files[0])}
              />
            </label>
            {coverFile && (
              <div className={s.walrusHint}>
                <span className={s.walrusIcon}>🌊</span>
                Cover will be stored permanently on Walrus
              </div>
            )}
          </div>

          {/* Form */}
          <div className={s.formSide}>
            <div className={s.field}>
              <label className={s.label}>Collection Name *</label>
              <input
                className={s.input}
                placeholder="e.g. Tusk Warriors"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>Description</label>
              <textarea
                className={s.textarea}
                placeholder="Tell collectors what makes this collection unique..."
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>Creator Royalty</label>
              <div className={s.royaltyRow}>
                <input
                  type="range" min={0} max={15} step={0.5}
                  value={royalty}
                  onChange={e => setRoyalty(Number(e.target.value))}
                  className={s.slider}
                />
                <span className={s.royaltyVal}>{royalty}%</span>
              </div>
              <p className={s.hint}>You earn {royalty}% on every secondary sale</p>
            </div>

            <div className={s.infoBox}>
              <span className={s.infoIcon}>ℹ</span>
              <span className={s.infoText}>
                On Sui, collections are defined by your wallet address and NFT type.
                Every NFT you mint under the Tuskr contract is part of your collection.
              </span>
            </div>

            <button
              className={s.createBtn}
              onClick={handleCreate}
              disabled={!name.trim() || uploading}
            >
              {uploading ? 'Uploading cover...' : 'Create Collection →'}
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}
