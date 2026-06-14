# Tuskr: NFT Marketplace on Sui + Walrus

> Mint, collect and trade NFTs with AI-generated art, permanent Walrus storage, autonomous agent execution, and DeepBook-powered pricing.

**Live:** https://tuskr-eight.vercel.app
**GitHub:** https://github.com/mimisco-git/Tuskr
**Hackathon:** Sui Overflow 2026

---

## What is Tuskr?

Tuskr is a production-ready NFT marketplace on Sui where every piece of media is stored permanently on Walrus. It combines an AI creative agent, a DeepBook-powered pricing layer, and an autonomous agent wallet into one unified platform. Unlike IPFS-based NFT marketplaces where media can disappear, every Tuskr NFT is backed by permanent, verifiable Walrus storage.

---

## Hackathon Tracks

### Walrus Track (Special)

Tuskr uses Walrus as its core data layer across three distinct workflows.

**NFT Media Storage:** Every image and video uploaded at mint time is stored permanently on Walrus. The blob ID is written directly into the NFT's on-chain Move object fields. No IPFS. No S3. Anyone can verify:

```
https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}
```

**MemWal Agent Memory:** The AI Generator maintains a persistent creative memory for each user. After every mint, the agent updates a JSON blob on Walrus recording prompt history, favourite styles, and mint count. On the next session it reads this memory and suggests continuations. The Walrus blob ID is the memory pointer, stored in localStorage as a lightweight reference.

**User Profile Storage:** Username, bio, and profile picture are stored as a JSON blob on Walrus. The profile link points directly to the Walrus blob. Edits propagate to the navbar and dropdown immediately. Profile data is portable across devices.

### Agentic Web Track

**PTB Guardian Preview (Sub-track 3):** Before any mint transaction is signed, a guardian screen shows the full transaction plan in plain English: Walrus upload status, optional Seal encryption step, the Move call, the transfer, estimated gas in SUI and USD via DeepBook live rate, and a wallet balance warning. The user must explicitly confirm before the wallet popup appears. This is the "text to PTB to execution flow with human-readable preview and explicit confirmation" requirement.

**Agent Wallet (Sub-track 2):** Users can deploy an autonomous AI agent with a capped budget. The agent keypair is derived deterministically from the user's wallet signature using SHA-256, so nothing is ever stored in localStorage or on any server. The agent can mint NFTs, buy listings, and list for sale entirely without wallet popups, enforcing its own spending ceiling before every action. All actions are logged permanently to Walrus as a verifiable activity trail. Owner can revoke instantly.

**Natural Language Commands:** The agent accepts plain English instructions: "mint a cyberpunk elephant NFT", "buy cheapest under 2 SUI", "list NFT 0x... at 3 SUI". Groq AI parses the intent. Pollinations.ai generates real AI artwork (with canvas fallback). The agent executes the full on-chain flow.

### DeepBook Track (Special)

**Live SUI/USDC Price:** Every NFT card and the marketplace header show a live SUI/USDC price sourced from DeepBook V3's mainnet indexer, with CoinGecko and Binance as fallbacks. Price refreshes every 30 seconds.

**Floor Price Feed:** The cheapest active Tuskr listing price is computed from on-chain events, expressed in SUI and USD using the DeepBook rate, and shown in the homepage stats bar and marketplace header.

**Buy with USDC:** Every marketplace listing has a "Buy USDC" button. Clicking it queries DeepBook for a live swap quote, shows the USDC cost, and on confirm executes `pool::swap_exact_quote_for_base` to swap DBUSDC to SUI, then calls `tuskr_marketplace::buy` in one atomic PTB.

---

## Key Features

- **PTB Guardian Preview**: full transaction breakdown before wallet popup, gas cost in USD, wallet balance warning
- **AI NFT Generator with Memory**: Groq generates NFT concept, Pollinations.ai generates real AI artwork, agent memory on Walrus persists across sessions
- **Agent Wallet**: autonomous Ed25519 keypair derived from wallet signature, capped budget policy, Walrus activity log, revoke in one click
- **Buy with USDC**: DeepBook swap plus NFT purchase in one atomic PTB
- **DeepBook Live Price**: SUI/USDC rate on every card and header, powered by DeepBook V3 mainnet indexer
- **Floor Price Feed**: live cheapest listing price expressed in USD via DeepBook rate
- **Walrus NFT Storage**: all media stored permanently, blob ID written on-chain at mint
- **Seal Encryption**: optional private NFT descriptions encrypted with Seal, only owner can decrypt
- **User Profile on Walrus**: username, bio, avatar stored as Walrus blob, syncs to navbar and dropdown everywhere
- **Mint and Batch Mint**: single and bulk minting flows with Walrus upload
- **Full Marketplace**: list, buy, delist, secondary sales with creator royalties enforced on-chain
- **Owned NFTs via Events**: Profile Owned tab computed from MintedEvent and SoldEvent, not wallet queries, catches all cases
- **Wallet and Google zkLogin**: Sui wallet or Google sign-in via Enoki zkLogin

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Sui Move |
| Media Storage | Walrus (permanent blob storage) |
| Agent Memory | Walrus (MemWal pattern) |
| Profile Storage | Walrus (JSON blob) |
| AI Concept | Groq API (llama-3.3-70b) |
| AI Images | Pollinations.ai (Flux model, free) |
| Pricing | DeepBook V3 indexer, CoinGecko, Binance |
| USDC Payments | DeepBook V3 SUI/DBUSDC pool |
| Frontend | React, TypeScript, Vite |
| Wallet | Sui dApp Kit, Enoki zkLogin |
| Hosting | Vercel (frontend + serverless API) |
| NFT Data | TradePort Indexer API |

---

## Smart Contracts

### Testnet
| Contract | Address |
|----------|---------|
| Package | `0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56` |
| Marketplace | `0x194b2610a10950958e6bfbb4e36e9b9f5c278e02d740d6d8013b2d60934a5002` |

### Mainnet
| Contract | Address |
|----------|---------|
| Package | `0xd3a0071d104926cdc53e3e0ddb1fc9bfe3f38b5dd0a9e844707bb49b7a3c6787` |
| Marketplace | `0x9524c9adde77ae46b14ef9703b62899bb823124a30d8597a1fd837157d911650` |

---

## How Walrus Is Used

### NFT Media

```
1. User uploads image
2. /api/walrus-upload proxies PUT to Walrus Publisher
3. Walrus returns blobId
4. tuskr_nft::mint(name, description, blobId, mediaUrl, royaltyBps) stores blobId on-chain
5. TuskrNFT.blob_id field = permanent Walrus content address
```

### Agent Memory

```
1. User opens AI Generator
2. Hook reads blobId from localStorage, fetches JSON from Walrus
3. Memory shows: session count, total minted, past prompts, favourite style
4. After mint: hook writes updated memory JSON to Walrus, saves new blobId
```

### User Profile

```
1. User edits profile (username, bio, avatar)
2. Avatar uploaded to Walrus, returns blobId
3. Profile JSON uploaded to Walrus with avatar blobId
4. Profile blobId saved to localStorage as pointer
5. Navbar reads same blobId, fetches profile, shows avatar and username
```

---

## How DeepBook Is Used

### Live Price

```
GET https://deepbook-indexer.mainnet.mystenlabs.com/get_level2_ticks_from_mid?pool_id={SUI_USDC_POOL}&ticks=1
Parses bids[0] and asks[0], computes mid price, caches 30s
Falls back to CoinGecko then Binance if indexer is unavailable
```

### Buy with USDC Flow

```
PTB Step 1: pool::swap_exact_quote_for_base<SUI, DBUSDC, DEEP>
            Pool: SUI/DBUSDC 0x1c19362...
            Pays DBUSDC, receives SUI
PTB Step 2: tuskr_marketplace::buy(marketplace, listing, suiCoin)
            Uses SUI received from Step 1
Both steps succeed or both fail (atomic)
```

### Floor Price

```
1. Fetch ListedEvent - SoldEvent - DelistedEvent from both packages
2. Fetch Listing objects for active IDs
3. Sort prices, return minimum (floor)
4. Multiply by DeepBook SUI/USDC rate for USD value
```

---

## Agent Wallet Architecture

```
User signs: "Tuskr Agent Wallet v1: Key Derivation"
        |
        v
SHA-256(signature bytes) = 32-byte seed
        |
        v
Ed25519Keypair.fromSecretKey(seed) = deterministic agent keypair
        |
        v
Agent signs transactions autonomously:
  - checkPolicy(costSui) enforces budget ceiling
  - tx.sign({ signer: keypair, client: suiClient })
  - Direct RPC submit: sui_executeTransactionBlock
  - logAction() writes to Walrus activity blob
```

The agent address is deterministic per wallet. Same wallet always produces the same agent. No key is ever stored in localStorage, cookies, or any server.

---

## Run Locally

```bash
git clone https://github.com/mimisco-git/Tuskr.git
cd Tuskr
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

```env
VITE_TESTNET_PACKAGE_ID=0xe2a80cf865bb40a9b4c7a63e2e82da841d8eb80455091947c394b13ae6d3dc56
VITE_TESTNET_MARKETPLACE_ID=0x194b2610a10950958e6bfbb4e36e9b9f5c278e02d740d6d8013b2d60934a5002
VITE_NETWORK=testnet
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_ENOKI_API_KEY=your_enoki_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```

---

## Project Structure

```
src/
  pages/
    Home.tsx              Homepage with live stats (DeepBook price, floor price)
    Mint.tsx              Mint flow with PTB Guardian preview
    AIGenerator.tsx       AI NFT creator with Walrus agent memory
    Marketplace.tsx       Buy SUI or Buy USDC via DeepBook
    Profile.tsx           Owned/Listed/Sold tabs, editable Walrus profile
    AgentWallet.tsx       Autonomous agent wallet with capped budget
  hooks/
    useAgentWallet.ts     Ed25519 agent, derived from wallet sig, never stored
    useAgentCommands.ts   mint/buy/list via natural language, Pollinations.ai images
    useAgentMemory.ts     Read/write agent memory to Walrus
    useUserProfile.ts     User profile stored on Walrus
    useDeepBookPrice.ts   Live SUI/USDC from DeepBook, 30s polling
    useDeepBookSwap.ts    USDC to SUI swap via DeepBook pool
    useFloorPrice.ts      Floor price from on-chain events via DeepBook rate
    useNFTMarketplace.ts  mint, list, buy, delist, owned NFT queries
    useSeal.ts            Seal encryption for private NFT content
  contracts/
    tuskr_nft.move        NFT with blobId, royaltyBps, creator fields
    tuskr_marketplace.move list, buy, delist with royalty distribution
api/
  tuskr-nfts.js          On-chain event queries: owned, listings, floor, sold, bought
  deepbook-price.js       SUI/USDC price: DeepBook -> CoinGecko -> Binance
  walrus-upload.js        Walrus upload proxy
```

---

## Why Sui + Walrus?

**Why Sui:** Object-centric model makes NFTs first-class on-chain citizens. Each NFT is a typed Move object, not a pointer to off-chain JSON. Programmable Transaction Blocks enable atomic multi-step flows (swap + buy in one transaction). zkLogin makes wallet creation frictionless. DeepBook is Sui's native order book, enabling on-chain price discovery without external oracles.

**Why Walrus:** IPFS pins can be removed and nodes can go offline. AWS S3 is centralized. Walrus uses erasure coding across 100+ nodes, NFT media survives even if most nodes fail. A blob ID is a permanent, content-addressed reference. The same Walrus infrastructure stores NFT media, agent memory, and user profiles, making Tuskr's data stack verifiable at every layer.

---

## License

MIT
