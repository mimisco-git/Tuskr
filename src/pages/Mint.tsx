import { useState, useCallback } from 'react'
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit'
import { useSeal }        from '../hooks/useSeal'
import { useWalrus } from '../hooks/useWalrus'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useNetwork } from '../hooks/useNetwork'
import { Link } from 'react-router-dom'
import s from './Mint.module.css'
import usePageTitle from '../hooks/usePageTitle'

type Step = 'upload' | 'details' | 'minting' | 'done'

const STEPS = [
  { key: 'upload',  label: 'Upload',  desc: 'Add your file' },
  { key: 'details', label: 'Details', desc: 'Name your NFT' },
  { key: 'minting', label: 'Mint',    desc: 'Sign on Sui' },
  { key: 'done',    label: 'Done',    desc: 'Live on Walrus' },
] as const

export default function Mint() {
  usePageTitle('Mint an NFT')
  const { network } = useNetwork()
  const account = useCurrentAccount()
  const { uploadBlob, uploading, error: wErr } = useWalrus()
  const { encrypt: sealEncrypt, isAvailable: sealAvailable } = useSeal()
  const { mintNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)

  const [useSealEncrypt, setUseSealEncrypt] = useState(false)
  const [step,     setStep]     = useState<Step>('upload')
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [blobId,   setBlobId]   = useState<string | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [name,     setName]     = useState('')
  const [desc,     setDesc]     = useState('')
  const [royalty,  setRoyalty]  = useState(5)
  const [minting,  setMinting]  = useState(false)
  const [txDigest, setTxDigest] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const upload = async () => {
    if (!file) return
    const r = await uploadBlob(file, account?.address)
    if (r) { setBlobId(r.blobId); setMediaUrl(r.mediaUrl); setStep('details') }
  }

  const mint = async () => {
    if (!blobId || !mediaUrl || !name) return
    setMinting(true)
    setStep('minting')
    try {
      const r = await mintNFT({ name, description: desc, blobId, mediaUrl, royaltyBps: royalty * 100 })
      setTxDigest(r.digest)
      setStep('done')
      if (account) awardXP(account.address, 'mint', `Minted: ${name}`)
    } catch (e) {
      console.error(e)
      setStep('details')
    } finally {
      setMinting(false)
    }
  }

  const reset = () => {
    setStep('upload'); setFile(null); setPreview(null)
    setBlobId(null); setMediaUrl(null)
    setName(''); setDesc(''); setRoyalty(5); setTxDigest(null)
  }

  const stepIdx = STEPS.findIndex(st => st.key === step)

  /* Not connected */
  if (!account) return (
    <main className={s.page}>
      <div className={s.inner}>
        <div className={s.gate}>
          <div className={s.gateMark}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2 className={s.gateTitle}>Connect to mint</h2>
          <p className={s.gateSub}>You need a Sui wallet to mint NFTs on Tuskr. Your media is permanently stored on Walrus.</p>
          <ConnectButton/>
        </div>
      </div>
    </main>
  )

  return (
    <main className={s.page}>
      <div className={s.inner}>

        {/* Page header */}
        <div className={s.pageHead}>
          <div className={s.pageEyebrow}>
            <span className={s.eyeDot}/>
            <span>Tuskr Mint</span>
          </div>
          <h1 className={s.pageTitle}>Mint an NFT</h1>
          <p className={s.pageSub}>
            Upload your file. Name your creation. Sign once on Sui.
            <br/>Media lives on Walrus forever.
          </p>
        </div>

        {/* Premium stepper */}
        <div className={s.stepper}>
          {STEPS.map((st, i) => {
            const done   = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={st.key} className={s.stepItem}>
                <div className={`${s.stepCircle} ${active ? s.stepCircleActive : ''} ${done ? s.stepCircleDone : ''}`}>
                  {done
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span className={s.stepNum}>{i + 1}</span>
                  }
                </div>
                <div className={s.stepText}>
                  <span className={`${s.stepLabel} ${active ? s.stepLabelActive : ''} ${done ? s.stepLabelDone : ''}`}>
                    {st.label}
                  </span>
                  <span className={s.stepDesc}>{st.desc}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`${s.stepLine} ${done ? s.stepLineDone : ''}`}/>
                )}
              </div>
            )
          })}
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Upload your file</h2>
              <p className={s.cardSub}>Drag and drop, or click to browse. File is uploaded to Walrus before minting.</p>
            </div>

            <div
              className={`${s.dropZone} ${dragging ? s.dropZoneDrag : ''} ${preview ? s.dropZoneHasFile : ''}`}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => document.getElementById('mintFile')?.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className={s.dropPreview}/>
              ) : (
                <div className={s.dropEmpty}>
                  <div className={s.dropIconWrap}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className={s.dropTitle}>Drop your file here</p>
                  <p className={s.dropTypes}>PNG · JPG · GIF · MP4 · SVG · up to 10 MB</p>
                </div>
              )}
              <input
                id="mintFile" type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {file && !uploading && (
              <div className={s.fileBar}>
                <div className={s.fileBarIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <span className={s.fileBarName}>{file.name}</span>
                <span className={s.fileBarSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <button className={s.fileBarRemove} onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {wErr && <p className={s.errMsg}>{wErr}</p>}

            <div className={s.walrusBadgeRow}>
              <div className={s.walrusBadge}>
                <span className={s.walrusDot}/>
                <span className={s.walrusLabel}>WALRUS</span>
              </div>
              <span className={s.walrusDesc}>Permanent decentralized storage. Your file is verifiable on-chain forever.</span>
            </div>

            <button
              className={s.primaryBtn}
              onClick={upload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <><span className={s.spinner}/> Uploading to Walrus</>
              ) : file ? (
                <>Upload to Walrus and continue &rarr;</>
              ) : (
                'Select a file to continue'
              )}
            </button>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Name your NFT</h2>
              <p className={s.cardSub}>Add details before minting on Sui.</p>
            </div>

            <div className={s.detailLayout}>
              {/* Left: preview */}
              <div className={s.detailPreviewCol}>
                {preview && (
                  <div className={s.detailPreviewWrap}>
                    <img src={preview} alt="" className={s.detailPreviewImg}/>
                    {blobId && (
                      <div className={s.blobTag}>
                        <span className={s.walrusDot}/>
                        <span className={s.walrusLabel}>WALRUS</span>
                        <span className={s.blobId}>{blobId.slice(0, 14)}...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: form */}
              <div className={s.detailForm}>
                <div className={s.field}>
                  <label className={s.fieldLabel}>NFT Name <span className={s.required}>*</span></label>
                  <input
                    className={s.fieldInput}
                    placeholder="e.g. Arctic Phantom #001"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={64}
                    autoFocus
                  />
                  <span className={s.fieldCount}>{name.length}/64</span>
                </div>

                <div className={s.field}>
                  <label className={s.fieldLabel}>Description</label>
                  <textarea
                    className={`${s.fieldInput} ${s.fieldTextarea}`}
                    placeholder="The story behind this NFT..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    rows={4}
                    maxLength={512}
                  />
                </div>

                {/* Seal encryption toggle */}
                {true && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 16px',
                    background: useSealEncrypt ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${useSealEncrypt ? 'rgba(168,85,247,0.30)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                    marginBottom: 4,
                  }}
                  onClick={() => setUseSealEncrypt(v => !v)}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      background: useSealEncrypt ? '#a855f7' : 'rgba(255,255,255,0.08)',
                      border: `2px solid ${useSealEncrypt ? '#a855f7' : 'rgba(255,255,255,0.20)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {useSealEncrypt && <span style={{ color:'#fff', fontSize:12, lineHeight:1 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: useSealEncrypt ? '#a855f7' : '#f5f5f7' }}>
                          🔐 Encrypt description with Seal
                        </span>
                      </div>
                      <p style={{ fontSize:12, color:'rgba(245,245,247,0.4)', margin:0, lineHeight:1.5 }}>
                        Your description will be encrypted on Walrus. Only you (the NFT owner) can decrypt and read it. Powered by Mysten Labs Seal.
                      </p>
                    </div>
                  </div>
                )}

                <div className={s.field}>
                  <label className={s.fieldLabel}>
                    Creator Royalty
                    <span className={s.royaltyVal}>{royalty}%</span>
                  </label>
                  <div className={s.sliderWrap}>
                    <input
                      type="range" min={0} max={15} step={1}
                      value={royalty}
                      onChange={e => setRoyalty(Number(e.target.value))}
                      className={s.slider}
                    />
                    <div className={s.sliderTicks}>
                      <span>0%</span>
                      <span>5%</span>
                      <span>10%</span>
                      <span>15%</span>
                    </div>
                  </div>
                  <p className={s.fieldHint}>Earned on every secondary sale of this NFT.</p>
                </div>

                <div className={s.detailActions}>
                  <button className={s.backBtn} onClick={() => setStep('upload')}>
                    &larr; Back
                  </button>
                  <button
                    className={s.mintBtn}
                    onClick={mint}
                    disabled={!name.trim() || minting}
                  >
                    Mint NFT on Sui &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Minting */}
        {step === 'minting' && (
          <div className={s.card}>
            <div className={s.statusBox}>
              <div className={s.spinnerLarge}/>
              <h2 className={s.statusTitle}>Confirm in your wallet</h2>
              <p className={s.statusSub}>
                Your wallet extension will open with a transaction to sign.
                <br/>This mints your NFT on Sui.
              </p>
              <div className={s.statusSteps}>
                <div className={s.statusStep}>
                  <span className={s.statusCheck}>✓</span> File uploaded to Walrus
                </div>
                <div className={`${s.statusStep} ${s.statusStepActive}`}>
                  <span className={s.statusSpinnerSmall}/> Awaiting wallet signature
                </div>
                <div className={`${s.statusStep} ${s.statusStepPending}`}>
                  <span className={s.statusPendingDot}/> NFT minted on Sui
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className={s.card}>
            <div className={s.doneBox}>
              <div className={s.doneGlow}/>
              <div className={s.doneCheckWrap}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M6 16L13 23L26 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className={s.doneTitle}>NFT minted</h2>
              <p className={s.doneSub}>
                <strong style={{color:'#fff'}}>{name}</strong> is live on Sui.
                <br/>Media is permanently stored on Walrus.
              </p>
              {preview && (
                <div className={s.donePrevWrap}>
                  <img src={preview} alt={name} className={s.donePreview}/>
                </div>
              )}
              <div className={s.doneActions}>
                {txDigest && (
                  <a
                    href={`${network.explorerBase}/${txDigest}`}
                    target="_blank" rel="noreferrer"
                    className={s.doneExplorer}
                  >
                    View on explorer &rarr;
                  </a>
                )}
                <Link to="/profile" className={s.doneProfile}>View my NFTs</Link>
                <button className={s.doneReset} onClick={reset}>Mint another</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
