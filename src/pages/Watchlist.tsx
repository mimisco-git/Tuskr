import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import NFTCard from '../components/NFTCard'
import s from './Watchlist.module.css'
import usePageTitle from '../hooks/usePageTitle'

export default function Watchlist() {
  usePageTitle('Watchlist')
  const { watchlist, removeFromWatchlist } = useWatchlist()

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <h1 className={s.title}>Watchlist</h1>
          <p className={s.sub}>{watchlist.length} NFTs saved</p>
        </div>

        {watchlist.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>Nothing saved yet.</p>
            <p className={s.emptySub}>Browse the marketplace and tap the bookmark icon to save NFTs here.</p>
            <Link to="/marketplace" className="btn btn-primary">Browse NFTs</Link>
          </div>
        ) : (
          <div className={s.grid}>
            {watchlist.map((nft, i) => (
              <div key={nft.id} className={s.cardWrap}>
                <NFTCard nft={nft} delay={i * 0.05} />
                <button
                  className={s.removeBtn}
                  onClick={() => removeFromWatchlist(nft.id)}
                  title="Remove from watchlist"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
