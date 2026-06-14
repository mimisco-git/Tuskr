import { useDeepBookPrice, suiToUsd } from '../hooks/useDeepBookPrice'
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
  const { price: suiPrice } = useDeepBookPrice()
  const usdStr = nft.price && nft.price !== '0'
    ? suiToUsd(Number(nft.price), suiPrice)
    : ''

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
            {usdStr && <p style={{ fontSize:11, color:'rgba(245,245,247,0.35)', margin:'-2px 0 0', fontFamily:'Space Mono,monospace' }}>{usdStr}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
