# Tuskr

NFT marketplace on Sui blockchain with Walrus decentralized storage.

## Stack

- **Frontend**: React + Vite + Sui dApp Kit
- **Blockchain**: Sui (Move smart contracts)
- **Storage**: Walrus (blob storage for NFT media)
- **Auth**: zkLogin (email) + Sui wallet connect

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Deploy contracts

```bash
cd src/contracts
sui move build
sui client publish --gas-budget 100000000
```

After publishing, copy the Package ID and Marketplace object ID into your `.env` file.

## Project structure

```
src/
  pages/
    Home.tsx          — Landing page
    Marketplace.tsx   — Browse + bulk buy (PTB)
    Mint.tsx          — Upload to Walrus + mint on Sui
    NFTDetail.tsx     — Single NFT view + buy
    Profile.tsx       — Owned NFTs
  components/
    Navbar.tsx        — Navigation + wallet connect
    NFTCard.tsx       — Reusable NFT card
  hooks/
    useWalrus.ts      — Walrus blob upload hook
    useNFTMarketplace.ts — Sui transaction hooks
  contracts/
    tuskr_nft.move    — NFT module (mint, display)
    tuskr_marketplace.move — Marketplace (list, buy, delist)
    Move.toml         — Package manifest
```

## Hackathon

Built for the DeepSurge hackathon on Sui.
Tracks: Culture & Entertainment, Walrus Storage.
