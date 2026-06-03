import { Buffer } from 'buffer'
;(window as unknown as Record<string, unknown>).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { NetworkProvider } from './hooks/useNetwork'
import { getFullnodeUrl } from '@mysten/sui/client'
import '@mysten/dapp-kit/dist/index.css'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
}

// Read saved network — we reload on switch so this applies immediately
const savedNetwork = localStorage.getItem('tuskr_network')
const defaultNetwork: 'mainnet' | 'testnet' =
  savedNetwork === 'testnet' ? 'testnet' : 'mainnet'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
      <SuiClientProvider networks={networks} defaultNetwork={defaultNetwork}>
        <WalletProvider autoConnect>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </NetworkProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
