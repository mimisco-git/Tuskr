# tuskr

**The AI-powered NFT intelligence platform on Sui + Walrus.**

Live: [tuskr-eight.vercel.app](https://tuskr-eight.vercel.app)  
Contracts: Sui Testnet · Epoch 1117

---

## What is Tuskr?

Tuskr is the first NFT marketplace where:
- Every file is **permanently stored on Walrus** (not IPFS, not servers)
- Every ownership transfer is **enforced by Sui Move**
- **AI intelligence** helps you discover, price, and create NFTs
- **No wallet required** to get started (zkLogin via Google)

> Intelligence finds value.

---

## Features

### Core Marketplace
- **Browse and buy NFTs** — real listings from Sui chain
- **Bulk PTB transactions** — buy up to 20 NFTs atomically in one signature
- **Auctions** — live countdown timers, real bidding
- **Collections** — group NFTs on-chain
- **Watchlist** — track NFTs you want

### Creation Tools
- **Mint NFTs** — 4-step flow, media uploaded to Walrus, minted on Sui
- **AI Generator** — Groq AI generates name, description, traits, and image prompt
- **Batch Mint** — drag and drop up to 20 files, one PTB transaction
- **Walrus Seal** — encrypt full-resolution files, only verified holders decrypt

### Intelligence Layer
- **AI Price Intelligence** — Groq suggests optimal listing price with reasoning
- **NFT Rarity Scorer** — auto-calculated rarity tier from traits and name
- **Activity Feed** — real-time on-chain events (SoldEvent, ListedEvent, MintedEvent)
- **Creator Dashboard** — volume charts, royalty tracking, sales history
- **XP Leaderboard** — earn points for every on-chain action

### Access
- **Sui Wallet** — Slushie, Sui Wallet, OKX Wallet
- **zkLogin** — sign in with Google, no wallet needed

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TUSKR FRONTEND                           │
│  React + TypeScript + Vite                                  │
│  Deployed on Vercel + Walrus Sites                          │
├─────────────────────────────────────────────────────────────┤
│                    INTELLIGENCE LAYER                       │
│  Groq AI (llama-3.3-70b) — concept generation + pricing    │
│  Rarity scoring — trait-based algorithm                     │
├──────────────────────────┬──────────────────────────────────┤
│        SUI LAYER         │         WALRUS LAYER             │
│  Move contracts          │  Blob storage (media)            │
│  PTB transactions        │  Walrus Seal (encryption)        │
│  zkLogin                 │  Aggregator / Publisher          │
│  Object ownership        │  Blob verification               │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Smart Contracts

**Package:** `0x7661bfc5434c8f210d1832ad5654c4ac9cb394440e99aacdec8a54bdaa382d4d`  
**Marketplace:** `0xd1a40986e214e59d9882b3e47c861eea3b732367958d27c03e9fc3b1f747a3b2`  
**Network:** Sui Testnet · Epoch 1117  
**Tx:** `5q7mXv6VJgtAfjkzhPPv4tuYq3V1EfcuDs7ZHTnrXN2w`

### Modules
| Module | Purpose |
|--------|---------|
| `tuskr_nft` | NFT minting with Walrus blob ID, royalty enforcement, Display standard |
| `tuskr_marketplace` | List, buy, delist with PTB support and on-chain royalty splits |
| `tuskr_auction` | Timed English auctions with automatic refunds |
| `tuskr_collection` | Group NFTs under named collections |
| `tuskr_offers` | Make, accept and cancel offers using Balance<SUI> |

---

## Why Walrus?

| Traditional NFT | Tuskr NFT |
|-----------------|-----------|
| IPFS link (can die) | Certified Walrus blob |
| Server-hosted image | Erasure-coded, 200+ nodes |
| Link rot after 2 years | Permanent for storage epochs |
| No encryption | Walrus Seal AES-256-GCM |
| Centralized metadata | On-chain Move object |

---

## XP System

| Action | XP |
|--------|----|
| Buy NFT | +50 |
| Sell NFT | +30 |
| Mint NFT | +20 |
| Batch Mint 5+ | +60 |
| List for Sale | +10 |
| Make Offer | +5 |
| Daily Check-in | +5 |
| 3-Day Streak | +15 bonus |
| 7-Day Streak | +50 bonus |
| Hold NFT/day | +1/day |

10 levels: Bronze → Silver → Gold → Platinum → Diamond → Obsidian → Phantom → Titan → Sovereign → Legend

---

## Local Development

```bash
git clone https://github.com/mimisco-git/Tuskr
cd Tuskr
npm install

cp .env.example .env.local
# Fill in your keys

npm run dev
```

### Environment Variables
```
VITE_PACKAGE_ID      = 0x7661bfc5...
VITE_MARKETPLACE_ID  = 0xd1a409...
VITE_NETWORK         = testnet
VITE_GROQ_API_KEY    = gsk_...     # free at console.groq.com
VITE_GOOGLE_CLIENT_ID = ...        # for zkLogin, from Google Cloud Console
```

---

## Team

Built by **Whyte Tycon** and **sir_mimisco** for the DeepSurge × Sui × Walrus Hackathon.

Sui Address: `0xc1854222c1cfdb6f2932f895058ad08dfadeca28a00968ed0834159e059ed5f6`

---

## Hackathon

DeepSurge: [deepsurge.xyz](https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf)
