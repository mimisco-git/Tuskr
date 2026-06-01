/// Tuskr Offers — make offers on unlisted NFTs
module tuskr::tuskr_offers {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use tuskr::tuskr_nft::TuskrNFT;

    const ENotOfferOwner: u64 = 0;

    public struct Offer has key {
        id:      UID,
        nft_id:  ID,
        buyer:   address,
        amount:  u64,
        payment: Coin<SUI>,
    }

    public struct OfferMadeEvent has copy, drop {
        offer_id: address,
        nft_id:   ID,
        buyer:    address,
        amount:   u64,
    }

    public struct OfferAcceptedEvent has copy, drop {
        offer_id: address,
        buyer:    address,
        seller:   address,
        amount:   u64,
    }

    /// Buyer makes an offer — coins locked in the Offer object
    public entry fun make_offer(
        nft_id:  ID,
        payment: Coin<SUI>,
        ctx:     &mut TxContext,
    ) {
        let buyer  = tx_context::sender(ctx);
        let amount = coin::value(&payment);

        let offer = Offer {
            id: object::new(ctx),
            nft_id,
            buyer,
            amount,
            payment,
        };

        event::emit(OfferMadeEvent {
            offer_id: object::uid_to_address(&offer.id),
            nft_id,
            buyer,
            amount,
        });

        transfer::share_object(offer);
    }

    /// NFT owner accepts the offer
    public entry fun accept_offer(
        offer: Offer,
        nft:   TuskrNFT,
        ctx:   &mut TxContext,
    ) {
        let seller = tx_context::sender(ctx);
        let Offer { id, nft_id: _, buyer, amount, payment } = offer;
        object::delete(id);

        event::emit(OfferAcceptedEvent {
            offer_id: @0x0, // deleted
            buyer,
            seller,
            amount,
        });

        transfer::public_transfer(payment, seller);
        transfer::transfer(nft, buyer);
    }

    /// Buyer cancels an offer and reclaims coins
    public entry fun cancel_offer(
        offer: Offer,
        ctx:   &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == offer.buyer, ENotOfferOwner);
        let Offer { id, nft_id: _, buyer, amount: _, payment } = offer;
        object::delete(id);
        transfer::public_transfer(payment, buyer);
    }

    public fun amount(o: &Offer): u64  { o.amount }
    public fun buyer(o: &Offer): address { o.buyer }
    public fun nft_id(o: &Offer): ID   { o.nft_id }
}
