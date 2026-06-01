/// Tuskr NFT Marketplace on Sui
/// Media stored on Walrus, ownership on Sui
module tuskr::tuskr_nft {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::url::{Self, Url};
    use sui::display;
    use sui::package;

    // === Structs ===

    public struct TuskrNFT has key, store {
        id: UID,
        name: String,
        description: String,
        /// Walrus blob ID — the actual media reference
        blob_id: String,
        /// Walrus aggregator URL for the media
        media_url: Url,
        /// Creator wallet address
        creator: address,
        /// Royalty in basis points (500 = 5%)
        royalty_bps: u16,
    }

    public struct MintedEvent has copy, drop {
        nft_id: address,
        name: String,
        blob_id: String,
        creator: address,
    }

    /// One-time witness for Display setup
    public struct TUSKR_NFT has drop {}

    // === Init ===

    fun init(otw: TUSKR_NFT, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let mut display = display::new<TuskrNFT>(&publisher, ctx);
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{media_url}"));
        display::add(&mut display, string::utf8(b"creator"), string::utf8(b"{creator}"));
        display::add(&mut display, string::utf8(b"blob_id"), string::utf8(b"{blob_id}"));
        display::update_version(&mut display);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    // === Public functions ===

    /// Mint a new Tuskr NFT with Walrus blob reference
    public entry fun mint(
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
        };

        event::emit(MintedEvent {
            nft_id: object::uid_to_address(&nft.id),
            name: nft.name,
            blob_id: nft.blob_id,
            creator,
        });

        transfer::transfer(nft, creator);
    }

    // === Getters ===

    public fun name(nft: &TuskrNFT): &String { &nft.name }
    public fun blob_id(nft: &TuskrNFT): &String { &nft.blob_id }
    public fun creator(nft: &TuskrNFT): address { nft.creator }
    public fun royalty_bps(nft: &TuskrNFT): u16 { nft.royalty_bps }
}
