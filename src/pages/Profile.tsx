import { useEffect, useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useXP } from '../hooks/useXP'
import { Link } from 'react-router-dom'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { SuiObjectData } from '@mysten/sui/client'
import s from './Profile.module.css'
import usePageTitle from '../hooks/usePageTitle'

/* Parse a raw Sui object into a usable NFT shape */
interface ParsedNFT {
  objectId:    string
  name:        string
  description: string
  mediaUrl:    string
  blobId:      string
  creator:     string
  royaltyBps:  number
}

function parseNFT(obj: SuiObjectData): ParsedNFT {
  const fields = (obj.content as any)?.fields ?? {}
  const display = (obj.display as any)?.data ?? {}
  return {
    objectId:   obj.objectId,
    name:       fields.name        || display.name       || 'Tuskr NFT',
    description:fields.description || display.description || '',
    mediaUrl:   fields.media_url   || display.image_url  || '',
    blobId:     fields.blob_id     || '',
    creator:    fields.creator     || '',
    royaltyBps: Number(fields.royalty_bps ?? 0),
  }
}

export default function Profile() {
  usePageTitle('My NFTs')
  const account = useCurrentAccount()
  const { awardXP } = useXP(account?.address)
  const { fetchOwnedNFTs } = useNFTMarketplace()
  const [nfts, setNfts] = useState<ParsedNFT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!account) { setLoading(false); return }
    fetchOwnedNFTs(account.address)
      .then(raw => setNfts(raw.map(parseNFT)))
      .catch(() => setNfts([]))
      .finally(() => setLoading(false))
  }, [account?.address])

  // Hold bonus XP
  useEffect(() => {
    if (!account || !nfts.length) return
    const lastKey = `tuskr_hold_${account.address}`
    const today = new Date().toDateString()
    if (localStorage.getItem(lastKey) !== today) {
      localStorage.setItem(lastKey, today)
      nfts.forEach(n => awardXP(account.address, 'hold_bonus', `Holding: ${n.name}`))
    }
  }, [nfts.length, account?.address])

  if (!account) return (
    <main className={s.page}><div className="container">
      <div className={s.empty}>
        <div className={s.emptyIcon}>🎨</div>
        <p className={s.emptyTitle}>Connect your wallet</p>
        <p className={s.emptyDesc}>Connect to view your NFT collection.</p>
        <Link to="/marketplace" className="btn btn-outline">Browse marketplace</Link>
      </div>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className="container">
        {/* Header */}
        <div className={s.header}>
          <div className={s.avatar}>{account.address.slice(2,4).toUpperCase()}</div>
          <div>
            <div className={s.eyebrow}><div className={s.eyebrowDot}/>My Collection</div>
            <h1 className={s.title}>{nfts.length} NFT{nfts.length !== 1 ? 's' : ''}</h1>
            <p className={s.address}>{account.address.slice(0,10)}…{account.address.slice(-8)}</p>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
            <Link to="/mint" className="btn btn-primary">+ Mint NFT</Link>
            <Link to="/list" className="btn btn-ghost">List for sale</Link>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio:'1', borderRadius:20 }}/>
            ))}
          </div>
        ) : nfts.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>🎨</div>
            <p className={s.emptyTitle}>No NFTs yet.</p>
            <p className={s.emptyDesc}>Mint your first NFT or explore the marketplace.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
              <Link to="/marketplace" className="btn btn-ghost">Browse</Link>
            </div>
          </div>
        ) : (
          <div className={s.grid}>
            {nfts.map(nft => (
              <Link to={`/nft/${nft.objectId}`} key={nft.objectId} className={s.card}>
                <div className={s.imgWrap}>
                  {nft.mediaUrl ? (
                    <img
                      src={nft.mediaUrl}
                      alt={nft.name}
                      className={s.img}
                      onError={e => { (e.target as HTMLImageElement).style.display='none' }}
                    />
                  ) : (
                    <div className={s.imgPlaceholder}>
                      <span>{nft.name.slice(0,2).toUpperCase()}</span>
                    </div>
                  )}
                  {nft.blobId && (
                    <div className={s.walrusBadge}>WALRUS</div>
                  )}
                </div>
                <div className={s.cardBody}>
                  <p className={s.cardName}>{nft.name}</p>
                  {nft.description && (
                    <p className={s.cardDesc}>{nft.description.slice(0, 60)}{nft.description.length > 60 ? '…' : ''}</p>
                  )}
                  <div className={s.cardMeta}>
                    <span className={s.cardCreator}>by {nft.creator.slice(0,8)}…</span>
                    {nft.royaltyBps > 0 && (
                      <span className={s.cardRoyalty}>{nft.royaltyBps / 100}% royalty</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
