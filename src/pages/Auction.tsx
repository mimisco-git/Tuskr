import { useState, useEffect } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useToast } from '../components/Toast'
import { Link } from 'react-router-dom'
import { useNetwork } from '../hooks/useNetwork'
import s from './Auction.module.css'
import usePageTitle from '../hooks/usePageTitle'

function countdown(end: Date) {
  const diff = Math.max(0, end.getTime() - Date.now())
  const h = Math.floor(diff/3600000)
  const m = Math.floor((diff%3600000)/60000)
  const sec = Math.floor((diff%60000)/1000)
  return diff <= 0 ? 'Ended' : `${h}h ${m}m ${sec}s`
}

interface Auction { id:string; nftName:string; nftImage:string; seller:string; endTime:Date; topBid:number; topBidder:string|null; bids:number }

export default function Auction() {
  usePageTitle('Live Auctions')
  const account = useCurrentAccount()
  const client  = useSuiClient()
  const { network } = useNetwork()
  const { success, error: toastErr } = useToast()

  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading,  setLoading]  = useState(true)
  const [times,    setTimes]    = useState<Record<string,string>>({})
  const [bids,     setBids]     = useState<Record<string,string>>({})
  const [bidding,  setBidding]  = useState<string|null>(null)

  useEffect(() => {
    // Query real auction events from chain
    const load = async () => {
      setLoading(true)
      try {
        const events = await client.queryEvents({
          query: { MoveEventType: `${network.packageId}::tuskr_auction::AuctionCreated` },
          limit: 20,
        }).catch(() => ({ data: [] }))
        // If real auctions exist, parse them. For now sets empty.
        setAuctions([])
      } catch { setAuctions([]) }
      finally { setLoading(false) }
    }
    load()
  }, [network.name])

  useEffect(() => {
    if (auctions.length === 0) return
    const timer = setInterval(() => {
      const t: Record<string,string> = {}
      auctions.forEach(a => { t[a.id] = countdown(a.endTime) })
      setTimes(t)
    }, 1000)
    return () => clearInterval(timer)
  }, [auctions])

  const handleBid = async (auction: Auction) => {
    if (!account) return toastErr('Connect your wallet to bid')
    const amt = parseFloat(bids[auction.id] || '0')
    if (amt <= auction.topBid) return toastErr(`Bid must exceed ${auction.topBid} SUI`)
    setBidding(auction.id)
    // TODO: wire to tuskr_auction::bid contract call
    await new Promise(r => setTimeout(r, 800))
    setAuctions(prev => prev.map(a => a.id === auction.id ? {...a, topBid: amt, topBidder: account.address.slice(0,8), bids: a.bids+1} : a))
    success(`Bid of ${amt} SUI placed!`)
    setBidding(null)
  }

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.pageHeader}>
          <div className={s.eyebrow}><span className={s.eyebrowDot}/>Live Auctions</div>
          <h1 className={s.title}>Timed Auctions</h1>
          <p className={s.sub}>Bid on exclusive NFTs — highest bid wins when the clock hits zero.</p>
        </div>

        {loading ? (
          <div className={s.grid}>
            {[1,2,3].map(i => <div key={i} className={s.skelCard}/>)}
          </div>
        ) : auctions.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyGlow}/>
            <div className={s.emptyIcon}>⏱</div>
            <h2 className={s.emptyTitle}>Auctions launching soon</h2>
            <p className={s.emptySub}>
              Timed auctions are coming to Tuskr on {network.name}.<br/>
              Mint an NFT now — you'll be able to auction it when this feature goes live.
            </p>
            <div className={s.emptyActions}>
              <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
              <Link to="/marketplace" className="btn btn-outline">Browse NFTs</Link>
            </div>
            <div className={s.emptyFeatures}>
              {['Timed bidding windows','Reserve price setting','Auto-settle on chain','Walrus media proof'].map(f => (
                <div key={f} className={s.emptyFeature}>
                  <span className={s.featureCheck}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={s.grid}>
            {auctions.map(a => (
              <div key={a.id} className={s.card}>
                <div className={s.imgWrap}>
                  <img src={a.nftImage} alt={a.nftName}/>
                  <div className={s.timer}>{times[a.id] ?? '...'}</div>
                </div>
                <div className={s.body}>
                  <div className={s.nftName}>{a.nftName}</div>
                  <div className={s.seller}>by {a.seller}</div>
                  <div className={s.bidRow}>
                    <div>
                      <div className={s.bidLabel}>Top bid</div>
                      <div className={s.bidVal}>{a.topBid} <span className={s.sui}>SUI</span></div>
                      <div className={s.bidder}>{a.topBidder ? `${a.topBidder}...` : 'No bids yet'}</div>
                    </div>
                    <div>
                      <div className={s.bidLabel}>Total bids</div>
                      <div className={s.bidVal}>{a.bids}</div>
                    </div>
                  </div>
                  <div className={s.bidInput}>
                    <input className="input" type="number" placeholder={`> ${a.topBid} SUI`}
                      value={bids[a.id]||''} onChange={e => setBids(p => ({...p,[a.id]:e.target.value}))} step="0.1"/>
                    <button className="btn btn-primary" onClick={() => handleBid(a)} disabled={bidding===a.id}>
                      {bidding===a.id ? '...' : 'Bid'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
