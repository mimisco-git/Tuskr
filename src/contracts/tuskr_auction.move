/// Tuskr Timed Auctions
/// PTB-compatible: bidding, settling, and refunds in one transaction
module tuskr::tuskr_auction {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::event;
    use tuskr::tuskr_nft::TuskrNFT;
    use sui::dynamic_object_field as dof;

    const EAuctionEnded:    u64 = 0;
    const EAuctionNotEnded: u64 = 1;
    const EBidTooLow:       u64 = 2;
    const ENotSeller:       u64 = 3;

    public struct Auction has key {
        id:            UID,
        nft_id:        ID,
        name:          String,
        seller:        address,
        start_price:   u64,
        current_bid:   u64,
        current_bidder: option::Option<address>,
        end_time:      u64,   // Unix ms
    }

    public struct AuctionCreatedEvent has copy, drop {
        auction_id: address,
        nft_id:     ID,
        end_time:   u64,
    }

    public struct BidPlacedEvent has copy, drop {
        auction_id: address,
        bidder:     address,
        amount:     u64,
    }

    public struct AuctionSettledEvent has copy, drop {
        auction_id: address,
        winner:     address,
        amount:     u64,
    }

    /// Create auction — locks NFT inside the Auction object
    public entry fun create_auction(
        nft:         TuskrNFT,
        start_price: u64,
        duration_ms: u64,
        clock:       &Clock,
        ctx:         &mut TxContext,
    ) {
        let seller   = tx_context::sender(ctx);
        let nft_id   = sui::object::id(&nft);
        let name     = *tuskr::tuskr_nft::name(&nft);
        let end_time = clock::timestamp_ms(clock) + duration_ms;

        let mut auction = Auction {
            id: object::new(ctx),
            nft_id,
            name,
            seller,
            start_price,
            current_bid: start_price,
            current_bidder: option::none(),
            end_time,
        };

        event::emit(AuctionCreatedEvent {
            auction_id: object::uid_to_address(&auction.id),
            nft_id,
            end_time,
        });

        dof::add(&mut auction.id, true, nft);
        transfer::share_object(auction);
    }

    /// Place a bid — refunds previous bidder automatically
    public entry fun bid(
        auction: &mut Auction,
        mut payment: Coin<SUI>,
        clock:   &Clock,
        ctx:     &mut TxContext,
    ) {
        let now    = clock::timestamp_ms(clock);
        let bidder = tx_context::sender(ctx);
        assert!(now < auction.end_time, EAuctionEnded);

        let amount = coin::value(&payment);
        assert!(amount > auction.current_bid, EBidTooLow);

        // Refund previous bidder
        if (option::is_some(&auction.current_bidder)) {
            let prev = *option::borrow(&auction.current_bidder);
            let refund = coin::split(&mut payment, auction.current_bid, ctx);
            transfer::public_transfer(refund, prev);
        };

        auction.current_bid    = amount;
        auction.current_bidder = option::some(bidder);

        event::emit(BidPlacedEvent {
            auction_id: object::uid_to_address(&auction.id),
            bidder,
            amount,
        });

        transfer::public_transfer(payment, bidder);
    }

    /// Settle auction after end_time
    public entry fun settle(
        auction: &mut Auction,
        clock:   &Clock,
        ctx:     &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        assert!(now >= auction.end_time, EAuctionNotEnded);

        let nft: TuskrNFT = dof::remove(&mut auction.id, true);

        if (option::is_some(&auction.current_bidder)) {
            let winner = *option::borrow(&auction.current_bidder);
            event::emit(AuctionSettledEvent {
                auction_id: object::uid_to_address(&auction.id),
                winner,
                amount: auction.current_bid,
            });
            transfer::transfer(nft, winner);
        } else {
            // No bids — return to seller
            transfer::transfer(nft, auction.seller);
        }
    }

    public fun end_time(a: &Auction): u64       { a.end_time }
    public fun current_bid(a: &Auction): u64    { a.current_bid }
    public fun seller(a: &Auction): address      { a.seller }
}
