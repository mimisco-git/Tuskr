import { useState, useCallback } from 'react'
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit'
import { useWalrus } from '../hooks/useWalrus'
import { useWalrusSeal } from '../hooks/useWalrusSeal'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import s from './Mint.module.css'
import usePageTitle from '../hooks/usePageTitle'

type Step = 'upload'|'details'|'minting'|'done'

export default function Mint() {
  usePageTitle('Mint an NFT')
  const account = useCurrentAccount()
  const { uploadBlob, uploading, error:wErr } = useWalrus()
  const { mintNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File|null>(null)
  const [preview, setPreview] = useState<string|null>(null)
  const [blobId, setBlobId] = useState<string|null>(null)
  const [mediaUrl, setMediaUrl] = useState<string|null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [royalty, setRoyalty] = useState(5)
  const [enableSeal, setEnableSeal] = useState(false)
  const [minting, setMinting] = useState(false)
  const [txDigest, setTxDigest] = useState<string|null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (f:File) => { setFile(f); setPreview(URL.createObjectURL(f)) }
  const onDrop = useCallback((e:React.DragEvent) => { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f) }, [])

  const upload = async () => {
    if(!file) return
    const r = await uploadBlob(file)
    if(r) { setBlobId(r.blobId); setMediaUrl(r.mediaUrl); setStep('details') }
  }

  const mint = async () => {
    if(!blobId||!mediaUrl||!name) return
    setMinting(true); setStep('minting')
    try { const r = await mintNFT({ name, description:desc, blobId, mediaUrl, royaltyBps:royalty*100 }); setTxDigest(r.digest); setStep('done'); if(account) awardXP(account.address, 'mint', `Minted: ${name}`) }
    catch(e) { console.error(e); setStep('details') } finally { setMinting(false) }
  }

  const reset = () => { setStep('upload'); setFile(null); setPreview(null); setBlobId(null); setMediaUrl(null); setName(''); setDesc(''); setRoyalty(5); setTxDigest(null) }

  const steps = [
    { key:'upload',  label:'Upload' },
    { key:'details', label:'Details' },
    { key:'minting', label:'Mint' },
    { key:'done',    label:'Done' },
  ]
  const stepIdx = steps.findIndex(st => st.key === step)

  if(!account) return (
    <main className={s.page}><div className="container">
      <div className={s.connectBox}>
        <div className={s.connectMark}>T</div>
        <p className={s.connectTitle}>Connect to mint</p>
        <p className="text-2 text-sm" style={{ textAlign:'center', fontWeight:300, lineHeight:1.8 }}>You need a Sui wallet to mint NFTs on Tuskr.</p>
        <ConnectButton />
      </div>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className={s.inner}>
        <div className={s.header}>
          <h1 className={s.title}>Mint an NFT</h1>
          <p className={s.sub}>Media stored on Walrus · Ownership on Sui</p>
        </div>

        <div className={s.steps}>
          {steps.map((st, i) => (
            <div key={st.key} className={`${s.pill} ${step===st.key?s.pillActive:''} ${i<stepIdx?s.pillDone:''}`}>
              <div className={s.pillNum}>{i<stepIdx?'✓':i+1}</div>
              <span className={s.pillLabel}>{st.label}</span>
            </div>
          ))}
        </div>

        <div className={s.card}>
          {step==='upload' && (
            <div className="col gap-16">
              <div
                className={`${s.drop} ${dragging?s.dragging:''}`}
                onDrop={onDrop}
                onDragOver={e=>{e.preventDefault();setDragging(true)}}
                onDragLeave={()=>setDragging(false)}
                onClick={()=>document.getElementById('fi')?.click()}
              >
                {preview ? <img src={preview} alt="" className={s.preview} /> : (
                  <div className={s.dropInner}>
                    <div className={s.dropIcon}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className={s.dropTitle}>Drop your file here</p>
                    <p className={s.dropSub}>PNG · JPG · GIF · MP4 · up to 10MB</p>
                  </div>
                )}
                <input id="fi" type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} />
              </div>
              {wErr && <p className={s.err}>{wErr}</p>}
              <div className={s.walrusBanner}>
                <span className="tag tag-a">WALRUS</span>
                <span>Your file will be stored as a permanent, verifiable blob on Walrus decentralized storage</span>
              </div>
              <button className="btn btn-primary btn-lg" onClick={upload} disabled={!file||uploading} style={{width:'100%',justifyContent:'center'}}>
                {uploading?'Uploading to Walrus…':'Upload to Walrus'}
              </button>
            </div>
          )}

          {step==='details' && (
            <div className={s.detailGrid}>
              <div>
                {preview && <img src={preview} alt="" className={s.previewImg} />}
                {blobId && <div className={s.blobChip}><span className="tag tag-a" style={{fontSize:9}}>BLOB</span><span className="truncate">{blobId.slice(0,22)}…</span></div>}
              </div>
              <div className={s.fields}>
                <div><label className={s.fieldLabel}>NFT Name *</label><input className="input" placeholder="e.g. Arctic Phantom #001" value={name} onChange={e=>setName(e.target.value)} maxLength={64} /></div>
                <div><label className={s.fieldLabel}>Description</label><textarea className="textarea input" placeholder="The story behind this NFT…" value={desc} onChange={e=>setDesc(e.target.value)} rows={4} /></div>
                <div>
                  <label className={s.fieldLabel}>Creator royalty: <strong style={{color:'var(--a)'}}>{royalty}%</strong></label>
                  <input type="range" min={0} max={15} step={1} value={royalty} onChange={e=>setRoyalty(+e.target.value)} className={s.slider} />
                  <div className={s.sliderRow}><span>0%</span><span>15%</span></div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={mint} disabled={!name||minting} style={{width:'100%',justifyContent:'center'}}>
                  Mint NFT on Sui
                </button>
              </div>
            </div>
          )}

          {step==='minting' && (
            <div className={s.doneBox}>
              <div className={s.doneIcon} style={{background:'var(--a-bg)',borderColor:'var(--a-bdr)',color:'var(--a)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <p className={s.doneTitle}>Minting…</p>
              <p className={s.doneSub}>Confirm the transaction in your wallet</p>
            </div>
          )}

          {step==='done' && (
            <div className={s.doneBox}>
              <div className={s.doneIcon}>✓</div>
              <p className={s.doneTitle}>NFT minted.</p>
              <p className={s.doneSub}>Your NFT is live on Sui with media permanently on Walrus.</p>
              {txDigest && <a href={`https://suiexplorer.com/txblock/${txDigest}?network=testnet`} target="_blank" rel="noreferrer" className="btn btn-ghost">View on Sui Explorer ↗</a>}
              <button className="btn btn-primary" onClick={reset}>Mint another</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
