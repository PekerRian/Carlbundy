module carl9::carlbundy9 {
    use aptos_framework::event;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account::{Self, SignerCapability};
    use std::signer;

    // Constants
    const FEE_COLLECTOR: address = @0x720757d34c77743730715fcf091f456e6840e32a077014d6883983ff7323c3ea;

    // Error codes
    const E_GAME_ALREADY_INITIALIZED: u64 = 0x60064;  // 393316
    const E_GAME_NOT_INITIALIZED: u64 = 0x60066;      // 393318
    const E_NOT_GAME_CREATOR: u64 = 0x60065;          // 393317
    const E_GAME_ALREADY_STARTED: u64 = 0x60068;      // 393320
    const E_GAME_NOT_ENDED: u64 = 0x60069;           // 393321
    const E_INSUFFICIENT_FUNDS: u64 = 0x6006A;        // 393322
    const E_GAME_IN_PROGRESS: u64 = 0x60067;         // 393319
    const E_GAME_NOT_STARTED: u64 = 0x6006B;         // 393323

    /// Resource to track if an account has been initialized as a game creator
    struct CreatorData has key {
        resource_signer_cap: SignerCapability,
        resource_address: address
    }

    /// Event struct for game events
    struct GameEvent has drop, store, key {
        event_type: u8, // 0 = ticket_purchase, 1 = game_start, 2 = game_end
        buyer: address,
        prize_pool: u64,
        time_left: u64,
        winner: address,
    }

    /// The `Game` resource stores the state of the game
    struct Game has key {
        creator: address,
        total_deposit: u64,
        ticket_price: u64,
        timer_end: u64,
        last_buyer: address,
        started: bool,
        event_handle: event::EventHandle<GameEvent>,
    }

    #[test_only]
    /// Get the resource address for testing
    public fun get_resource_address(creator_addr: address): address acquires CreatorData {
        borrow_global<CreatorData>(creator_addr).resource_address
    }

    /// Get game state - returns (creator, total_deposit, ticket_price, timer_end, last_buyer, started)
    public fun get_game_state(resource_addr: address): (address, u64, u64, u64, address, bool) acquires Game {
        let game = borrow_global<Game>(resource_addr);
        (
            game.creator,
            game.total_deposit,
            game.ticket_price,
            game.timer_end,
            game.last_buyer,
            game.started
        )
    }

    #[test_only]
    /// Check if game exists at resource address
    public fun game_exists(resource_addr: address): bool {
        exists<Game>(resource_addr)
    }

    #[test_only]
    /// Check if creator data exists
    public fun creator_data_exists(creator_addr: address): bool {
        exists<CreatorData>(creator_addr)
    }

    /// Initialize or restart the game
    public entry fun initialize_game(creator: &signer, ticket_price: u64, initial_deposit: u64, game_id: vector<u8>) acquires CreatorData, Game {
        let creator_addr = signer::address_of(creator);
        
        // Basic input validation
        assert!(ticket_price > 0, 0x1); // Cannot set zero ticket price

        // If creator already has a game, they must end it first
        if (exists<CreatorData>(creator_addr)) {
            let creator_data = borrow_global<CreatorData>(creator_addr);
            let resource_addr = creator_data.resource_address;
            assert!(!exists<Game>(resource_addr) || !borrow_global<Game>(resource_addr).started, E_GAME_IN_PROGRESS);
        };

        // Initialize first time setup if needed
        if (!exists<CreatorData>(creator_addr)) {
            // Use game_id as seed for unique resource accounts
            let (resource_signer, resource_signer_cap) = account::create_resource_account(creator, game_id);
            let resource_addr = account::create_resource_address(&creator_addr, game_id);
            
            // Register resource account to handle APT
            coin::register<AptosCoin>(&resource_signer);
            
            // Store creator data
            move_to(creator, CreatorData {
                resource_signer_cap,
                resource_address: resource_addr
            });
        };

        // Get creator data
        let creator_data = borrow_global<CreatorData>(creator_addr);
        let resource_signer = account::create_signer_with_capability(&creator_data.resource_signer_cap);
        let resource_addr = creator_data.resource_address;

        // If game exists, verify the creator is the original game creator
        if (exists<Game>(resource_addr)) {
            let game = borrow_global<Game>(resource_addr);
            assert!(creator_addr == game.creator, E_NOT_GAME_CREATOR);
        };

        // Handle game initialization/restart
        if (!exists<Game>(resource_addr)) {
            // Initialize new game
            if (initial_deposit > 0) {
                let creator_balance = coin::balance<AptosCoin>(creator_addr);
                assert!(creator_balance >= initial_deposit, E_INSUFFICIENT_FUNDS);
                coin::transfer<AptosCoin>(creator, resource_addr, initial_deposit);
            };

            let event_handle = account::new_event_handle<GameEvent>(creator);
            move_to(&resource_signer, Game {
                creator: creator_addr,
                total_deposit: initial_deposit,
                ticket_price,
                timer_end: 0, // Will be set when game starts
                last_buyer: creator_addr,
                started: false,
                event_handle,
            });
        } else {
                // Restart existing game
                let game = borrow_global<Game>(resource_addr);
                // Verify the creator is the original game creator
                assert!(creator_addr == game.creator, E_NOT_GAME_CREATOR);
                // Verify game is not in progress
                assert!(!game.started, E_GAME_IN_PROGRESS);
                
                // Now get mutable reference for updates
                let game = borrow_global_mut<Game>(resource_addr);
                if (initial_deposit > 0) {
                    let creator_balance = coin::balance<AptosCoin>(creator_addr);
                    assert!(creator_balance >= initial_deposit, E_INSUFFICIENT_FUNDS);
                    coin::transfer<AptosCoin>(creator, resource_addr, initial_deposit);
                    game.total_deposit = initial_deposit;
                };
            
            game.ticket_price = ticket_price;
            game.timer_end = 0;
            game.last_buyer = creator_addr;
            game.started = false;
        };
    }

    /// Start the game
    public entry fun start_game(creator: &signer, creator_addr: address) acquires CreatorData, Game {
        // Get creator data and verify it exists
        assert!(exists<CreatorData>(creator_addr), E_GAME_NOT_INITIALIZED);
        let creator_data = borrow_global<CreatorData>(creator_addr);
        let resource_addr = creator_data.resource_address;
        
        // Get game data and verify it exists
        assert!(exists<Game>(resource_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global_mut<Game>(resource_addr);
        
        // Verify the creator is the original game creator
        let starter_addr = signer::address_of(creator);
        assert!(starter_addr == game.creator, E_NOT_GAME_CREATOR);
        
        // Verify game is not already started
        assert!(!game.started, E_GAME_ALREADY_STARTED);
        
        // Start the game and set timer
        game.started = true;
        game.timer_end = timestamp::now_seconds() + 120; // 2 minutes from now
        // Emit game_start event
        event::emit_event(&mut game.event_handle, GameEvent {
            event_type: 1,
            buyer: starter_addr,
            prize_pool: game.total_deposit,
            time_left: game.timer_end - timestamp::now_seconds(),
            winner: @0x0,
        });
    }

    /// Buy a ticket
    public entry fun buy_ticket(buyer: &signer, creator_addr: address) acquires CreatorData, Game {
        assert!(exists<CreatorData>(creator_addr), E_GAME_NOT_INITIALIZED);
        let creator_data = borrow_global<CreatorData>(creator_addr);
        let resource_addr = creator_data.resource_address;
        
        assert!(exists<Game>(resource_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global_mut<Game>(resource_addr);
        let buyer_addr = signer::address_of(buyer);
        
        // Verify game is started and hasn't ended
        assert!(game.started, E_GAME_NOT_STARTED);
        let now = timestamp::now_seconds();
        assert!(now <= game.timer_end, E_GAME_NOT_ENDED);

        // Ensure buyer has enough APT
        let buyer_balance = coin::balance<AptosCoin>(buyer_addr);
        assert!(buyer_balance >= game.ticket_price, E_INSUFFICIENT_FUNDS);

        // Transfer APT from buyer to resource account
        coin::transfer<AptosCoin>(buyer, resource_addr, game.ticket_price);
        game.total_deposit = game.total_deposit + game.ticket_price;

        // Update last buyer
        game.last_buyer = buyer_addr;
        // Extend timer by 2 minutes from now on each ticket purchase
        game.timer_end = now + 120;
        // Emit ticket_purchase event
        event::emit_event(&mut game.event_handle, GameEvent {
            event_type: 0,
            buyer: buyer_addr,
            prize_pool: game.total_deposit,
            time_left: game.timer_end - now,
            winner: @0x0,
        });
    }

    /// End the game and distribute rewards
    public entry fun end_game(ender: &signer, creator_addr: address) acquires CreatorData, Game {
        // Get creator data and verify it exists
        assert!(exists<CreatorData>(creator_addr), E_GAME_NOT_INITIALIZED);
        let creator_data = borrow_global<CreatorData>(creator_addr);
        let resource_addr = creator_data.resource_address;
        
        // Get game data and verify it exists
        assert!(exists<Game>(resource_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global<Game>(resource_addr);
        
        // Critical security check: Verify that the ender is the original game creator
        // by checking against the stored creator address in the Game resource
        let ender_addr = signer::address_of(ender);
        assert!(ender_addr == game.creator, E_NOT_GAME_CREATOR);
        
        // Game state checks
        let now = timestamp::now_seconds();
        assert!(game.started, E_GAME_NOT_ENDED);
        assert!(now > game.timer_end, E_GAME_NOT_ENDED);

        // Now that all checks have passed, get mutable reference for updates
        let game = borrow_global_mut<Game>(resource_addr);

        let total = game.total_deposit;
        let to_last_buyer = total * 80 / 100;  // 80% to last buyer
        let to_fee_collector = total - to_last_buyer; // 20% to fee collector

        let resource_signer = account::create_signer_with_capability(&creator_data.resource_signer_cap);

        // Transfer rewards
        if (to_last_buyer > 0) {
            coin::transfer<AptosCoin>(&resource_signer, game.last_buyer, to_last_buyer);
        };
        if (to_fee_collector > 0) {
            coin::transfer<AptosCoin>(&resource_signer, FEE_COLLECTOR, to_fee_collector);
        };

        // Emit game_end event
        event::emit_event(&mut game.event_handle, GameEvent {
            event_type: 2,
            buyer: ender_addr,
            prize_pool: game.total_deposit,
            time_left: 0,
            winner: game.last_buyer,
        });
        // Reset game state
        game.total_deposit = 0;
        game.timer_end = 0;
        game.started = false;
        game.last_buyer = creator_addr;
    }
}
