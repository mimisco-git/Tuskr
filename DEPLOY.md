# Deploy updated NFT contract to testnet

## What changed
- Added `seal_approve(id, nft, ctx)` — Seal key servers call this to verify NFT ownership
- Added `mint_with_seal(...)` — mint with Seal-encrypted private content
- Added `sealed_blob_id` field to TuskrNFT struct

## Steps

1. Install Sui CLI if not already:
   ```
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
   ```
   Or download from: https://docs.sui.io/references/cli

2. Make sure your wallet has testnet SUI:
   https://faucet.testnet.sui.io

3. Deploy:
   ```
   cd ~/Downloads/tuskr-full/tuskr/src/contracts
   sui client publish --gas-budget 100000000
   ```

4. Copy the new Package ID from the output (looks like 0x...)

5. Update Vercel env vars:
   VITE_TESTNET_PACKAGE_ID = <new package ID>
   VITE_PACKAGE_ID = <new package ID>

6. Redeploy Vercel

## What this unlocks
After deployment, Tuskr NFTs support Seal encryption:
- Mint page: description encrypted with Seal, stored on Walrus
- NFT Detail: "Unlock with Seal" button for owners — decrypts private content
- Seal key servers verify NFT ownership via seal_approve
