/// Tuskr Marketplace — list, buy, delist with PTB support
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

    const EWrongPrice: u64 = 1;
    const ENotOwner:   u64 = 2;

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

    public struct ListedEvent   has copy, drop { listing_id: address, nft_id: ID, price: u64, seller: address }
    public struct SoldEvent     has copy, drop { listing_id: address, nft_id: ID, price: u64, seller: address, buyer: address }
    public struct DelistedEvent has copy, drop { listing_id: address, seller: address }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(Marketplace {
            id: object::new(ctx),
            fee_bps: 200,
            fee_recipient: tx_context::sender(ctx),
        });
    }

    public fun list(
        _marketplace: &mut Marketplace,
        nft: TuskrNFT,
        price: u64,
        ctx: &mut TxContext,
    ) {
        let seller  = tx_context::sender(ctx);
        let nft_id  = object::id(&nft);
        let name    = *tuskr_nft::name(&nft);

        let mut listing = Listing {
            id: object::new(ctx),
            nft_id,
            price,
            seller,
            name,
        };

        event::emit(ListedEvent {
            listing_id: object::uid_to_address(&listing.id),
            nft_id,
            price,
            seller,
        });

        dof::add(&mut listing.id, true, nft);
        transfer::share_object(listing);
    }

    public fun buy(
        marketplace: &mut Marketplace,
        listing: &mut Listing,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let buyer = tx_context::sender(ctx);
        let price = listing.price;
        assert!(coin::value(&payment) >= price, EWrongPrice);

        let nft: TuskrNFT = dof::remove(&mut listing.id, true);

        let fee_amount = (price * (marketplace.fee_bps as u64)) / 10000;
        if (fee_amount > 0) {
            let fee = coin::split(&mut payment, fee_amount, ctx);
            transfer::public_transfer(fee, marketplace.fee_recipient);
        };

        let royalty_bps    = tuskr_nft::royalty_bps(&nft) as u64;
        let royalty_amount = (price * royalty_bps) / 10000;
        if (royalty_amount > 0) {
            let royalty = coin::split(&mut payment, royalty_amount, ctx);
            transfer::public_transfer(royalty, tuskr_nft::creator(&nft));
        };

        let seller_amount = price - fee_amount - royalty_amount;
        let seller_pay    = coin::split(&mut payment, seller_amount, ctx);
        transfer::public_transfer(seller_pay, listing.seller);

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

        transfer::public_transfer(nft, buyer);
    }

    public fun delist(
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

        transfer::public_transfer(nft, sender);
    }

    public fun price(listing: &Listing):  u64     { listing.price }
    public fun seller(listing: &Listing): address { listing.seller }
    public fun nft_id(listing: &Listing): ID      { listing.nft_id }
}
