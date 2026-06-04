import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSuiCollections, type TPCollection } from '../hooks/useTradeport'
import s from './Collections.module.css'
import usePageTitle from '../hooks/usePageTitle'

const SUI_USD = 3.8 // approximate — replace with live feed later

function fmt(n: number | null, decimals = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtUSD(sui: number | null) {
  if (sui == null) return '—'
  const usd = sui * SUI_USD
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(0)}`
}

function CollectionImg({ src, alt }: { src: string | null; alt: string }) {
  const [err, setErr] = useState(false)
  const initials = alt.slice(0, 2).toUpperCase()
  if (!src || err) return (
    <div className={s.colImgFallback}>{initials}</div>
  )
  return <img src={src} alt={alt} className={s.colImg} onError={() => setErr(true)}/>
}

type SortKey = 'volume' | 'floor' | 'num_owners' | 'supply'

export default function Collections() {
  usePageTitle('NFT Collections')

  const [cols,    setCols]    = useState<TPCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [sortBy,  setSortBy]  = useState<SortKey>('volume')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetchSuiCollections(60)
      .then(setCols)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...cols]
    .filter(c => !search || c.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = (a as any)[sortBy] ?? -1
      const bv = (b as any)[sortBy] ?? -1
      return bv - av
    })

  const totalVol = cols.reduce((s, c) => s + (c.volume ?? 0), 0)

  return (
    <main className={s.page}>
      <div className="container">

        {/* Header */}
        <div className={s.pageHead}>
          <div className={s.eyebrow}><span className={s.eyeDot}/>NFT Collections</div>
          <div className={s.headRow}>
            <div>
              <h1 className={s.title}>Sui NFT Collections</h1>
              <p className={s.sub}>
                {loading ? 'Loading...' : `${cols.length} collections · `}
                <span className={s.subStat}>{fmt(totalVol, 0)} SUI</span> total volume
              </p>
            </div>
            <Link to="/mint" className={s.createBtn}>+ Create Collection</Link>
          </div>
        </div>

        {/* Search + sort */}
        <div className={s.controls}>
          <div className={s.searchWrap}>
            <svg className={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className={s.searchInput}
              placeholder="Search collections..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={s.sortBtns}>
            {([['volume','Volume'],['floor','Floor'],['num_owners','Holders']] as [SortKey,string][]).map(([k,l]) => (
              <button key={k} className={`${s.sortBtn} ${sortBy===k ? s.sortBtnActive : ''}`} onClick={() => setSortBy(k)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={s.errorBox}>
            <strong>API Error:</strong> {error}. Check VITE_INDEXER_API_KEY in Vercel.
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className={s.skelTable}>
            {[...Array(8)].map((_,i) => <div key={i} className={s.skelRow}/>)}
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.thRank}>#</th>
                  <th className={s.thName}>Collection</th>
                  <th className={s.thNum} onClick={() => setSortBy('floor')} style={{cursor:'pointer'}}>
                    Floor {sortBy==='floor' && '▼'}
                  </th>
                  <th className={s.thNum} onClick={() => setSortBy('volume')} style={{cursor:'pointer'}}>
                    Volume {sortBy==='volume' && '▼'}
                  </th>
                  <th className={s.thNum}>Supply</th>
                  <th className={s.thNum} onClick={() => setSortBy('num_owners')} style={{cursor:'pointer'}}>
                    Holders {sortBy==='num_owners' && '▼'}
                  </th>
                  <th className={s.thNum}>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((col, idx) => (
                  <tr key={col.id} className={s.row}>
                    <td className={s.tdRank}>{idx + 1}</td>
                    <td className={s.tdName}>
                      <Link to={`/collections/${col.slug}`} className={s.colLink}>
                        <CollectionImg src={col.cover_url} alt={col.title || '?'}/>
                        <div className={s.colInfo}>
                          <span className={s.colTitle}>{col.title || col.slug}</span>
                          {col.verified && <span className={s.verifiedBadge}>✓</span>}
                        </div>
                      </Link>
                    </td>
                    <td className={s.tdNum}>
                      {col.floor != null
                        ? <span className={s.floor}>{fmt(col.floor, 2)} <span className={s.sui}>SUI</span></span>
                        : <span className={s.dim}>—</span>}
                    </td>
                    <td className={s.tdNum}>
                      {col.volume != null
                        ? <span>{fmt(col.volume, 0)} <span className={s.sui}>SUI</span></span>
                        : <span className={s.dim}>—</span>}
                    </td>
                    <td className={s.tdNum}><span className={s.dim}>{col.supply?.toLocaleString() ?? '—'}</span></td>
                    <td className={s.tdNum}><span>{col.num_owners?.toLocaleString() ?? '—'}</span></td>
                    <td className={s.tdNum}>
                      <span className={s.mcap}>{fmtUSD(col.floor && col.supply ? col.floor * col.supply : null)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && !loading && (
              <div className={s.emptyTable}>No collections found{search ? ` for "${search}"` : ''}.</div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
