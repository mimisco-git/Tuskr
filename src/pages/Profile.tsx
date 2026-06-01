import { useEffect, useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useXP } from '../hooks/useXP'
import { Link } from 'react-router-dom'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { SuiObjectData } from '@mysten/sui/client'
import s from './Profile.module.css'
import usePageTitle from '../hooks/usePageTitle'

export default function Profile() {
  usePageTitle('My NFTs')
  const account = useCurrentAccount()
  const { awardXP } = useXP(account?.address)
  const { fetchOwnedNFTs } = useNFTMarketplace()
  const [nfts, setNfts] = useState<SuiObjectData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if(!account){ setLoading(false); return }
    fetchOwnedNFTs(account.address).then(setNfts).finally(()=>setLoading(false))
  }, [account?.address])

  // Hold bonus: +1 XP/day per NFT worth > 10 SUI
  useEffect(() => {
    if (!account || !nfts.length) return
    const costly = nfts.filter((n: any) => parseFloat(n.price || '0') > 10)
    if (costly.length > 0) {
      const lastKey = `tuskr_hold_${account.address}`
      const lastDate = localStorage.getItem(lastKey)
      const today = new Date().toDateString()
      if (lastDate !== today) {
        localStorage.setItem(lastKey, today)
        costly.forEach((n: any) => awardXP(account.address, 'hold_bonus', `Holding: ${n.name}`))
      }
    }
  }, [nfts, account?.address])

  if(!account) return (
    <main className={s.page}><div className="container">
      <div className={s.empty}>
        <p className={s.emptyTitle}>Not connected</p>
        <p className={s.emptyDesc}>Connect your wallet to view your collection.</p>
        <Link to="/marketplace" className="btn btn-ghost">Browse marketplace</Link>
      </div>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div className={s.avatar}>{account.address.slice(2,4).toUpperCase()}</div>
          <div>
            <h1 className={s.title}>My collection</h1>
            <p className={s.address}>{account.address.slice(0,10)}…{account.address.slice(-8)}</p>
          </div>
        </div>

        {loading ? (
          <div className={s.grid}>{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton" style={{aspectRatio:'1',borderRadius:18}} />)}</div>
        ) : nfts.length===0 ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>No NFTs yet.</p>
            <p className={s.emptyDesc}>Mint your first NFT or explore the marketplace.</p>
            <div className="flex gap-12" style={{justifyContent:'center'}}>
              <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
              <Link to="/marketplace" className="btn btn-ghost">Browse</Link>
            </div>
          </div>
        ) : (
          <div className={s.grid}>
            {nfts.map(nft => (
              <div key={nft.objectId} className={s.card}>
                <div className={s.imgWrap}><div className={s.imgPlaceholder}>{nft.objectId.slice(2,4)}</div></div>
                <div className={s.cardBody}>
                  <p className={s.cardName}>{(nft.content as any)?.fields?.name||'Tuskr NFT'}</p>
                  <p className={s.cardId}>{nft.objectId.slice(0,12)}…</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
