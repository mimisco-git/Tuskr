/// Tuskr Auction — timed English auction
module tuskr::tuskr_auction {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::dynamic_object_field as dof;
    use sui::event;
    use tuskr::tuskr_nft::TuskrNFT;

    const EAuctionEnded:    u64 = 0;
    const EAuctionNotEnded: u64 = 1;
    const EBidTooLow:       u64 = 2;

    public struct Auction has key, store {
        id: UID,
        nft_id: ID,
        seller: address,
        min_bid: u64,
        end_time_ms: u64,
        top_bidder: option::Option<address>,
        top_bid: option::Option<Coin<SUI>>,
    }

    public struct AuctionCreatedEvent has copy, drop { auction_id: address, nft_id: ID, seller: address, min_bid: u64, end_time_ms: u64 }
    public struct BidEvent            has copy, drop { auction_id: address, bidder: address, amount: u64 }
    public struct SettledEvent        has copy, drop { auction_id: address, winner: address, amount: u64 }

    public fun create_auction(
        nft: TuskrNFT,
        min_bid: u64,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let seller      = tx_context::sender(ctx);
        let nft_id      = sui::object::id(&nft);
        let end_time_ms = clock::timestamp_ms(clock) + duration_ms;

        let mut auction = Auction {
            id: object::new(ctx),
            nft_id,
            seller,
            min_bid,
            end_time_ms,
            top_bidder: option::none(),
            top_bid:    option::none(),
        };

        event::emit(AuctionCreatedEvent {
            auction_id: object::uid_to_address(&auction.id),
            nft_id,
            seller,
            min_bid,
            end_time_ms,
        });

        dof::add(&mut auction.id, true, nft);
        transfer::share_object(auction);
    }

    public fun bid(
        auction: &mut Auction,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(clock::timestamp_ms(clock) < auction.end_time_ms, EAuctionEnded);
        let amount = coin::value(&payment);
        let current_top = if (option::is_some(&auction.top_bid)) {
            coin::value(option::borrow(&auction.top_bid))
        } else {
            auction.min_bid - 1
        };
        assert!(amount > current_top, EBidTooLow);

        // Refund previous top bidder
        if (option::is_some(&auction.top_bid)) {
            let prev_bid = option::extract(&mut auction.top_bid);
            let prev_bidder = option::extract(&mut auction.top_bidder);
            transfer::public_transfer(prev_bid, prev_bidder);
        };

        event::emit(BidEvent {
            auction_id: object::uid_to_address(&auction.id),
            bidder: tx_context::sender(ctx),
            amount,
        });

        option::fill(&mut auction.top_bidder, tx_context::sender(ctx));
        option::fill(&mut auction.top_bid, payment);
    }

    public fun settle(
        auction: &mut Auction,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(clock::timestamp_ms(clock) >= auction.end_time_ms, EAuctionNotEnded);
        let nft: TuskrNFT = dof::remove(&mut auction.id, true);

        if (option::is_some(&auction.top_bid)) {
            let winner    = option::extract(&mut auction.top_bidder);
            let winning   = option::extract(&mut auction.top_bid);
            let amount    = coin::value(&winning);
            event::emit(SettledEvent { auction_id: object::uid_to_address(&auction.id), winner, amount });
            transfer::public_transfer(winning, auction.seller);
            transfer::public_transfer(nft, winner);
        } else {
            transfer::public_transfer(nft, auction.seller);
        };
    }
}
