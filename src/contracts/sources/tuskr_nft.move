/// Tuskr NFT — media on Walrus, ownership on Sui, content encrypted with Seal
module tuskr::tuskr_nft {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::url::{Self, Url};
    use sui::display;
    use sui::package;
    use std::bcs;

    public struct TuskrNFT has key, store {
        id: UID,
        name: String,
        description: String,
        blob_id: String,
        media_url: Url,
        creator: address,
        royalty_bps: u16,
        /// Optional: Seal-encrypted blob ID for private content
        /// Empty string if no Seal encryption is used
        sealed_blob_id: String,
    }

    public struct MintedEvent has copy, drop {
        nft_id: address,
        name: String,
        blob_id: String,
        creator: address,
    }

    public struct TUSKR_NFT has drop {}

    fun init(otw: TUSKR_NFT, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);
        let mut display = display::new<TuskrNFT>(&publisher, ctx);
        display::add(&mut display, string::utf8(b"name"),        string::utf8(b"{name}"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
        display::add(&mut display, string::utf8(b"image_url"),   string::utf8(b"{media_url}"));
        display::add(&mut display, string::utf8(b"creator"),     string::utf8(b"{creator}"));
        display::add(&mut display, string::utf8(b"blob_id"),     string::utf8(b"{blob_id}"));
        display::update_version(&mut display);
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display,   tx_context::sender(ctx));
    }

    public fun mint(
        name: vector<u8>,
        description: vector<u8>,
        blob_id: vector<u8>,
        media_url: vector<u8>,
        royalty_bps: u16,
        ctx: &mut TxContext,
    ) {
        let creator = tx_context::sender(ctx);
        let nft = TuskrNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            blob_id: string::utf8(blob_id),
            media_url: url::new_unsafe_from_bytes(media_url),
            creator,
            royalty_bps,
            sealed_blob_id: string::utf8(b""),
        };
        event::emit(MintedEvent {
            nft_id: object::uid_to_address(&nft.id),
            name: nft.name,
            blob_id: nft.blob_id,
            creator,
        });
        transfer::public_transfer(nft, creator);
    }

    /// Mint with Seal-encrypted private content stored on Walrus
    public fun mint_with_seal(
        name: vector<u8>,
        description: vector<u8>,
        blob_id: vector<u8>,
        media_url: vector<u8>,
        sealed_blob_id: vector<u8>,
        royalty_bps: u16,
        ctx: &mut TxContext,
    ) {
        let creator = tx_context::sender(ctx);
        let nft = TuskrNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            blob_id: string::utf8(blob_id),
            media_url: url::new_unsafe_from_bytes(media_url),
            creator,
            royalty_bps,
            sealed_blob_id: string::utf8(sealed_blob_id),
        };
        event::emit(MintedEvent {
            nft_id: object::uid_to_address(&nft.id),
            name: nft.name,
            blob_id: nft.blob_id,
            creator,
        });
        transfer::public_transfer(nft, creator);
    }

    /// ── Seal approval function ──────────────────────────────────────────
    /// Called by Seal key servers to verify the caller owns this NFT
    /// and is authorized to decrypt content encrypted for it.
    ///
    /// id:  The NFT's object ID as raw bytes (used as Seal encryption identity)
    /// nft: The NFT object — only the owner can pass an owned object in a tx
    ///
    /// If this function succeeds, Seal releases decryption key shares.
    public fun seal_approve(id: vector<u8>, nft: &TuskrNFT, _ctx: &TxContext) {
        // Get the NFT's object ID as bytes
        let nft_addr  = object::uid_to_address(&nft.id);
        let nft_bytes = bcs::to_bytes(&nft_addr);
        // Verify the encryption identity matches this NFT
        assert!(nft_bytes == id, 0);
    }

    // ── Accessors ──────────────────────────────────────────────────────
    public fun name(nft: &TuskrNFT): &String { &nft.name }
    public fun blob_id(nft: &TuskrNFT): &String { &nft.blob_id }
    public fun sealed_blob_id(nft: &TuskrNFT): &String { &nft.sealed_blob_id }
    public fun creator(nft: &TuskrNFT): address { nft.creator }
    public fun royalty_bps(nft: &TuskrNFT): u16 { nft.royalty_bps }
}
