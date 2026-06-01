import { useEffect } from 'react'
const BASE = 'Tuskr'
export default function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : `${BASE} — NFT Marketplace on Sui + Walrus`
  }, [title])
}
