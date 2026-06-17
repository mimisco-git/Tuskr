import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useXP } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import { Link } from 'react-router-dom'
import { SuiObjectData } from '@mysten/sui/jsonRpc'
import s from './ListNFT.module.css'
import { getAIPriceSuggestion } from '../hooks/useAIPricing'
import usePageTitle from '../hooks/usePageTitle'

interface OwnedNFT {
  objectId: string
  name:     string
  image:    string
  blobId:   string
}

function parseOwned(obj: SuiObjectData): OwnedNFT {
  const fields  = (obj.content as any)?.fields ?? {}
  const display = (obj.display as any)?.data   ?? {}
  return {
    objectId: obj.objectId,
    name:     fields.name      || display.name      || 'Tuskr NFT',
    image:    fields.media_url || display.image_url || '',
    blobId:   fields.blob_id   || '',
  }
}

export default function ListNFT() {
  usePageTitle('List NFT')
  const account    = useCurrentAccount()
  const { fetchOwnedNFTs, listNFT, delistNFT } = useNFTMarketplace()
  const { awardXP } = useXP(account?.address)
  const { success, error: toastErr } = useToast()

  const [nfts,     setNfts]     = useState<OwnedNFT[]>([])
  const [selected, setSelected] = useState<OwnedNFT | null>(null)
  const [price,    setPrice]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [listing,  setListing]  = useState(false)
  const [aiSuggest, setAiSuggest] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!account) { setLoading(false); return }
    fetchOwnedNFTs(account.address)
      .then(raw => setNfts(raw.map(parseOwned)))
      .catch(() => setNfts([]))
      .finally(() => setLoading(false))
  }, [account?.address])

  const handleList = async () => {
    if (!selected || !price || !account) return
    setListing(true)
    try {
      const priceInMist = BigInt(Math.floor(parseFloat(price) * 1e9))
      await listNFT({ nftId: selected.objectId, priceInMist })
      success(`${selected.name} listed for ${price} SUI`)
      awardXP(account.address, 'list', `Listed: ${selected.name}`)
      // Refresh owned NFTs
      const raw = await fetchOwnedNFTs(account.address)
      setNfts(raw.map(parseOwned))
      setSelected(null)
      setPrice('')
    } catch (e: any) {
      toastErr(e?.message || 'Listing failed')
    } finally {
      setListing(false)
    }
  }

  if (!account) return (
    <main className={s.page}><div className="container">
      <div className={s.empty}>
        <div className={s.emptyIcon}>🏷️</div>
        <p className={s.emptyTitle}>Connect your wallet</p>
        <p className={s.emptySub}>Connect to list your NFTs for sale.</p>
      </div>
    </div></main>
  )

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.eyebrow}><div className={s.eyebrowDot}/>List for Sale</div>
        <h1 className={s.title}>List an NFT</h1>
        <p className={s.sub}>Select an NFT from your wallet and set your price.</p>

        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio:'1', borderRadius:16 }}/>
            ))}
          </div>
        ) : nfts.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>🎨</div>
            <p className={s.emptyTitle}>No NFTs to list</p>
            <p className={s.emptySub}>Mint an NFT first, then come back to list it.</p>
            <Link to="/mint" className="btn btn-primary">Mint an NFT</Link>
          </div>
        ) : (
          <>
            {/* AI price suggestion */}
          {aiLoading && (
            <div className={s.aiLoading}>
              <div className={s.aiSpinner}/>
              <span>Groq AI is analyzing market conditions...</span>
            </div>
          )}
          {aiSuggest && !aiLoading && (
            <div className={s.aiCard}>
              <div className={s.aiHeader}>
                <div className={s.aiIcon}>✦</div>
                <div>
                  <div className={s.aiTitle}>AI Price Intelligence</div>
                  <div className={s.aiConf}>Confidence: {aiSuggest.confidence}</div>
                </div>
                <button className={s.usePrice} onClick={() => setPrice(String(aiSuggest.price))}>
                  Use {aiSuggest.price} SUI
                </button>
              </div>
              <div className={s.aiRange}>
                <span className={s.aiRangeLabel}>Suggested range</span>
                <span className={s.aiRangeVal}>{aiSuggest.low} – {aiSuggest.high} SUI</span>
              </div>
              <p className={s.aiReason}>{aiSuggest.reasoning}</p>
              <div className={s.aiFactors}>
                {aiSuggest.factors?.map((f: string) => (
                  <span key={f} className={s.aiFactor}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* NFT picker */}
            <div className={s.grid}>
              {nfts.map(nft => (
                <div
                  key={nft.objectId}
                  className={`${s.card} ${selected?.objectId === nft.objectId ? s.cardSelected : ''}`}
                  onClick={async () => {
                    setSelected(nft)
                    setAiSuggest(null)
                    setAiLoading(true)
                    const suggestion = await getAIPriceSuggestion(nft.name, '', [])
                    setAiSuggest(suggestion)
                    setAiLoading(false)
                  }}
                >
                  <div className={s.imgWrap}>
                    {nft.image ? (
                      <img src={nft.image} alt={nft.name} className={s.img}
                        onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                    ) : (
                      <div className={s.imgPlaceholder}>{nft.name.slice(0,2).toUpperCase()}</div>
                    )}
                    {selected?.objectId === nft.objectId && (
                      <div className={s.checkmark}>✓</div>
                    )}
                  </div>
                  <div className={s.cardName}>{nft.name}</div>
                  <div className={s.cardId}>{nft.objectId.slice(0,10)}…</div>
                </div>
              ))}
            </div>

            {/* Listing form */}
            {selected && (
              <div className={s.formCard}>
                <div className={s.formHeader}>
                  <div className={s.selectedName}>Listing: <strong>{selected.name}</strong></div>
                </div>
                <div className={s.priceRow}>
                  <div className="field" style={{ flex:1 }}>
                    <label className="field-label">Sale Price (SUI)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.0"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                  {price && (
                    <div className={s.feeBreakdown}>
                      <div className={s.feeRow}>
                        <span>You receive</span>
                        <span className={s.feeVal}>{(parseFloat(price||'0') * 0.93).toFixed(3)} SUI</span>
                      </div>
                      <div className={s.feeRow}>
                        <span>Platform fee (2%)</span>
                        <span>{(parseFloat(price||'0') * 0.02).toFixed(3)} SUI</span>
                      </div>
                      <div className={s.feeRow}>
                        <span>Creator royalty (5%)</span>
                        <span>{(parseFloat(price||'0') * 0.05).toFixed(3)} SUI</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={s.actions}>
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleList}
                    disabled={listing || !price || parseFloat(price) <= 0}
                    style={{
                      background: '#00d4aa',
                      color: '#000',
                      opacity: (!price || parseFloat(price) <= 0) ? 0.5 : 1,
                      minWidth: 140,
                    }}
                  >
                    {listing ? 'Listing…' : (!price || parseFloat(price) <= 0) ? 'Enter a price' : `List for ${price} SUI`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
