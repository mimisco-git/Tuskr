import { useState, useMemo } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import NFTCard, { NFT } from '../components/NFTCard'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import s from './Marketplace.module.css'
import usePageTitle from '../hooks/usePageTitle'

const CREATORS = ['whytetycon', 'sir_mimisco']
const NAMES    = ['Arctic Phantom','Deep Current','Tusk Genesis','Frozen Echo','Ocean Pulse','Ivory Wave','Polar Drift','Silent Surge','Tusk Reborn','Cold Bloom','Sea Shadow','Ice Relic']

const ALL_NFTS: NFT[] = Array.from({ length:12 }, (_,i) => ({
  id:       String(i+1),
  name:     `${NAMES[i]} #${String(i+1).padStart(3,'0')}`,
  image:    `https://picsum.photos/seed/tk${i+1}/400/400`,
  price:    ((i+1)*3.2+2).toFixed(1),
  currency: 'SUI',
  creator:  CREATORS[i % 2],
  listed:   true,
  blobId:   `blob-${i+1}`,
}))

type Sort = 'recent' | 'price-asc' | 'price-desc'

export default function Marketplace() {
  usePageTitle('Marketplace')
  const account = useCurrentAccount()
  const { bulkBuyNFTs, buyNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { success, error: toastErr, info } = useToast()

  const [sort,      setSort]      = useState<Sort>('recent')
  const [search,    setSearch]    = useState('')
  const [minPrice,  setMinPrice]  = useState('')
  const [maxPrice,  setMaxPrice]  = useState('')
  const [creator,   setCreator]   = useState('all')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)
  const [buying,    setBuying]    = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  const filtered = useMemo(() => {
    return ALL_NFTS
      .filter(n => {
        const q  = search.toLowerCase()
        const p  = +n.price
        const okSearch  = !q || n.name.toLowerCase().includes(q) || n.creator.includes(q)
        const okMin     = !minPrice || p >= +minPrice
        const okMax     = !maxPrice || p <= +maxPrice
        const okCreator = creator === 'all' || n.creator === creator
        return okSearch && okMin && okMax && okCreator
      })
      .sort((a,b) =>
        sort === 'price-asc'  ? +a.price - +b.price :
        sort === 'price-desc' ? +b.price - +a.price : 0
      )
  }, [search, minPrice, maxPrice, creator, sort])

  const total   = Array.from(selected).reduce((acc,id) => acc + +(ALL_NFTS.find(n=>n.id===id)?.price||0), 0)
  const toggle  = (id: string) => setSelected(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n })

  const bulkBuy = async () => {
    if (!account) return
    setBuying(true)
    try {
      await bulkBuyNFTs(Array.from(selected).map(id => ({
        id,
        price: BigInt(Math.floor(+(ALL_NFTS.find(n=>n.id===id)!.price) * 1e9))
      })))
      success(`Purchased ${selected.size} NFTs in one transaction!`)
      if (account) awardXP(account.address, 'buy', `Bulk buy: ${selected.size} NFTs`)
      setSelected(new Set())
    } catch { toastErr('Bulk buy failed') } finally { setBuying(false) }
  }

  const activeFilters = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (creator !== 'all' ? 1 : 0)

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div className={s.eyebrow}><div className={s.eyebrowDot}/>NFT Marketplace</div>
          <div>
            <h1 className={s.title}>Marketplace</h1>
            <p className={s.sub}>{filtered.length} NFTs · Media stored on Walrus</p>
          </div>
        </div>

        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <svg className={s.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className={`input ${s.search}`}
              placeholder="Search by name or creator..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className={`select ${s.sort}`} value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="recent">Recently listed</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
          </select>
          <button
            className={`btn btn-ghost ${activeFilters > 0 ? s.filterActive : ''}`}
            onClick={() => setShowFilter(v => !v)}
          >
            Filters {activeFilters > 0 && <span className={s.filterCount}>{activeFilters}</span>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className={s.filterPanel}>
            <div className={s.filterRow}>
              <div className={s.filterGroup}>
                <p className={s.filterLabel}>Creator</p>
                <select className="select" value={creator} onChange={e => setCreator(e.target.value)}>
                  <option value="all">All creators</option>
                  {CREATORS.map(c => <option key={c} value={c}>@{c}</option>)}
                </select>
              </div>
              <div className={s.filterGroup}>
                <p className={s.filterLabel}>Min price (SUI)</p>
                <input className="input" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} min="0" />
              </div>
              <div className={s.filterGroup}>
                <p className={s.filterLabel}>Max price (SUI)</p>
                <input className="input" type="number" placeholder="∞" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} min="0" />
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setMinPrice(''); setMaxPrice(''); setCreator('all') }}
                style={{ alignSelf:'flex-end' }}
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* Bulk buy bar */}
        {account && (
          <div className={s.bulkBar}>
            <p className={s.bulkInfo}>
              {selected.size === 0
                ? 'Select multiple NFTs to bulk-buy in one Sui PTB transaction'
                : `${selected.size} selected · ${total.toFixed(1)} SUI total`}
            </p>
            {selected.size > 0 && (
              <div className={s.bulkActions}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
                <button className="btn btn-primary btn-sm" onClick={bulkBuy} disabled={buying}>
                  {buying ? 'Processing...' : `Buy ${selected.size} NFTs (PTB)`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={s.grid}>
          {filtered.map((nft, i) => (
            <div key={nft.id} className={`${s.cardWrap} ${selected.has(nft.id) ? s.cardSelected : ''}`}>
              {account && (
                <button className={s.selectBtn} onClick={() => toggle(nft.id)}>
                  {selected.has(nft.id) ? '✓' : '+'}
                </button>
              )}
              <NFTCard nft={nft} delay={i * 0.04} onBuy={(nft) => { if(account) { buyNFT(nft.id, BigInt(Math.floor(+nft.price * 1e9))).then(() => { success(`Bought ${nft.name}!`); if(account) awardXP(account.address, "buy", `Bought: ${nft.name}`) }).catch(() => toastErr("Buy failed")) } }} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className={s.empty}>No NFTs match your filters.</p>
        )}
      </div>
    </main>
  )
}
