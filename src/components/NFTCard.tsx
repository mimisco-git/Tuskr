import { Link } from 'react-router-dom'
import LazyImage from './LazyImage'
import s from './NFTCard.module.css'
import { scoreFromName } from '../lib/rarity'

export interface NFT {
  id: string; name: string; image: string; price: string; currency: string
  creator: string; listed: boolean; blobId?: string
}

interface Props { nft: NFT; delay?: number; onBuy?: (nft: NFT) => void }

export default function NFTCard({ nft, delay = 0, onBuy }: Props) {
  return (
    <div className={s.card} style={{ animationDelay: `${delay}s` }}>
      <Link to={`/nft/${nft.id}`} className={s.imgWrap}>
        <LazyImage src={nft.image} alt={nft.name} className={s.lazyImg} />
        <div className={s.overlay} />
        {nft.blobId && <span className={s.walrusBadge}>WALRUS</span>}
        {nft.listed && onBuy && (
          <button
            className={`btn btn-primary btn-sm ${s.quickBuy}`}
            onClick={e => { e.preventDefault(); onBuy(nft) }}
          >
            Buy now
          </button>
        )}
      </Link>
      <div className={s.body}>
        <p className={s.creator}>@{nft.creator}</p>
        <Link to={`/nft/${nft.id}`} className={s.name}>{nft.name}</Link>
        <div className={s.footer}>
          <div>
            <p className={s.priceLabel}>Price</p>
            <p className={s.price}>{nft.price}<span className={s.priceSuf}>{nft.currency}</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
