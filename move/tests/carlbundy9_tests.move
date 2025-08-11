#[test_only]
module carl8::carlbundy9_tests {
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use carl8::carlbundy9;

    // Test constants
    const CREATOR: address = @0x123;
    const PLAYER1: address = @0x456;
    const PLAYER2: address = @0x789;
    const INITIAL_BALANCE: u64 = 1000000000;
    const TICKET_PRICE: u64 = 100000000;
    const INITIAL_DEPOSIT: u64 = 50000000;
    const TEST_GAME_ID: vector<u8> = b"test_game_1";

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
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        
        // Verify creator data exists
        assert!(carlbundy9::creator_data_exists(CREATOR), 0);
        
        // Get resource address and verify game exists
        let resource_addr = carlbundy9::get_resource_address(CREATOR);
        assert!(carlbundy9::game_exists(resource_addr), 1);
        
        // Get game state and verify initial values
        let (creator_addr, total_deposit, ticket_price, timer_end, last_buyer, started) = 
            carlbundy9::get_game_state(resource_addr);
        
        assert!(creator_addr == CREATOR, 2);
        assert!(total_deposit == INITIAL_DEPOSIT, 3);
        assert!(ticket_price == TICKET_PRICE, 4);
        assert!(timer_end == 0, 5);
        assert!(last_buyer == CREATOR, 6);
        assert!(!started, 7);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_start_game(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        // Initialize and start game
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        
        // Get game state and verify started
        let resource_addr = carlbundy9::get_resource_address(CREATOR);
        let (_, _, _, timer_end, _, started) = carlbundy9::get_game_state(resource_addr);
        
        assert!(started, 0);
        assert!(timer_end == timestamp::now_seconds() + 120, 1);
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60068)] // E_GAME_ALREADY_STARTED
    public fun test_start_game_twice_fails(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        carlbundy9::start_game(&creator, CREATOR); // Should fail
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_buy_ticket(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // Initialize and start game
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        
        // Buy ticket
        carlbundy9::buy_ticket(&player, CREATOR);
        
        // Get game state and verify values after buying ticket
        let resource_addr = carlbundy9::get_resource_address(CREATOR);
        let (_, total_deposit, _, _, last_buyer, started) = carlbundy9::get_game_state(resource_addr);
        
        assert!(total_deposit == INITIAL_DEPOSIT + TICKET_PRICE, 0);
        assert!(last_buyer == PLAYER1, 1);
        assert!(started, 2);
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x6006B)] // E_GAME_NOT_STARTED
    public fun test_buy_ticket_fail_game_not_started(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::buy_ticket(&player, CREATOR); // Should fail - game not started
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x6006A)] // E_INSUFFICIENT_FUNDS
    public fun test_buy_ticket_fail_insufficient_balance(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // Initialize and start game
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);

        // Deplete player's balance
        let amount = coin::balance<AptosCoin>(PLAYER1) - TICKET_PRICE + 1;
        coin::transfer<AptosCoin>(&player, CREATOR, amount);

        carlbundy9::buy_ticket(&player, CREATOR);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_game_end(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);
        let initial_balance = coin::balance<AptosCoin>(PLAYER1);

        // Initialize and start game
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        
        // Buy ticket and end game
        carlbundy9::buy_ticket(&player, CREATOR);
        
        // Wait for timer to expire
        timestamp::fast_forward_seconds(121);
        
        // Record player balance before end game
        let balance_before = coin::balance<AptosCoin>(PLAYER1);
        
        carlbundy9::end_game(&creator, CREATOR);
        
        // Get game state and verify values after end
        let resource_addr = carlbundy9::get_resource_address(CREATOR);
        let (_, total_deposit, _, timer_end, last_buyer, started) = carlbundy9::get_game_state(resource_addr);
        
        // Game state after end
        assert!(total_deposit == 0, 0); // All funds should be distributed
        assert!(timer_end == 0, 1); // Timer should be reset
        assert!(last_buyer == CREATOR, 2); // Last buyer should be reset to creator
        assert!(!started, 3); // Game should be not started

        // Verify player received 80% of the total prize pool
        let total_prize = INITIAL_DEPOSIT + TICKET_PRICE;
        let expected_reward = total_prize * 80 / 100;
        assert!(coin::balance<AptosCoin>(PLAYER1) == balance_before + expected_reward, 4);
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60069)] // E_GAME_NOT_ENDED
    public fun test_game_end_fail_timer_not_expired(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);

        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        carlbundy9::end_game(&creator, CREATOR); // Should fail - timer not expired
    }

    #[test(aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x60065)] // E_NOT_GAME_CREATOR
    public fun test_game_end_fail_not_creator(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let other = account::create_signer_for_test(PLAYER1);

        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        timestamp::fast_forward_seconds(121);
        carlbundy9::end_game(&other, CREATOR); // Should fail - not creator
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_reset_game(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player = account::create_signer_for_test(PLAYER1);

        // Initialize and play first game
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        carlbundy9::buy_ticket(&player, CREATOR);
        timestamp::fast_forward_seconds(121);
        carlbundy9::end_game(&creator, CREATOR);

        // Initialize new game with different price
        let new_ticket_price = TICKET_PRICE * 2;
        carlbundy9::initialize_game(&creator, new_ticket_price, INITIAL_DEPOSIT, TEST_GAME_ID);
        
        // Get game state and verify values reset
        let resource_addr = carlbundy9::get_resource_address(CREATOR);
        let (creator_addr, total_deposit, ticket_price, timer_end, last_buyer, started) = 
            carlbundy9::get_game_state(resource_addr);
        
        assert!(creator_addr == CREATOR, 0);
        assert!(total_deposit == INITIAL_DEPOSIT, 1);
        assert!(ticket_price == new_ticket_price, 2);
        assert!(timer_end == 0, 3);
        assert!(last_buyer == CREATOR, 4);
        assert!(!started, 5);
    }

    #[test(aptos_framework = @aptos_framework)]
    public fun test_last_buyer_updated(aptos_framework: &signer) {
        setup(aptos_framework);
        let creator = account::create_signer_for_test(CREATOR);
        let player1 = account::create_signer_for_test(PLAYER1);
        let player2 = account::create_signer_for_test(PLAYER2);

        // Initialize and start game
        carlbundy9::initialize_game(&creator, TICKET_PRICE, INITIAL_DEPOSIT, TEST_GAME_ID);
        carlbundy9::start_game(&creator, CREATOR);
        
        // Buy tickets with both players
        carlbundy9::buy_ticket(&player1, CREATOR);
        let resource_addr = carlbundy9::get_resource_address(CREATOR);
        let (_, _, _, timer_end1, _, _) = carlbundy9::get_game_state(resource_addr);

        // Wait for some time but not enough to expire
        timestamp::fast_forward_seconds(60);
        
        carlbundy9::buy_ticket(&player2, CREATOR);
        let (_, total_deposit, _, timer_end2, last_buyer, _) = carlbundy9::get_game_state(resource_addr);
        
        assert!(total_deposit == INITIAL_DEPOSIT + TICKET_PRICE * 2, 0);
        assert!(last_buyer == PLAYER2, 1);
        assert!(timer_end2 > timer_end1, 2); // Timer should be extended
    }
}
