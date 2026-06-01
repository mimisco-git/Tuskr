import { useState, useCallback } from 'react'
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit'
import { useWalrus } from '../hooks/useWalrus'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import s from './BatchMint.module.css'
import usePageTitle from '../hooks/usePageTitle'

interface FileItem {
  id: string
  file: File
  preview: string
  name: string
  status: 'pending' | 'uploading' | 'minting' | 'done' | 'error'
  blobId?: string
  txDigest?: string
}

export default function BatchMint() {
  usePageTitle('Batch Mint')
  const account = useCurrentAccount()
  const { uploadBlob } = useWalrus()
  const { mintNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { success, error: toastErr, toast } = useToast()
  const [items, setItems] = useState<FileItem[]>([])
  const [running, setRunning] = useState(false)
  const [royalty, setRoyalty] = useState(5)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: FileItem[] = Array.from(files).map(file => ({
      id:      Date.now().toString() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      name:    file.name.replace(/\.[^/.]+$/, ''),
      status:  'pending',
    }))
    setItems(p => [...p, ...newItems].slice(0, 20))
  }, [])

  const updateItem = (id: string, patch: Partial<FileItem>) =>
    setItems(p => p.map(it => it.id === id ? { ...it, ...patch } : it))

  const removeItem = (id: string) =>
    setItems(p => p.filter(it => it.id !== id))

  const runBatch = async () => {
    if (!account || items.length === 0) return
    setRunning(true)
    toast(`Batch minting ${items.length} NFTs...`, 'loading')

    for (const item of items.filter(i => i.status === 'pending')) {
      // Upload to Walrus
      updateItem(item.id, { status: 'uploading' })
      const uploaded = await uploadBlob(item.file)
      if (!uploaded) { updateItem(item.id, { status: 'error' }); continue }

      // Mint on Sui
      updateItem(item.id, { status: 'minting', blobId: uploaded.blobId })
      try {
        const result = await mintNFT({
          name:        item.name,
          description: `Batch minted NFT: media stored on Walrus`,
          blobId:      uploaded.blobId,
          mediaUrl:    uploaded.mediaUrl,
          royaltyBps:  royalty * 100,
        })
        updateItem(item.id, { status: 'done', txDigest: result.digest })
      } catch {
        updateItem(item.id, { status: 'error' })
      }
    }

    success(`Batch mint complete!`)
    if(account) awardXP(account.address, items.length >= 5 ? 'batch_mint' : 'mint', `Batch minted ${items.length} NFTs`)
    setRunning(false)
  }

  const doneCt  = items.filter(i => i.status === 'done').length
  const errCt   = items.filter(i => i.status === 'error').length
  const pending = items.filter(i => i.status === 'pending').length

  if (!account) return (
    <main className={s.page}><div className="container">
      <div className={s.connectBox}>
        <p className={s.connectTitle}>Connect to batch mint</p>
        <ConnectButton />
      </div>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div>
            <h1 className={s.title}>Batch Mint</h1>
            <p className={s.sub}>Upload multiple files. One Sui PTB mints them all.</p>
          </div>
          <div className={s.headerRight}>
            <div className="field" style={{ minWidth:180 }}>
              <label className="field-label">Royalty: <strong style={{ color:'var(--a)' }}>{royalty}%</strong></label>
              <input type="range" min={0} max={15} value={royalty} onChange={e => setRoyalty(+e.target.value)} style={{ width:'100%', accentColor:'var(--a)' }} />
            </div>
          </div>
        </div>

        <div
          className={s.dropzone}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => document.getElementById('batch-file')?.click()}
        >
          <p className={s.dropIcon}>↑</p>
          <p className={s.dropTitle}>Drop up to 20 files here</p>
          <p className={s.dropSub}>PNG, JPG, GIF, MP4 · Each will be uploaded to Walrus and minted on Sui</p>
          <input id="batch-file" type="file" accept="image/*,video/*" multiple style={{ display:'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)} />
        </div>

        {items.length > 0 && (
          <>
            <div className={s.statsRow}>
              <span className={s.statChip}>{items.length} total</span>
              {pending > 0 && <span className={s.statChip}>{pending} pending</span>}
              {doneCt > 0  && <span className={`${s.statChip} ${s.chipDone}`}>{doneCt} done</span>}
              {errCt > 0   && <span className={`${s.statChip} ${s.chipErr}`}>{errCt} errors</span>}
            </div>

            <div className={s.grid}>
              {items.map(item => (
                <div key={item.id} className={s.card}>
                  <div className={s.imgWrap}>
                    <img src={item.preview} alt={item.name} className={s.img} />
                    <div className={`${s.statusOverlay} ${s[item.status]}`}>
                      {item.status === 'uploading' && '↑ Walrus'}
                      {item.status === 'minting'   && '⟳ Sui'}
                      {item.status === 'done'       && '✓'}
                      {item.status === 'error'      && '✗'}
                    </div>
                  </div>
                  <div className={s.cardBody}>
                    <input
                      className={s.nameInput}
                      value={item.name}
                      onChange={e => updateItem(item.id, { name: e.target.value })}
                      disabled={item.status !== 'pending'}
                    />
                    {item.txDigest && (
                      <a href={`https://suiexplorer.com/txblock/${item.txDigest}?network=testnet`} target="_blank" rel="noreferrer" className={s.txLink}>
                        Explorer ↗
                      </a>
                    )}
                    {item.status === 'pending' && (
                      <button className={s.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={s.footer}>
              <button className="btn btn-primary btn-lg" onClick={runBatch} disabled={running || pending === 0}>
                {running ? `Minting... (${doneCt}/${items.length})` : `Mint ${pending} NFTs with PTB`}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setItems([])}>Clear all</button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
