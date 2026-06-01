import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useWatchlist } from '../hooks/useWatchlist'
import { useToast } from '../components/Toast'
import BlobVerifiedBadge from '../components/BlobVerifiedBadge'
import s from './NFTDetail.module.css'
import usePageTitle from '../hooks/usePageTitle'

const MOCK = {
  id:'1', name:'Arctic Phantom #001',
  image:'https://picsum.photos/seed/tk1/800/800',
  price:'12.5', currency:'SUI',
  creator:'whytetycon', listed:true,
  blobId:'abc123walrusblobidexamplelong',
  description:'A rare digital artifact from the arctic frontier, minted on Sui with media permanently stored on Walrus decentralized storage.',
  royalty:'5%', minted:'2026-05-24',
}

const PRICE_HISTORY = [
  { date:'May 10', price:6.0 },
  { date:'May 14', price:7.5 },
  { date:'May 17', price:9.0 },
  { date:'May 20', price:8.0 },
  { date:'May 23', price:11.0 },
  { date:'May 24', price:12.5 },
]

const CustomTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--b-2)', borderRadius:8, padding:'8px 12px' }}>
      <p style={{ fontFamily:'var(--f-disp)', fontSize:16, color:'var(--a)' }}>{payload[0].value} SUI</p>
    </div>
  )
}

export default function NFTDetail() {
  usePageTitle('NFT Details')
  const { id } = useParams()
  const account = useCurrentAccount()
  const { buyNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { isWatched, toggleWatch } = useWatchlist()
  const { success, error: toastErr } = useToast()
  const [showOffer, setShowOffer] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [buying, setBuying] = useState(false)
  const nft = MOCK
  const watched = isWatched(nft.id)

  const handleBuy = async () => {
    if (!account) return
    setBuying(true)
    try {
      const result = await buyNFT(nft.id, BigInt(Math.floor(+nft.price * 1e9)))
      success('NFT purchased!', result.digest)
      if(account) awardXP(account.address, 'buy', `Bought NFT`)
    } catch { toastErr('Purchase failed') } finally { setBuying(false) }
  }

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.topRow}>
          <Link to="/marketplace" className={s.back}>← Marketplace</Link>
          <button
            className={`${s.watchBtn} ${watched ? s.watchActive : ''}`}
            onClick={() => {
              toggleWatch({ id:nft.id, name:nft.name, image:nft.image, price:nft.price, currency:nft.currency, creator:nft.creator, listed:nft.listed, blobId:nft.blobId })
            }}
          >
            {watched ? '♥ Watching' : '♡ Watch'}
          </button>
        </div>

        <div className={s.layout}>
          <div className={s.imgCol}>
            <div className={s.imgWrap}>
              <img src={nft.image} alt={nft.name} className={s.img} />
              <div className={s.imgFooter}>
                <BlobVerifiedBadge blobId={nft.blobId} showDetails />
              </div>
            </div>
          </div>

          <div className={s.infoCol}>
            <p className={s.creator}>@{nft.creator.toUpperCase()}</p>
            <h1 className={s.name}>{nft.name}</h1>
            <p className={s.desc}>{nft.description}</p>

            <div className={s.priceCard}>
              <p className={s.priceLabel}>Current price</p>
              <p className={s.price}>{nft.price}<span className={s.priceUnit}>{nft.currency}</span></p>
              <div className={s.buyRow}>
                {nft.listed && (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleBuy}
                    disabled={!account || buying}
                    style={{ flex:1, justifyContent:'center' }}
                  >
                    {buying ? 'Buying...' : account ? 'Buy now' : 'Connect to buy'}
                  </button>
                )}
                {account && (
                  <button
                    className="btn btn-ghost btn-lg"
                    onClick={() => setShowOffer(v => !v)}
                    style={{ flex:1, justifyContent:'center' }}
                  >
                    {showOffer ? 'Cancel' : 'Make offer'}
                  </button>
                )}
              </div>

              {showOffer && (
                <div className={s.offerBox}>
                  <p className={s.offerLabel}>Your offer (SUI)</p>
                  <div className={s.offerRow}>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 10.0"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      style={{ flex:1 }}
                    />
                    <button
                      className="btn btn-outline-a"
                      onClick={() => {
                        if (!offerAmount) return
                        success(`Offer of ${offerAmount} SUI submitted!`)
        if(account) awardXP(account.address, 'offer', `Offer: ${offerAmount} SUI`)
                        setShowOffer(false); setOfferAmount('')
                      }}
                    >
                      Submit offer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={s.chartSection}>
              <p className={s.chartTitle}>Price history</p>
              <div style={{ height:140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PRICE_HISTORY}>
                    <XAxis dataKey="date" tick={{ fill:'var(--t-3)', fontSize:10, fontFamily:'var(--f-mono)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTip />} />
                    <Line type="monotone" dataKey="price" stroke="#00c9a7" strokeWidth={2} dot={{ fill:'#00c9a7', r:3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className={s.traitsTitle}>Details</p>
              <div className={s.traitsGrid}>
                {[['Chain','Sui'],['Storage','Walrus'],['Royalty',nft.royalty],['Minted',nft.minted],['Standard','Move NFT'],['Blob',nft.blobId.slice(0,12)+'…']].map(([l,v]) => (
                  <div key={l} className={s.trait}>
                    <p className={s.traitLabel}>{l}</p>
                    <p className={s.traitValue}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <a href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${nft.blobId}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }}>
              View raw blob on Walrus ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
