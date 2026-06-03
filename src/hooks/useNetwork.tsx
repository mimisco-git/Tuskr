import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Network = 'mainnet' | 'testnet'

interface NetworkConfig {
  name: Network
  packageId: string
  marketplaceId: string
  walrusPublisher: string
  walrusAggregator: string
  explorerBase: string
}

export const NETWORKS: Record<Network, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    packageId:     '0xd3a0071d104926cdc53e3e0ddb1fc9bfe3f38b5dd0a9e844707bb49b7a3c6787',
    marketplaceId: '0x9524c9adde77ae46b14ef9703b62899bb823124a30d8597a1fd837157d911650',
    walrusPublisher: 'https://publisher.walrus.space',
    walrusAggregator: 'https://aggregator.walrus.space',
    explorerBase: 'https://suivision.xyz/txblock',
  },
  testnet: {
    name: 'testnet',
    packageId:     '0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d',
    marketplaceId: '0xd1a40986e214e59d9882b3e47c861eea3b732367958d27c03e9fc3b1f747a3b2',
    walrusPublisher: 'https://publisher.walrus-testnet.walrus.space',
    walrusAggregator: 'https://aggregator.walrus-testnet.walrus.space',
    explorerBase: 'https://testnet.suivision.xyz/txblock',
  },
}

interface NetworkContextType {
  network: NetworkConfig
  setNetwork: (n: Network) => void
}

const NetworkContext = createContext<NetworkContextType>({
  network: NETWORKS.mainnet,
  setNetwork: () => {},
})

const STORAGE_KEY = 'tuskr_network'

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [net, setNet] = useState<Network>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Network | null
    if (saved && (saved === 'mainnet' || saved === 'testnet')) return saved
    // Default from env var
    const envNet = import.meta.env.VITE_NETWORK as Network | undefined
    return (envNet === 'testnet') ? 'testnet' : 'mainnet'
  })

  const setNetwork = (n: Network) => {
    setNet(n)
    localStorage.setItem(STORAGE_KEY, n)
  }

  return (
    <NetworkContext.Provider value={{ network: NETWORKS[net], setNetwork }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}
