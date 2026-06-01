import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useWalrus } from '../hooks/useWalrus'
import { useToast } from '../components/Toast'
import s from './Collections.module.css'
import usePageTitle from '../hooks/usePageTitle'

const MOCK_COLLECTIONS = [
  { id:'1', name:'Arctic Series',    cover:`https://picsum.photos/seed/col1/400/400`, creator:'whytetycon',  count:12, floor:'6.5',  volume:'84.0',  desc:'Frozen landscapes from the digital frontier.' },
  { id:'2', name:'Ocean Depths',     cover:`https://picsum.photos/seed/col2/400/400`, creator:'sir_mimisco', count:8,  floor:'8.0',  volume:'62.5',  desc:'The mystery of what lies beneath.' },
  { id:'3', name:'Tusk Originals',   cover:`https://picsum.photos/seed/col3/400/400`, creator:'whytetycon',  count:5,  floor:'18.0', volume:'110.0', desc:'Genesis collection from the Tuskr founders.' },
  { id:'4', name:'Pixel Walruses',   cover:`https://picsum.photos/seed/col4/400/400`, creator:'sir_mimisco', count:24, floor:'3.0',  volume:'42.0',  desc:'8-bit walruses exploring the Sui ecosystem.' },
]

export default function Collections() {
  usePageTitle('Collections')
  const account = useCurrentAccount()
  const { uploadBlob, uploading } = useWalrus()
  const { success, error: toastError } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name:'', description:'', royalty:5 })
  const [coverFile, setCoverFile] = useState<File|null>(null)
  const [coverPreview, setCoverPreview] = useState<string|null>(null)

  const handleCreate = async () => {
    if (!form.name || !coverFile) return
    const uploaded = await uploadBlob(coverFile)
    if (!uploaded) { toastError('Cover upload failed'); return }
    success(`Collection "${form.name}" created!`)
    setShowCreate(false)
    setForm({ name:'', description:'', royalty:5 })
    setCoverFile(null); setCoverPreview(null)
  }

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div className={s.eyebrow}><div className={s.eyebrowDot}/>Collections</div>
          <div>
            <h1 className={s.title}>Collections</h1>
            <p className={s.sub}>Curated NFT collections on Sui, media stored on Walrus</p>
          </div>
          {account && (
            <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
              {showCreate ? '✕ Cancel' : '+ Create collection'}
            </button>
          )}
        </div>

        {showCreate && (
          <div className={s.createCard}>
            <p className={s.createTitle}>New collection</p>
            <div className={s.createGrid}>
              <div
                className={s.coverDrop}
                onClick={() => document.getElementById('cover-file')?.click()}
              >
                {coverPreview
                  ? <img src={coverPreview} alt="" className={s.coverPreview} />
                  : <div className={s.coverPlaceholder}>
                      <p style={{ fontSize:28, color:'var(--b-3)' }}>+</p>
                      <p style={{ fontSize:11, color:'var(--t-3)' }}>Cover image</p>
                    </div>
                }
                <input id="cover-file" type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]; if(!f) return
                    setCoverFile(f); setCoverPreview(URL.createObjectURL(f))
                  }} />
              </div>
              <div className={s.createFields}>
                <div className="field">
                  <label className="field-label">Collection name *</label>
                  <input className="input" placeholder="e.g. Arctic Series" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="textarea input" rows={3} placeholder="What is this collection about?" value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Royalty: <strong style={{ color:'var(--a)' }}>{form.royalty}%</strong></label>
                  <input type="range" min={0} max={15} value={form.royalty} onChange={e => setForm(f => ({ ...f, royalty:+e.target.value }))} style={{ width:'100%', accentColor:'var(--a)' }} />
                </div>
                <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name || !coverFile || uploading} style={{ alignSelf:'flex-start' }}>
                  {uploading ? 'Uploading cover...' : 'Deploy collection'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={s.grid}>
          {MOCK_COLLECTIONS.map((col, i) => (
            <Link key={col.id} to={`/collections/${col.id}`} className={s.card} style={{ animationDelay:`${i*0.06}s` }}>
              <div className={s.coverWrap}>
                <img src={col.cover} alt={col.name} className={s.cover} />
                <div className={s.coverOverlay} />
                <div className={s.coverFooter}>
                  <p className={s.colName}>{col.name}</p>
                  <p className={s.colCreator}>@{col.creator}</p>
                </div>
              </div>
              <div className={s.colBody}>
                <p className={s.colDesc}>{col.desc}</p>
                <div className={s.colStats}>
                  <div className={s.colStat}><p className={s.colStatVal}>{col.count}</p><p className={s.colStatLabel}>Items</p></div>
                  <div className={s.colStat}><p className={s.colStatVal}>{col.floor}</p><p className={s.colStatLabel}>Floor SUI</p></div>
                  <div className={s.colStat}><p className={s.colStatVal}>{col.volume}</p><p className={s.colStatLabel}>Vol SUI</p></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
