import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import { Transaction } from '@mysten/sui/transactions'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import NFTCard, { NFT } from '../components/NFTCard'
import s from './Marketplace.module.css'
import usePageTitle from '../hooks/usePageTitle'
import { useNetwork } from '../hooks/useNetwork'

interface Listing {
  listingId: string
  nftId:     string
  price:     string
  seller:    string
  name:      string
  image:     string
  blobId:    string
}

export default function Marketplace() {
  usePageTitle('Marketplace')
  const { network } = useNetwork()
  const PACKAGE_ID     = network.packageId
  const MARKETPLACE_ID = network.marketplaceId
  const account  = useCurrentAccount()
  const client   = useSuiClient()
  const { buyNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { success, error: toastErr, info } = useToast()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const [listings,  setListings]  = useState<Listing[]>([])
  const [allNfts,   setAllNfts]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState('recent')
  const [activeTab, setActiveTab] = useState<'listed'|'all'>('all')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [buying,    setBuying]    = useState<string | null>(null)

  const loadListings = useCallback(async () => {
    setLoading(true)
    try {
      // Query ListedEvents to get all listing IDs
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::ListedEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))

      // Also query DelistedEvents and SoldEvents to exclude them
      const delistedEvents = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::DelistedEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))

      const soldEvents = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_marketplace::SoldEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))

      // Build sets of inactive listing IDs
      const delistedIds = new Set(
        delistedEvents.data.map((e: any) => e.parsedJson?.listing_id).filter(Boolean)
      )
      const soldIds = new Set(
        soldEvents.data.map((e: any) => e.parsedJson?.listing_id).filter(Boolean)
      )

      // Active listings = listed but not delisted or sold
      const activeEvents = events.data.filter((e: any) => {
        const lid = e.parsedJson?.listing_id
        return lid && !delistedIds.has(lid) && !soldIds.has(lid)
      })

      if (activeEvents.length === 0) {
        setListings([])
        return
      }

      // Fetch each listing object to get full details
      const listingObjects = await Promise.allSettled(
        activeEvents.map((e: any) =>
          client.getObject({
            id: e.parsedJson.listing_id,
            options: { showContent: true },
          })
        )
      )

      const parsed: Listing[] = []
      for (let i = 0; i < listingObjects.length; i++) {
        const res = listingObjects[i]
        if (res.status !== 'fulfilled') continue
        const obj = res.value?.data
        if (!obj) continue
        const f = (obj.content as any)?.fields ?? {}
        const ev = (activeEvents[i] as any).parsedJson ?? {}

        // Fetch the NFT's display data for image
        let image = ''
        let blobId = ''
        try {
          const nftObj = await client.getObject({
            id: f.nft_id || ev.nft_id,
            options: { showContent: true, showDisplay: true },
          })
          const nftFields  = (nftObj.data?.content as any)?.fields ?? {}
          const nftDisplay = (nftObj.data?.display as any)?.data  ?? {}
          image  = nftFields.media_url  || nftDisplay.image_url || ''
          blobId = nftFields.blob_id    || ''
        } catch {}

        parsed.push({
          listingId: obj.objectId,
          nftId:     f.nft_id     || ev.nft_id     || '',
          price:     f.price      ? (Number(f.price) / 1e9).toFixed(2) : (ev.price ? (Number(ev.price) / 1e9).toFixed(2) : '0'),
          seller:    f.seller     || ev.seller     || '',
          name:      f.name       || `NFT #${(f.nft_id || '').slice(2,8)}`,
          image,
          blobId,
        })
      }

      setListings(parsed)
    } catch (e) {
      console.error('Marketplace load error:', e)
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { loadListings(); loadAllNfts() }, [network.name])

  // Filter + sort

  // Load ALL minted TuskrNFTs on network — not just listed ones
  const loadAllNfts = useCallback(async () => {
    try {
      // Query recent TuskrNFT mint events to find all NFTs
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::tuskr_nft::MintedEvent` },
        limit: 50,
      }).catch(() => ({ data: [] }))

      if (events.data.length === 0) {
        // Fallback: try to get objects by type directly
        setAllNfts([])
        return
      }

      // Fetch each NFT object
      const ids = events.data
        .map((e: any) => e.parsedJson?.nft_id || e.parsedJson?.id)
        .filter(Boolean)

      if (ids.length === 0) { setAllNfts([]); return }

      const objs = await client.multiGetObjects({
        ids,
        options: { showContent: true, showDisplay: true },
      })

      const parsed = objs
        .filter(o => o.data)
        .map(o => {
          const f = (o.data?.content as any)?.fields ?? {}
          const d = (o.data?.display as any)?.data ?? {}
          return {
            objectId:    o.data!.objectId,
            name:        f.name        || d.name        || 'Tuskr NFT',
            description: f.description || d.description || '',
            mediaUrl:    f.media_url   || d.image_url   || '',
            blobId:      f.blob_id     || '',
            creator:     f.creator     || '',
            royaltyBps:  Number(f.royalty_bps ?? 0),
          }
        })
      setAllNfts(parsed)
    } catch { setAllNfts([]) }
  }, [PACKAGE_ID, network.name])

  const filtered = listings
    .filter(l =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.seller.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'price_asc')  return parseFloat(a.price) - parseFloat(b.price)
      if (sort === 'price_desc') return parseFloat(b.price) - parseFloat(a.price)
      return 0
    })

  const asNFT = (l: Listing): NFT => ({
    id:       l.listingId,
    name:     l.name,
    image:    l.image,
    price:    l.price,
    currency: 'SUI',
    creator:  l.seller.slice(0,8) + '…',
    listed:   true,
    blobId:   l.blobId,
  })

  const handleBuy = async (listing: Listing) => {
    if (!account) return toastErr('Connect your wallet first')
    setBuying(listing.listingId)
    try {
      await buyNFT(listing.listingId, BigInt(Math.floor(parseFloat(listing.price) * 1e9)))
      success(`Bought ${listing.name}!`)
      if (account) awardXP(account.address, 'buy', `Bought: ${listing.name}`)
      loadListings()
    } catch (e: any) {
      toastErr(e?.message || 'Purchase failed')
    } finally {
      setBuying(null)
    }
  }

  const handleBulkBuy = async () => {
    if (!account || selected.size === 0) return
    info(`Buying ${selected.size} NFTs in one transaction…`)
    const toBuy = listings.filter(l => selected.has(l.listingId))
    try {
      const tx = new Transaction()
      for (const l of toBuy) {
        const priceInMist = BigInt(Math.floor(parseFloat(l.price) * 1e9))
        const [coin] = tx.splitCoins(tx.gas, [priceInMist])
        tx.moveCall({
          target: `${PACKAGE_ID}::tuskr_marketplace::buy`,
          arguments: [
            tx.object(MARKETPLACE_ID),
            tx.object(l.listingId),
            coin,
          ],
        })
      }
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            success(`Bought ${selected.size} NFTs!`)
            setSelected(new Set())
            loadListings()
            if (account) awardXP(account.address, 'buy', `Bulk buy: ${selected.size} NFTs`)
          },
          onError: (e) => toastErr(e?.message || 'Bulk buy failed'),
        }
      )
    } catch (e: any) {
      toastErr(e?.message || 'Bulk buy failed')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedTotal = listings
    .filter(l => selected.has(l.listingId))
    .reduce((acc, l) => acc + parseFloat(l.price), 0)

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div className={s.eyebrow}><div className={s.eyebrowDot}/>NFT Marketplace</div>
          <h1 className={s.title}>Marketplace</h1>
          <p className={s.sub}>{filtered.length} NFT{filtered.length !== 1 ? 's' : ''} · Media stored on Walrus</p>
        </div>

        {/* Controls */}
        <div className={s.controls}>
          <input
            className={`input ${s.search}`}
            placeholder="Search by name or seller address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input" value={sort} onChange={e => setSort(e.target.value)} style={{ width:'auto' }}>
            <option value="recent">Recently listed</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={loadListings}>↻ Refresh</button>
        </div>

        {/* Bulk buy banner */}
        {selected.size > 0 && (
          <div className={s.bulkBanner}>
            <span>{selected.size} NFT{selected.size > 1 ? 's' : ''} selected · {selectedTotal.toFixed(2)} SUI total</span>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
              <button className="btn btn-primary" onClick={handleBulkBuy}>
                Buy all in one transaction
              </button>
            </div>
          </div>
        )}

        {/* Bulk buy tip */}
        {selected.size === 0 && listings.length > 1 && (
          <div className={s.bulkTip}>
            Tap any NFT card to select it · Select multiple to bulk-buy in one transaction
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio:'1', borderRadius:20 }}/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyIcon}>🏪</p>
            <p className={s.emptyTitle}>
              {listings.length === 0 ? 'No listings yet' : 'No results found'}
            </p>
            <p className={s.emptySub}>
              {listings.length === 0
                ? 'Mint an NFT and list it for sale to be the first.'
                : 'Try a different search term.'}
            </p>
            {listings.length === 0 && (
              <a href="/mint" className="btn btn-primary">Mint an NFT</a>
            )}
          </div>
        ) : (
          <div className={s.grid}>
            {filtered.map((listing, i) => (
              <div
                key={listing.listingId}
                className={`${s.cardWrap} ${selected.has(listing.listingId) ? s.cardSelected : ''}`}
                onClick={() => toggleSelect(listing.listingId)}
              >
                <div className={s.selectCheck}>
                  {selected.has(listing.listingId) ? '✓' : ''}
                </div>
                <NFTCard
                  nft={asNFT(listing)}
                  delay={i * 0.05}
                  onBuy={() => handleBuy(listing)}
                />
                {buying === listing.listingId && (
                  <div className={s.buyingOverlay}>Buying…</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
