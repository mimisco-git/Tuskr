/// Tuskr Collection — group NFTs under a named collection
module tuskr::tuskr_collection {
    use std::string::{Self, String};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::vec_set::{Self, VecSet};

    const ENotOwner: u64 = 0;

    public struct Collection has key, store {
        id: UID,
        name: String,
        description: String,
        cover_blob_id: String,
        creator: address,
        nft_ids: VecSet<ID>,
    }

    public struct CollectionCreatedEvent has copy, drop { collection_id: address, name: String, creator: address }
    public struct NftAddedEvent          has copy, drop { collection_id: address, nft_id: ID }
    public struct NftRemovedEvent        has copy, drop { collection_id: address, nft_id: ID }

    public fun create_collection(
        name: vector<u8>,
        description: vector<u8>,
        cover_blob_id: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let creator = tx_context::sender(ctx);
        let collection = Collection {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            cover_blob_id: string::utf8(cover_blob_id),
            creator,
            nft_ids: vec_set::empty(),
        };
        event::emit(CollectionCreatedEvent {
            collection_id: object::uid_to_address(&collection.id),
            name: collection.name,
            creator,
        });
        transfer::public_transfer(collection, creator);
    }

    public fun add_nft(
        collection: &mut Collection,
        nft_id: ID,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == collection.creator, ENotOwner);
        vec_set::insert(&mut collection.nft_ids, nft_id);
        event::emit(NftAddedEvent {
            collection_id: object::uid_to_address(&collection.id),
            nft_id,
        });
    }

    public fun remove_nft(
        collection: &mut Collection,
        nft_id: ID,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == collection.creator, ENotOwner);
        vec_set::remove(&mut collection.nft_ids, &nft_id);
        event::emit(NftRemovedEvent {
            collection_id: object::uid_to_address(&collection.id),
            nft_id,
        });
    }

    public fun name(c: &Collection): &String { &c.name }
    public fun creator(c: &Collection): address { c.creator }
    public fun nft_count(c: &Collection): u64 { vec_set::size(&c.nft_ids) }
}
