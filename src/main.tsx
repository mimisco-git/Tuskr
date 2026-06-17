import { Buffer } from 'buffer'
;(window as unknown as Record<string, unknown>).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { NetworkProvider } from './hooks/useNetwork'
import { SuiClient, getFullnodeUrl as getJsonRpcFullnodeUrl } from '@mysten/sui/client'
import { registerEnokiWallets } from '@mysten/enoki'
import '@mysten/dapp-kit/dist/index.css'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

const savedNetwork = localStorage.getItem('tuskr_network')
const defaultNetwork: 'mainnet' | 'testnet' =
  savedNetwork === 'mainnet' ? 'mainnet' : 'testnet'

// SuiClient requires both url AND network fields in v2
const networks = {
  testnet: new SuiClient({ url: getJsonRpcFullnodeUrl('testnet') }),
  mainnet: new SuiClient({ url: getJsonRpcFullnodeUrl('mainnet') }),
}

// Enoki — Google becomes a wallet in the dApp Kit wallet selector
// Sponsored transactions → users mint without gas → address visible on Suiscan immediately
const ENOKI_KEY     = import.meta.env.VITE_ENOKI_API_KEY    || ''
const GOOGLE_CLIENT = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

if (ENOKI_KEY && GOOGLE_CLIENT) {
  registerEnokiWallets({
    apiKey: ENOKI_KEY,
    providers: {
      google: {
        clientId:    GOOGLE_CLIENT,
        redirectUrl: `${window.location.origin}/zklogin`,
      },
    },
    client:  networks[defaultNetwork],
    network: defaultNetwork,
  })
}

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
