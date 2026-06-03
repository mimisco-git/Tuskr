import { useState, useCallback } from 'react'
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit'
import { useWalrus } from '../hooks/useWalrus'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import { useNetwork } from '../hooks/useNetwork'
import s from './BatchMint.module.css'
import usePageTitle from '../hooks/usePageTitle'

type Status = 'pending' | 'uploading' | 'minting' | 'done' | 'error'

interface FileItem {
  id: string; file: File; preview: string; name: string
  status: Status; blobId?: string; txDigest?: string; errorMsg?: string
}

const STATUS_LABEL: Record<Status, string> = {
  pending:   'Ready',
  uploading: 'Uploading to Walrus...',
  minting:   'Minting on Sui...',
  done:      'Minted',
  error:     'Failed',
}

export default function BatchMint() {
  usePageTitle('Batch Mint')
  const account = useCurrentAccount()
  const { network } = useNetwork()
  const { uploadBlob } = useWalrus()
  const { mintNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { success, error: toastErr } = useToast()

  const [items,   setItems]   = useState<FileItem[]>([])
  const [running, setRunning] = useState(false)
  const [royalty, setRoyalty] = useState(5)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming: FileItem[] = Array.from(files).map(file => ({
      id:      `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      name:    file.name.replace(/\.[^/.]+$/, ''),
      status:  'pending' as Status,
    }))
    setItems(prev => [...prev, ...incoming].slice(0, 20))
  }, [])

  const update = (id: string, patch: Partial<FileItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const remove = (id: string) =>
    setItems(prev => prev.filter(it => it.id !== id))

  const runBatch = async () => {
    if (!account || pending.length === 0) return
    setRunning(true)

    for (const item of pending) {
      update(item.id, { status: 'uploading' })
      const uploaded = await uploadBlob(item.file)
      if (!uploaded) {
        update(item.id, { status: 'error', errorMsg: 'Walrus upload failed' })
        continue
      }
      update(item.id, { status: 'minting', blobId: uploaded.blobId })
      try {
        const r = await mintNFT({
          name:        item.name,
          description: `Minted via Tuskr batch. Media stored on Walrus.`,
          blobId:      uploaded.blobId,
          mediaUrl:    uploaded.mediaUrl,
          royaltyBps:  royalty * 100,
        })
        update(item.id, { status: 'done', txDigest: r.digest })
      } catch (e: any) {
        update(item.id, { status: 'error', errorMsg: e?.message?.slice(0, 80) })
      }
    }

    const doneCount = items.filter(i => i.status === 'done').length + pending.length
    success(`Batch complete. ${doneCount} NFTs minted.`)
    if (account) awardXP(account.address, doneCount >= 5 ? 'batch_mint' : 'mint', `Batch: ${doneCount} NFTs`)
    setRunning(false)
  }

  const pending  = items.filter(i => i.status === 'pending')
  const doneList = items.filter(i => i.status === 'done')
  const errList  = items.filter(i => i.status === 'error')
  const progress = items.length > 0 ? Math.round((doneList.length / items.length) * 100) : 0

  if (!account) return (
    <main className={s.page}>
      <div className={s.inner}>
        <div className={s.gate}>
          <div className={s.gateIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <h2 className={s.gateTitle}>Connect to batch mint</h2>
          <p className={s.gateSub}>Connect a Sui wallet to upload and mint multiple NFTs in one session.</p>
          <ConnectButton/>
        </div>
      </div>
    </main>
  )

  return (
    <main className={s.page}>
      <div className={s.inner}>

        {/* Header */}
        <div className={s.pageHead}>
          <div className={s.eyebrow}><span className={s.eyeDot}/>Batch Mint</div>
          <h1 className={s.pageTitle}>Mint multiple NFTs</h1>
          <p className={s.pageSub}>
            Upload up to 20 files. Each is uploaded to Walrus then minted on Sui.
            <br/>Name each one individually before starting.
          </p>
        </div>

        {/* Settings bar */}
        <div className={s.settingsBar}>
          <div className={s.royaltyControl}>
            <div className={s.royaltyLabelRow}>
              <span className={s.royaltyLabel}>Creator royalty</span>
              <span className={s.royaltyValue}>{royalty}%</span>
            </div>
            <input
              type="range" min={0} max={15} step={1}
              value={royalty}
              onChange={e => setRoyalty(Number(e.target.value))}
              className={s.slider}
            />
            <div className={s.sliderTicks}><span>0%</span><span>15%</span></div>
          </div>
          <div className={s.settingsStat}>
            <span className={s.settingsStatNum}>{items.length}</span>
            <span className={s.settingsStatLbl}>files added</span>
          </div>
          <div className={s.settingsStat}>
            <span className={`${s.settingsStatNum} ${s.numGreen}`}>{doneList.length}</span>
            <span className={s.settingsStatLbl}>minted</span>
          </div>
          {errList.length > 0 && (
            <div className={s.settingsStat}>
              <span className={`${s.settingsStatNum} ${s.numRed}`}>{errList.length}</span>
              <span className={s.settingsStatLbl}>errors</span>
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={`${s.dropZone} ${dragging ? s.dropZoneDrag : ''}`}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById('batchFile')?.click()}
        >
          <div className={s.dropIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className={s.dropTitle}>
            {items.length === 0 ? 'Drop files here or click to browse' : `Add more files (${items.length}/20)`}
          </p>
          <p className={s.dropSub}>PNG, JPG, GIF, MP4, SVG up to 10 MB each</p>
          <input
            id="batchFile" type="file" multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Items grid */}
        {items.length > 0 && (
          <>
            {/* Progress bar when running */}
            {running && (
              <div className={s.progressWrap}>
                <div className={s.progressHeader}>
                  <span className={s.progressLabel}>Minting in progress</span>
                  <span className={s.progressPct}>{doneList.length}/{items.length}</span>
                </div>
                <div className={s.progressTrack}>
                  <div className={s.progressFill} style={{ width: `${progress}%` }}/>
                </div>
              </div>
            )}

            <div className={s.grid}>
              {items.map(item => (
                <div key={item.id} className={`${s.card} ${s[`card_${item.status}`]}`}>
                  {/* Preview */}
                  <div className={s.cardImg}>
                    <img src={item.preview} alt={item.name}/>
                    {/* Status overlay */}
                    <div className={`${s.statusOverlay} ${item.status !== 'pending' ? s.statusOverlayVisible : ''}`}>
                      {item.status === 'uploading' && (
                        <div className={s.statusContent}>
                          <span className={s.statusSpinner}/>
                          <span>Walrus</span>
                        </div>
                      )}
                      {item.status === 'minting' && (
                        <div className={s.statusContent}>
                          <span className={s.statusSpinner}/>
                          <span>Sui</span>
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div className={`${s.statusContent} ${s.statusDone}`}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className={`${s.statusContent} ${s.statusError}`}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    {item.status === 'pending' && (
                      <button className={s.removeBtn} onClick={() => remove(item.id)} title="Remove">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Name input */}
                  <div className={s.cardBody}>
                    <input
                      className={s.nameInput}
                      value={item.name}
                      placeholder="NFT name..."
                      onChange={e => update(item.id, { name: e.target.value })}
                      disabled={item.status !== 'pending'}
                    />
                    <div className={s.cardStatus}>
                      <span className={`${s.statusDot} ${s[`dot_${item.status}`]}`}/>
                      <span className={s.statusText}>{STATUS_LABEL[item.status]}</span>
                    </div>
                    {item.txDigest && (
                      <a
                        href={`${network.explorerBase}/${item.txDigest}`}
                        target="_blank" rel="noreferrer"
                        className={s.txLink}
                      >
                        View on explorer &rarr;
                      </a>
                    )}
                    {item.errorMsg && (
                      <p className={s.errorMsg}>{item.errorMsg}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className={s.footer}>
              <div className={s.footerLeft}>
                <button
                  className={s.clearBtn}
                  onClick={() => setItems([])}
                  disabled={running}
                >
                  Clear all
                </button>
              </div>
              <div className={s.footerRight}>
                <div className={s.walrusPill}>
                  <span className={s.eyeDot}/>
                  <span>Walrus storage</span>
                </div>
                <button
                  className={s.mintAllBtn}
                  onClick={runBatch}
                  disabled={running || pending.length === 0}
                >
                  {running
                    ? <><span className={s.spinner}/>Minting {doneList.length + 1} of {items.length}...</>
                    : `Mint ${pending.length} NFT${pending.length !== 1 ? 's' : ''} on Sui`
                  }
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
