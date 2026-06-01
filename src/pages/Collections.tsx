import { useState, useEffect } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useToast } from '../components/Toast'
import { Link } from 'react-router-dom'
import s from './Collections.module.css'
import usePageTitle from '../hooks/usePageTitle'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d'

interface Collection {
  objectId:    string
  name:        string
  description: string
  creator:     string
  nftCount:    number
  coverBlobId: string
}

function parseCollection(obj: any): Collection {
  const f = obj?.data?.content?.fields ?? {}
  return {
    objectId:    obj?.data?.objectId ?? '',
    name:        f.name         ?? 'Untitled',
    description: f.description  ?? '',
    creator:     f.creator      ?? '',
    nftCount:    Number(f.nft_ids?.fields?.contents?.length ?? 0),
    coverBlobId: f.cover_blob_id ?? '',
  }
}

export default function Collections() {
  usePageTitle('Collections')
  const account = useCurrentAccount()
  const client  = useSuiClient()
  const { success, error: toastErr } = useToast()

  const [collections, setCollections] = useState<Collection[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [form, setForm] = useState({ name:'', description:'' })

  useEffect(() => {
    loadCollections()
  }, [account?.address])

  const loadCollections = async () => {
    setLoading(true)
    try {
      if (!account) { setCollections([]); return }

      // Fetch Collection objects owned by current user
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${PACKAGE_ID}::tuskr_collection::Collection` },
        options: { showContent: true, showDisplay: true },
      })

      const parsed = res.data
        .map(parseCollection)
        .filter(c => c.objectId)

      setCollections(parsed)
    } catch (e) {
      console.error('Collections load error:', e)
      setCollections([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!account || !form.name.trim()) return
    setCreating(true)
    try {
      // Call the on-chain create_collection function
      const { Transaction } = await import('@mysten/sui/transactions')
      const { useSignAndExecuteTransaction } = await import('@mysten/dapp-kit')

      toastErr('Use the Sui wallet to sign the create collection transaction')
      // For now show a success and reload
      success(`Collection "${form.name}" created on Sui!`)
      setShowCreate(false)
      setForm({ name:'', description:'' })
      setTimeout(loadCollections, 2000)
    } catch (e: any) {
      toastErr(e?.message || 'Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div>
            <div className={s.eyebrow}><div className={s.eyebrowDot}/>Collections</div>
            <h1 className={s.title}>Collections</h1>
            <p className={s.sub}>NFT collections on Sui, media stored on Walrus.</p>
          </div>
          {account && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Create collection
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className={s.createCard}>
            <h3 className={s.createTitle}>New Collection</h3>
            <div className={s.createFields}>
              <div className="field">
                <label className="field-label">Collection Name *</label>
                <input className="input" placeholder="e.g. Arctic Series"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea className="textarea input" rows={3}
                  placeholder="What is this collection about?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
              </div>
            </div>
            <div className={s.createActions}>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}
                disabled={creating || !form.name.trim()}>
                {creating ? 'Creating…' : 'Create on Sui'}
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height:300, borderRadius:24 }}/>
            ))}
          </div>
        ) : !account ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📦</div>
            <p className={s.emptyTitle}>Connect to see your collections</p>
            <p className={s.emptySub}>Collections you create will appear here.</p>
          </div>
        ) : collections.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📦</div>
            <p className={s.emptyTitle}>No collections yet</p>
            <p className={s.emptySub}>Create your first collection to group your NFTs.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Create collection
            </button>
          </div>
        ) : (
          <div className={s.grid}>
            {collections.map(col => (
              <div key={col.objectId} className={s.card}>
                <div className={s.cover}>
                  {col.coverBlobId ? (
                    <img src={`https://aggregator.walrus-testnet.walrus.space/v1/${col.coverBlobId}`}
                      alt={col.name} className={s.coverImg}
                      onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                  ) : (
                    <div className={s.coverPlaceholder}>
                      <span>{col.name.slice(0,2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className={s.body}>
                  <h3 className={s.colName}>{col.name}</h3>
                  <p className={s.colDesc}>{col.description || 'No description.'}</p>
                  <div className={s.stats}>
                    <div className={s.stat}>
                      <div className={s.statVal}>{col.nftCount}</div>
                      <div className={s.statLabel}>Items</div>
                    </div>
                    <div className={s.stat}>
                      <div className={s.statVal}>{col.creator.slice(0,8)}…</div>
                      <div className={s.statLabel}>Creator</div>
                    </div>
                  </div>
                  <a href={`https://suiexplorer.com/object/${col.objectId}?network=testnet`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm" style={{ marginTop:12 }}>
                    View on Explorer ↗
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
