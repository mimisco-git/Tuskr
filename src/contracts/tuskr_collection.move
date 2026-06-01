/// Tuskr Collections — group NFTs into named collections
module tuskr::tuskr_collection {
    use std::string::{Self, String};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::vec_set::{Self, VecSet};
    use sui::event;

    const ENotOwner: u64 = 0;

    public struct Collection has key, store {
        id:          UID,
        name:        String,
        description: String,
        cover_blob:  String,   // Walrus blob ID for cover image
        creator:     address,
        nft_ids:     VecSet<ID>,
        royalty_bps: u16,
    }

    public struct CollectionCreatedEvent has copy, drop {
        collection_id: address,
        name:          String,
        creator:       address,
    }

    public entry fun create_collection(
        name:        vector<u8>,
        description: vector<u8>,
        cover_blob:  vector<u8>,
        royalty_bps: u16,
        ctx:         &mut TxContext,
    ) {
        let creator = tx_context::sender(ctx);
        let col = Collection {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            cover_blob: string::utf8(cover_blob),
            creator,
            nft_ids: vec_set::empty(),
            royalty_bps,
        };

        event::emit(CollectionCreatedEvent {
            collection_id: object::uid_to_address(&col.id),
            name: col.name,
            creator,
        });

        transfer::share_object(col);
    }

    public entry fun add_nft(
        col:    &mut Collection,
        nft_id: ID,
        ctx:    &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == col.creator, ENotOwner);
        vec_set::insert(&mut col.nft_ids, nft_id);
    }

    public entry fun remove_nft(
        col:    &mut Collection,
        nft_id: ID,
        ctx:    &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == col.creator, ENotOwner);
        vec_set::remove(&mut col.nft_ids, &nft_id);
    }

    public fun name(c: &Collection): &String        { &c.name }
    public fun creator(c: &Collection): address      { c.creator }
    public fun cover_blob(c: &Collection): &String   { &c.cover_blob }
    public fun nft_count(c: &Collection): u64        { vec_set::size(&c.nft_ids) }
}
