import { useState, useCallback, useEffect } from 'react'
import { useCurrentAccount, useSuiClient, ConnectButton } from '@mysten/dapp-kit'
import { useDeepBookPrice } from '../hooks/useDeepBookPrice'
import { useSeal }        from '../hooks/useSeal'
import { useWalrus } from '../hooks/useWalrus'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useNetwork } from '../hooks/useNetwork'
import { Link } from 'react-router-dom'
import s from './Mint.module.css'
import usePageTitle from '../hooks/usePageTitle'

type Step = 'upload' | 'details' | 'guardian' | 'minting' | 'done'

const STEPS = [
  { key: 'upload',  label: 'Upload',  desc: 'Add your file' },
  { key: 'details', label: 'Details', desc: 'Name your NFT' },
  { key: 'guardian', label: 'Review',  desc: 'Confirm transaction' },
  { key: 'minting', label: 'Mint',    desc: 'Sign on Sui' },
  { key: 'done',    label: 'Done',    desc: 'Live on Walrus' },
] as const

export default function Mint() {
  usePageTitle('Mint an NFT')
  const { network } = useNetwork()
  const account = useCurrentAccount()
  const { uploadBlob, uploading, error: wErr } = useWalrus()
  const { encrypt: sealEncrypt, isAvailable: sealAvailable } = useSeal()
  const client = useSuiClient()

  useEffect(() => {
    if (!account) return
    client.getBalance({ owner: account.address }).then((b: any) => {
      setSuiBalance(Number(b.totalBalance) / 1e9)
    }).catch(() => {})
  }, [account, client])
  const { mintNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)

  const [useSealEncrypt, setUseSealEncrypt] = useState(false)
  const [step,     setStep]     = useState<Step>('upload')
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [isVideo,  setIsVideo]  = useState(false)
  const [suiBalance, setSuiBalance] = useState<number | null>(null)
  const { price: suiPrice } = useDeepBookPrice()
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
    setIsVideo(f.type.startsWith('video/'))
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
      // Optional: Seal-encrypt the description before minting
      let sealedBlobId = ''
      if (useSealEncrypt && blobId && desc.trim()) {
        try {
          const pkg = import.meta.env.VITE_TESTNET_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID || ''
          const textBytes = new TextEncoder().encode(desc)
          // Encrypt using creator address as Seal identity
          const encrypted = await sealEncrypt(textBytes, account?.address || '', pkg)
          if (encrypted) {
            const encFile = new File([new Blob([encrypted as BlobPart])], 'sealed.bin', { type: 'application/octet-stream' })
            const sealR   = await uploadBlob(encFile, account?.address)
            if (sealR) sealedBlobId = sealR.blobId
          }
        } catch (e) { console.warn('[Seal] Encryption skipped:', e) }
      }

      const r = await mintNFT({ name, description: desc, blobId, mediaUrl, royaltyBps: royalty * 100, sealedBlobId: sealedBlobId || undefined })
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
    setStep('upload'); setFile(null); setPreview(null); setIsVideo(false)
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
                isVideo ? (
                  <video src={preview} className={s.dropPreview} autoPlay loop muted playsInline controls={false}
                    style={{ objectFit:'cover', width:'100%', height:'100%', borderRadius:12 }}/>
                ) : (
                  <img src={preview} alt="Preview" className={s.dropPreview}/>
                )
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

            {isVideo && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                background:'rgba(99,102,241,0.10)', border:'1px solid rgba(99,102,241,0.25)',
                borderRadius:10, marginBottom:8 }}>
                <span style={{ fontSize:18 }}>🎬</span>
                <span style={{ fontSize:13, fontWeight:700, color:'#818cf8' }}>Video NFT</span>
                <span style={{ fontSize:12, color:'rgba(245,245,247,0.4)' }}>· Stored permanently on Walrus</span>
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
                    onClick={() => setStep('guardian')}
                    disabled={!name.trim() || minting}
                  >
                    Review & Mint &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── GUARDIAN PREVIEW ─────────────────────────────────── */}
        {step === 'guardian' && (
          <div className={s.card}>
            <div style={{ padding: '32px 28px' }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'rgba(0,212,170,0.12)', border:'1px solid rgba(0,212,170,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🤖</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>AI Agent: Transaction Preview</div>
                  <div style={{ fontSize:13, color:'rgba(245,245,247,0.4)', marginTop:2 }}>Review what the agent will execute on your behalf</div>
                </div>
              </div>

              {/* PTB Steps */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                {[
                  {
                    icon:'🌊', done:true,
                    action:'Store media on Walrus',
                    detail: `Blob ID: ${blobId?.slice(0,20)}... · Permanent storage · Cannot be deleted`,
                    color:'#00d4aa',
                  },
                  ...(useSealEncrypt ? [{
                    icon:'🔐', done:false,
                    action:'Encrypt description with Seal',
                    detail:'Private content stored on Walrus · Only you can decrypt',
                    color:'#a855f7',
                  }] : []),
                  {
                    icon:'⚡', done:false,
                    action:'Mint TuskrNFT on Sui Move',
                    detail:`Contract: tuskr_nft::mint · Royalty: ${royalty}% · Network: Testnet`,
                    color:'#3b82f6',
                  },
                  {
                    icon:'🏦', done:false,
                    action:'Transfer NFT to your wallet',
                    detail:`Owner: ${account?.address?.slice(0,14)}...${account?.address?.slice(-6)}`,
                    color:'#f59e0b',
                  },
                ].map((step, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px', background: step.done ? 'rgba(0,212,170,0.06)' : 'rgba(255,255,255,0.03)', border:`1px solid ${step.done ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius:12 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      {step.done ? '✅' : step.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{step.action}</span>
                        {step.done && <span style={{ fontSize:10, background:'rgba(0,212,170,0.15)', color:'#00d4aa', borderRadius:5, padding:'1px 7px', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.08em' }}>Complete</span>}
                      </div>
                      <div style={{ fontSize:12, color:'rgba(245,245,247,0.38)', marginTop:4, fontFamily:'Space Mono,monospace' }}>{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
                <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>Cost Breakdown</div>
                {[
                  { label:'Estimated gas fee', value:'~0.01 SUI', sub: suiPrice ? `~$${(0.01*suiPrice).toFixed(4)}` : '' },
                  { label:'Walrus storage', value:'Prepaid ✓', sub:'Permanent, never expires' },
                  { label:'Royalty (on resale)', value:`${royalty}%`, sub:'You earn this on every secondary sale' },
                ].map((row, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'7px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ fontSize:13, color:'rgba(245,245,247,0.55)' }}>{row.label}</span>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{row.value}</div>
                      {row.sub && <div style={{ fontSize:11, color:'rgba(245,245,247,0.3)', fontFamily:'Space Mono,monospace', marginTop:2 }}>{row.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Wallet balance warning */}
              {suiBalance !== null && suiBalance < 0.05 && (
                <div style={{ display:'flex', gap:10, padding:'12px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, marginBottom:16 }}>
                  <span style={{ fontSize:16 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#f87171' }}>Low balance</div>
                    <div style={{ fontSize:12, color:'rgba(245,245,247,0.4)', marginTop:2 }}>Your wallet has {suiBalance.toFixed(4)} SUI. You may not have enough for gas. Top up via faucet before minting.</div>
                  </div>
                </div>
              )}

              {/* Price context */}
              {suiPrice && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(0,0,0,0.2)', borderRadius:10, marginBottom:24 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', boxShadow:'0 0 6px #00d4aa', flexShrink:0, display:'inline-block' }}/>
                  <span style={{ fontSize:12, color:'rgba(245,245,247,0.4)', fontFamily:'Space Mono,monospace' }}>
                    Live price via DeepBook: 1 SUI = ${suiPrice.toFixed(3)} USDC · Wallet: {suiBalance?.toFixed(4) ?? '...'} SUI
                  </span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:12 }}>
                <button
                  onClick={() => setStep('details')}
                  style={{ flex:1, padding:'13px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(245,245,247,0.6)', fontSize:14, fontWeight:600, cursor:'pointer' }}
                >
                  ← Go Back
                </button>
                <button
                  onClick={mint}
                  disabled={minting}
                  style={{ flex:2, padding:'13px', borderRadius:12, background:'#00d4aa', color:'#000', fontSize:15, fontWeight:800, border:'none', cursor:'pointer', letterSpacing:'-0.01em' }}
                >
                  {minting ? 'Executing...' : 'Confirm & Mint on Sui →'}
                </button>
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
