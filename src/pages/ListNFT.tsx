import { useState } from 'react'
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useToast } from '../components/Toast'
import s from './ListNFT.module.css'
import { useXP } from '../hooks/useXP'
import usePageTitle from '../hooks/usePageTitle'

// Mock owned NFTs — will be replaced with real on-chain data after deployment
const MOCK_OWNED = [
  { id:'1', name:'Arctic Phantom #001', image:'https://picsum.photos/seed/tk1/300/300', listed:false,  price:'' },
  { id:'3', name:'Tusk Genesis',        image:'https://picsum.photos/seed/tk3/300/300', listed:true,   price:'22.0' },
  { id:'4', name:'Polar Drift #012',    image:'https://picsum.photos/seed/tk4/300/300', listed:false,  price:'' },
]

export default function ListNFT() {
  usePageTitle('List NFT')
  const account = useCurrentAccount()
  const { awardXP } = useXP(account?.address)
  const { listNFT, delistNFT } = useNFTMarketplace()
  const { success, error: toastErr, toast } = useToast()
  const [nfts, setNfts]   = useState(MOCK_OWNED)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const handleList = async (nft: typeof MOCK_OWNED[0]) => {
    const price = prices[nft.id]
    if (!price || isNaN(+price) || +price <= 0) {
      toastErr('Enter a valid price in SUI')
      return
    }
    setLoading(nft.id)
    try {
      await listNFT({ nftId: nft.id, priceInMist: BigInt(Math.floor(+price * 1e9)) })
      success(`${nft.name} listed for ${price} SUI`)
      setNfts(p => p.map(n => n.id === nft.id ? { ...n, listed: true, price } : n))
    } catch { toastErr('Listing failed') } finally { setLoading(null) }
  }

  const handleDelist = async (nft: typeof MOCK_OWNED[0]) => {
    setLoading(nft.id)
    try {
      await delistNFT(nft.id)
      success(`${nft.name} delisted`)
      setNfts(p => p.map(n => n.id === nft.id ? { ...n, listed: false, price: '' } : n))
    } catch { toastErr('Delist failed') } finally { setLoading(null) }
  }

  if (!account) return (
    <main className={s.page}><div className="container">
      <div className={s.connectBox}>
        <p className={s.connectTitle}>Connect to list NFTs</p>
        <ConnectButton />
      </div>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div className={s.eyebrow}><div className={s.eyebrowDot}/>List your NFT</div>
          <div>
            <h1 className={s.title}>List for sale</h1>
            <p className={s.sub}>Set a price and list your NFTs on the Tuskr marketplace</p>
          </div>
          <Link to="/profile" className="btn btn-ghost">← My NFTs</Link>
        </div>

        <div className={s.grid}>
          {nfts.map(nft => (
            <div key={nft.id} className={`${s.card} ${nft.listed ? s.cardListed : ''}`}>
              <div className={s.imgWrap}>
                <img src={nft.image} alt={nft.name} className={s.img} />
                {nft.listed && (
                  <div className={s.listedBadge}>Listed</div>
                )}
              </div>
              <div className={s.body}>
                <p className={s.name}>{nft.name}</p>

                {nft.listed ? (
                  <div className={s.listedState}>
                    <div className={s.listedPrice}>
                      <p className={s.priceLabel}>Listed at</p>
                      <p className={s.price}>{nft.price} <span>SUI</span></p>
                    </div>
                    <button
                      className={`btn ${s.delistBtn}`}
                      onClick={() => handleDelist(nft)}
                      disabled={loading === nft.id}
                    >
                      {loading === nft.id ? '...' : 'Delist'}
                    </button>
                  </div>
                ) : (
                  <div className={s.listState}>
                    <div className={s.priceInput}>
                      <input
                        className="input"
                        type="number"
                        placeholder="Price in SUI"
                        value={prices[nft.id] ?? ''}
                        onChange={e => setPrices(p => ({ ...p, [nft.id]: e.target.value }))}
                        min="0.01"
                        step="0.1"
                      />
                      <span className={s.suiLabel}>SUI</span>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleList(nft)}
                      disabled={loading === nft.id || !prices[nft.id]}
                      style={{ width:'100%', justifyContent:'center' }}
                    >
                      {loading === nft.id ? 'Listing...' : 'List for sale'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
