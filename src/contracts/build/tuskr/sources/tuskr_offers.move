/// Tuskr Offers — make/accept/cancel offers on NFTs
module tuskr::tuskr_offers {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use tuskr::tuskr_nft::TuskrNFT;

    const ENotBuyer:  u64 = 0;
    const ENotSeller: u64 = 1;

    public struct Offer has key, store {
        id: UID,
        nft_id: ID,
        buyer: address,
        payment: Balance<SUI>,
    }

    public struct OfferMadeEvent     has copy, drop { offer_id: address, nft_id: ID, buyer: address, amount: u64 }
    public struct OfferAcceptedEvent has copy, drop { offer_id: address, nft_id: ID, buyer: address, seller: address, amount: u64 }
    public struct OfferCancelledEvent has copy, drop { offer_id: address, buyer: address }

    public fun make_offer(
        nft_id: ID,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let buyer  = tx_context::sender(ctx);
        let amount = coin::value(&payment);

        let offer = Offer {
            id: object::new(ctx),
            nft_id,
            buyer,
            payment: coin::into_balance(payment),
        };

        event::emit(OfferMadeEvent {
            offer_id: object::uid_to_address(&offer.id),
            nft_id,
            buyer,
            amount,
        });

        transfer::share_object(offer);
    }

    public fun accept_offer(
        offer: &mut Offer,
        nft: TuskrNFT,
        ctx: &mut TxContext,
    ) {
        let seller = tx_context::sender(ctx);
        assert!(sui::object::id(&nft) == offer.nft_id, ENotSeller);

        let amount  = balance::value(&offer.payment);
        let payment = coin::from_balance(balance::withdraw_all(&mut offer.payment), ctx);

        event::emit(OfferAcceptedEvent {
            offer_id: object::uid_to_address(&offer.id),
            nft_id: offer.nft_id,
            buyer: offer.buyer,
            seller,
            amount,
        });

        transfer::public_transfer(payment, seller);
        transfer::public_transfer(nft, offer.buyer);
    }

    public fun cancel_offer(
        offer: &mut Offer,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == offer.buyer, ENotBuyer);

        let payment = coin::from_balance(balance::withdraw_all(&mut offer.payment), ctx);

        event::emit(OfferCancelledEvent {
            offer_id: object::uid_to_address(&offer.id),
            buyer: sender,
        });

        transfer::public_transfer(payment, sender);
    }
}
