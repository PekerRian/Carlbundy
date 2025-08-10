#[test_only]
module carl8::carlbundy8_tests {
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use carl7::carlbundy8;

    // Test constants
    const CREATOR: address = @0x123;
    const PLAYER1: address = @0x456;
    const PLAYER2: address = @0x789;
    const INITIAL_BALANCE: u64 = 1000000000;
    const TICKET_PRICE: u64 = 100000000;
    const INITIAL_DEPOSIT: u64 = 50000000;

    // Test helper function to set up the test environment
    fun setup(aptos_framework: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        let creator = account::create_account_for_test(CREATOR);
        let player1 = account::create_account_for_test(PLAYER1);
        let player2 = account::create_account_for_test(PLAYER2);

        // Initialize coin and give initial balances
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        coin::register<AptosCoin>(&creator);
        coin::register<AptosCoin>(&player1);
        coin::register<AptosCoin>(&player2);
        
        coin::deposit(CREATOR, coin::mint<AptosCoin>(INITIAL_BALANCE, &mint_cap));
        coin::deposit(PLAYER1, coin::mint<AptosCoin>(INITIAL_BALANCE, &mint_cap));
        coin::deposit(PLAYER2, coin::mint<AptosCoin>(INITIAL_BALANCE, &mint_cap));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_initialize_game(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        // Initialize game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        
        // Verify creator data exists
        assert!(carlbundy8::creator_data_exists(CREATOR), 0);
        
        // Get resource address and verify game exists
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        assert!(carlbundy8::game_exists(resource_addr), 1);
        
        // Get game state and verify initial values
        let (creator_addr, total_deposit, ticket_price, timer_end, last_buyer, started) = 
            carlbundy8::get_game_state(resource_addr);
        
        assert!(creator_addr == CREATOR, 2);
        assert!(total_deposit == INITIAL_DEPOSIT, 3);
        assert!(ticket_price == TICKET_PRICE, 4);
        assert!(timer_end == 0, 5);
        assert!(last_buyer == CREATOR, 6);
        assert!(!started, 7);
    }    #[test(aptos_framework = @aptos_framework)]
    public fun test_start_game(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);
        
        // Get game state and verify started
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        let (_, _, _, timer_end, _, started) = carlbundy8::get_game_state(resource_addr);
        
        assert!(started, 0);
        assert!(timer_end == timestamp::now_seconds() + 120, 1);
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60068)] // E_GAME_ALREADY_STARTED
    public fun test_start_game_twice_fails(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);
        carlbundy8::start_game(&creator, CREATOR); // Should fail
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_buy_ticket(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Buy ticket
        carlbundy8::buy_ticket(&player, CREATOR);
        
        // Verify game state after purchase
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        let (_, total_deposit, _, _, last_buyer, started) = carlbundy8::get_game_state(resource_addr);
        
        assert!(started, 0);
        assert!(last_buyer == PLAYER1, 1);
        assert!(total_deposit == INITIAL_DEPOSIT + TICKET_PRICE, 2);
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x6006B)] // E_GAME_NOT_STARTED
    public fun test_buy_ticket_before_start_fails(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::buy_ticket(&player, CREATOR); // Should fail - game not started
    }    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60069)] // E_GAME_NOT_ENDED
    public fun test_buy_ticket_after_timer_expires_fails(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // Create and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Advance time past game end
        timestamp::fast_forward_seconds(121);

        // Try to buy ticket (should fail)
        carlbundy8::buy_ticket(&player, CREATOR);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_end_game(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Buy ticket
        carlbundy8::buy_ticket(&player, CREATOR);

        // Advance time past game end
        timestamp::fast_forward_seconds(121);

        // End game
        carlbundy8::end_game(&creator, CREATOR);

        // Verify game state after end
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        let (_, total_deposit, _, timer_end, last_buyer, started) = carlbundy8::get_game_state(resource_addr);

        assert!(!started, 0);
        assert!(total_deposit == 0, 1); // Funds should be distributed
        assert!(timer_end == 0, 2);
        assert!(last_buyer == CREATOR, 3);
    }    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60069)] // E_GAME_NOT_ENDED
    public fun test_end_game_before_timer_expires_fails(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Try to end game immediately (should fail)
        carlbundy8::end_game(&creator, CREATOR);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_restart_game(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // First game cycle
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);
        carlbundy8::buy_ticket(&player, CREATOR);
        timestamp::fast_forward_seconds(121);
        carlbundy8::end_game(&creator, CREATOR);

        // Restart game
        let new_ticket_price = TICKET_PRICE * 2;
        carlbundy8::initialize_game(&creator, new_ticket_price, INITIAL_DEPOSIT);

        // Verify restarted game state
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        let (_, total_deposit, ticket_price, timer_end, last_buyer, started) = 
            carlbundy8::get_game_state(resource_addr);

        assert!(!started, 0);
        assert!(total_deposit == INITIAL_DEPOSIT, 1);
        assert!(ticket_price == new_ticket_price, 2);
        assert!(timer_end == 0, 3);
        assert!(last_buyer == CREATOR, 4);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_multiple_players_buy_tickets(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player1 = account::create_signer_for_test(PLAYER1);
        let player2 = account::create_signer_for_test(PLAYER2);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Both players buy tickets
        carlbundy8::buy_ticket(&player1, CREATOR);
        carlbundy8::buy_ticket(&player2, CREATOR);

        // Verify game state
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        let (_, total_deposit, _, _, last_buyer, _) = carlbundy8::get_game_state(resource_addr);

        assert!(last_buyer == PLAYER2, 0); // Last buyer should be player2
        assert!(total_deposit == INITIAL_DEPOSIT + TICKET_PRICE * 2, 1); // Should include both ticket purchases
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_reward_distribution(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        let initial_player_balance = coin::balance<AptosCoin>(PLAYER1);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Player buys ticket
        carlbundy8::buy_ticket(&player, CREATOR);

        // Advance time and end game
        timestamp::fast_forward_seconds(121);
        carlbundy8::end_game(&creator, CREATOR);

        // Calculate expected reward (80% of total)
        let total_pot = INITIAL_DEPOSIT + TICKET_PRICE;
        let expected_reward = total_pot * 80 / 100;

        // Verify player received correct reward
        let final_player_balance = coin::balance<AptosCoin>(PLAYER1);
        assert!(final_player_balance == initial_player_balance - TICKET_PRICE + expected_reward, 0);
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60065)] // E_NOT_GAME_CREATOR
    public fun test_end_game_non_creator_fails(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let other = account::create_signer_for_test(PLAYER1);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Advance time
        timestamp::fast_forward_seconds(121);

        // Try to end game as non-creator (should fail)
        carlbundy8::end_game(&other, CREATOR);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_timer_extends_on_ticket_purchase(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player1 = account::create_signer_for_test(PLAYER1);
        let player2 = account::create_signer_for_test(PLAYER2);

        // Initialize and start game
        carlbundy8::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT);
        carlbundy8::start_game(&creator, CREATOR);

        // Player 1 buys ticket
        let before = timestamp::now_seconds();
        carlbundy8::buy_ticket(&player1, CREATOR);
        let resource_addr = carlbundy8::get_resource_address(CREATOR);
        let (_, _, _, timer_end1, _, _) = carlbundy8::get_game_state(resource_addr);
        assert!(timer_end1 == before + 120, 0); // Timer should be extended by 2 minutes

        // Advance time by 30 seconds
        timestamp::fast_forward_seconds(30);
        let mid = timestamp::now_seconds();
        carlbundy8::buy_ticket(&player2, CREATOR);
        let (_, _, _, timer_end2, _, _) = carlbundy8::get_game_state(resource_addr);
        assert!(timer_end2 == mid + 120, 1); // Timer should be extended again by 2 minutes from now
    }
}