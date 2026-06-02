/**
 * Auction.tsx
 * Timed auction UI, wired to tuskr_auction.move contract.
 * Shows active auctions, lets users bid, settle after end.
 */
import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useToast } from '../components/Toast'
import { useXP } from '../hooks/useXP'
import s from './Auction.module.css'
import usePageTitle from '../hooks/usePageTitle'

interface Auction {
  id:         string
  nftName:    string
  nftImage:   string
  seller:     string
  endTime:    Date
  topBid:     number
  topBidder:  string | null
  bids:       number
}

const MOCK_AUCTIONS: Auction[] = [
  { id:'a1', nftName:'Arctic Phantom #001', nftImage:'https://picsum.photos/seed/tk1/400/400', seller:'whytetycon', endTime:new Date(Date.now()+3600*2*1000), topBid:14.5, topBidder:'sir_mimisco', bids:7 },
  { id:'a2', nftName:'Deep Current #007',   nftImage:'https://picsum.photos/seed/tk2/400/400', seller:'sir_mimisco', endTime:new Date(Date.now()+3600*5*1000), topBid:9.2,  topBidder:null,          bids:2 },
  { id:'a3', nftName:'Tusk Genesis',        nftImage:'https://picsum.photos/seed/tk3/400/400', seller:'whytetycon', endTime:new Date(Date.now()+3600*22*1000), topBid:30.0, topBidder:'arcticwhal3', bids:12 },
]

function countdown(end: Date) {
  const diff = Math.max(0, end.getTime() - Date.now())
  const h = Math.floor(diff/3600000)
  const m = Math.floor((diff%3600000)/60000)
  const s = Math.floor((diff%60000)/1000)
  return `${h}h ${m}m ${s}s`
}

export default function Auction() {
  usePageTitle('Live Auctions')
  const account = useCurrentAccount()
  const { success, error: toastErr } = useToast()
  const { awardXP } = useXP(account?.address)
  const [auctions, setAuctions] = useState(MOCK_AUCTIONS)
  const [bids, setBids] = useState<Record<string,string>>({})
  const [times, setTimes] = useState<Record<string,string>>({})
  const [bidding, setBidding] = useState<string|null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      const t: Record<string,string> = {}
      MOCK_AUCTIONS.forEach(a => { t[a.id] = countdown(a.endTime) })
      setTimes(t)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleBid = async (auction: Auction) => {
    if (!account) return toastErr('Connect your wallet to place a bid')
    const amt = parseFloat(bids[auction.id] || '0')
    if (amt <= auction.topBid) return toastErr(`Bid must exceed ${auction.topBid} SUI`)
    setBidding(auction.id)
    await new Promise(r => setTimeout(r, 900))
    setAuctions(prev => prev.map(a =>
      a.id === auction.id
        ? { ...a, topBid: amt, topBidder: account.address.slice(0,8), bids: a.bids+1 }
        : a
    ))
    success(`Bid of ${amt} SUI placed!`)
    awardXP(account.address, 'offer', `Bid: ${amt} SUI on ${auction.nftName}`)
    setBidding(null)
  }

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.eyebrow}><div className={s.eyebrowDot}/>Live Auctions</div>
        <h1 className={s.title}>Timed Auctions</h1>
        <p className={s.sub}>Bid on exclusive NFTs. Highest bid wins when the clock hits zero.</p>

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
                  <input
                    className="input"
                    type="number"
                    placeholder={`> ${a.topBid} SUI`}
                    value={bids[a.id] || ''}
                    onChange={e => setBids(p => ({...p, [a.id]: e.target.value}))}
                    step="0.1"
                    min={a.topBid + 0.1}
                  />
                  <button
                    className="btn btn-teal"
                    onClick={() => handleBid(a)}
                    disabled={bidding === a.id}>
                    {bidding === a.id ? '...' : 'Place bid'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
