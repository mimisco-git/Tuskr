import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSuiCollections, type TPCollection } from '../hooks/useTradeport'
import NFTImage from '../components/NFTImage'
import s from './Collections.module.css'
import usePageTitle from '../hooks/usePageTitle'
import { useDeepBookPrice } from '../hooks/useDeepBookPrice'


function fmt(n: number | null, decimals = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtUSD(sui: number | null, suiPrice: number) {
  if (sui == null) return '—'
  const usd = sui * suiPrice
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(0)}`
}

// Uses NFTImage component

type SortKey = 'volume' | 'floor' | 'supply'

export default function Collections() {
  usePageTitle('NFT Collections')
  const { price: suiUSD } = useDeepBookPrice()

  const [cols,    setCols]    = useState<TPCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [sortBy,  setSortBy]  = useState<SortKey>('volume')
  const [search,  setSearch]  = useState('')
  const [tuskrCol, setTuskrCol] = useState<any>(null)

  useEffect(() => {
    // Fetch Tuskr Genesis collection from our own contract
    fetch('/api/collections?type=collection')
      .then(r => r.json())
      .then(setTuskrCol)
      .catch(() => {})

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
            <Link to="/collections/create" className={s.createBtn}>+ Create Collection</Link>
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
            {([['volume','Volume'],['floor','Floor']] as [SortKey,string][]).map(([k,l]) => (
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

        {/* Tuskr Genesis — our own on-chain collection */}
        {tuskrCol && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(99,102,241,0.06) 100%)',
            border: '1px solid rgba(0,212,170,0.25)',
            borderRadius: 20, padding: '20px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 14, flexShrink: 0,
              background: 'rgba(0,212,170,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>🐘</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{tuskrCol.name}</span>
                <span style={{ fontSize: 11, background: 'rgba(0,212,170,0.15)', color: '#00d4aa', borderRadius: 6, padding: '2px 8px', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>On-Chain</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.45)', margin: 0, lineHeight: 1.5 }}>{tuskrCol.description}</p>
              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                <div><span style={{ fontSize: 18, fontWeight: 700, color: '#00d4aa' }}>{tuskrCol.supply}</span><span style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', marginLeft: 5, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Space Mono,monospace' }}>Minted</span></div>
                <div><span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{tuskrCol.royaltyBps / 100}%</span><span style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', marginLeft: 5, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Space Mono,monospace' }}>Royalty</span></div>
                {tuskrCol.maxSupply > 0 && <div><span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{tuskrCol.maxSupply}</span><span style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', marginLeft: 5, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Space Mono,monospace' }}>Max Supply</span></div>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <a href={tuskrCol.suiscanUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)', color: '#00d4aa', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                View on Suiscan ↗
              </a>
              <Link to="/collections/genesis"
                style={{ padding: '8px 16px', borderRadius: 10, background: '#00d4aa', color: '#000', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Browse NFTs →
              </Link>
            </div>
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
<th className={s.thNum}>Holders</th>
                  <th className={s.thNum}>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((col, idx) => (
                  <tr key={col.id} className={s.row}>
                    <td className={s.tdRank}>{idx + 1}</td>
                    <td className={s.tdName}>
                      <Link to={`/collections/${col.slug}`} className={s.colLink}>
                        <NFTImage src={col.cover_url} alt={col.title || '?'}/>
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
                    <td className={s.tdNum}><span className={s.dim}>—</span></td>
                    <td className={s.tdNum}>
                      <span className={s.mcap}>{fmtUSD(col.floor && col.supply ? col.floor * col.supply : null, suiUSD || 0)}</span>
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
