/// Tuskr Marketplace — list, buy, delist
/// Supports PTB bulk operations natively
module tuskr::tuskr_marketplace {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::dynamic_object_field as dof;
    use sui::event;
    use tuskr::tuskr_nft::{Self, TuskrNFT};

    // === Errors ===
    const ENotListed: u64 = 0;
    const EWrongPrice: u64 = 1;
    const ENotOwner: u64 = 2;

    // === Structs ===

    /// Shared marketplace object — holds all active listings
    public struct Marketplace has key {
        id: UID,
        fee_bps: u16,
        fee_recipient: address,
    }

    public struct Listing has key, store {
        id: UID,
        nft_id: ID,
        price: u64,
        seller: address,
        name: String,
    }

    public struct ListedEvent has copy, drop {
        listing_id: address,
        nft_id: ID,
        price: u64,
        seller: address,
    }

    public struct SoldEvent has copy, drop {
        listing_id: address,
        nft_id: ID,
        price: u64,
        seller: address,
        buyer: address,
    }

    public struct DelistedEvent has copy, drop {
        listing_id: address,
        seller: address,
    }

    // === Init ===

    fun init(ctx: &mut TxContext) {
        transfer::share_object(Marketplace {
            id: object::new(ctx),
            fee_bps: 200, // 2% platform fee
            fee_recipient: tx_context::sender(ctx),
        });
    }

    // === Entry functions ===

    /// List an NFT for sale — compatible with PTB
    public entry fun list(
        marketplace: &mut Marketplace,
        nft: TuskrNFT,
        price: u64,
        ctx: &mut TxContext,
    ) {
        let seller = tx_context::sender(ctx);
        let nft_id = object::id(&nft);
        let name = *tuskr_nft::name(&nft);

        let listing = Listing {
            id: object::new(ctx),
            nft_id,
            price,
            seller,
            name,
        };

        let listing_id = object::uid_to_address(&listing.id);

        event::emit(ListedEvent { listing_id, nft_id, price, seller });

        dof::add(&mut listing.id, true, nft);
        transfer::share_object(listing);
    }

    /// Buy an NFT — a single PTB can call this multiple times for bulk buying
    public entry fun buy(
        marketplace: &mut Marketplace,
        listing: &mut Listing,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let buyer = tx_context::sender(ctx);
        let price = listing.price;

        assert!(coin::value(&payment) >= price, EWrongPrice);

        let nft: TuskrNFT = dof::remove(&mut listing.id, true);

        // Platform fee
        let fee_amount = (price * (marketplace.fee_bps as u64)) / 10000;
        if (fee_amount > 0) {
            let fee = coin::split(&mut payment, fee_amount, ctx);
            transfer::public_transfer(fee, marketplace.fee_recipient);
        };

        // Royalty to creator
        let royalty_bps = tuskr_nft::royalty_bps(&nft) as u64;
        if (royalty_bps > 0) {
            let royalty_amount = (price * royalty_bps) / 10000;
            let royalty = coin::split(&mut payment, royalty_amount, ctx);
            transfer::public_transfer(royalty, tuskr_nft::creator(&nft));
        };

        // Remainder to seller
        let seller_payment = coin::split(&mut payment, price - fee_amount - ((price * (tuskr_nft::royalty_bps(&nft) as u64)) / 10000), ctx);
        transfer::public_transfer(seller_payment, listing.seller);

        // Return change to buyer
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };

        event::emit(SoldEvent {
            listing_id: object::uid_to_address(&listing.id),
            nft_id: listing.nft_id,
            price,
            seller: listing.seller,
            buyer,
        });

        transfer::transfer(nft, buyer);
    }

    /// Delist an NFT — only seller can call
    public entry fun delist(
        _marketplace: &mut Marketplace,
        listing: &mut Listing,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == listing.seller, ENotOwner);

        let nft: TuskrNFT = dof::remove(&mut listing.id, true);

        event::emit(DelistedEvent {
            listing_id: object::uid_to_address(&listing.id),
            seller: sender,
        });

        transfer::transfer(nft, sender);
    }

    // === Getters ===
    public fun price(listing: &Listing): u64 { listing.price }
    public fun seller(listing: &Listing): address { listing.seller }
    public fun nft_id(listing: &Listing): ID { listing.nft_id }
}
