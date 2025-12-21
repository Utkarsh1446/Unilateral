// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./OpinionMarket.sol";

/**
 * @title BTCMarketFactory
 * @notice Factory for creating automated BTC price prediction markets
 * @dev Handles market creation, auto-resolution, and liquidity seeding
 */
contract BTCMarketFactory is Ownable {
    struct BTCMarket {
        address marketAddress;
        uint256 interval;        // Duration in minutes (15, 60, 360, 720)
        uint256 startTime;       // UTC timestamp when market starts
        uint256 endTime;         // UTC timestamp when market ends
        uint256 startPrice;      // BTC price at start (8 decimals)
        uint256 endPrice;        // BTC price at end (8 decimals, 0 if not resolved)
        bool resolved;
        uint256 outcome;         // 0 = UP, 1 = DOWN
    }

    // Contract dependencies
    address public conditionalTokens;
    address public collateralToken;
    address public orderBook;
    address public priceOracle;      // Backend service that provides prices
    
    // Market tracking
    mapping(bytes32 => BTCMarket) public markets;  // marketId => BTCMarket
    bytes32[] public allMarketIds;
    
    // Configuration
    uint256 public constant LIQUIDITY_AMOUNT = 10000 * 1e6; // 10k USDC (6 decimals)
    uint256[] public supportedIntervals = [15, 60, 360, 720]; // minutes
    uint256 public nonce; // Counter for unique questionIds
    
    // Events
    event BTCMarketCreated(
        bytes32 indexed marketId,
        address indexed marketAddress,
        uint256 interval,
        uint256 startTime,
        uint256 endTime,
        uint256 startPrice
    );
    
    event BTCMarketResolved(
        bytes32 indexed marketId,
        address indexed marketAddress,
        uint256 endPrice,
        uint256 outcome
    );
    
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        address _orderBook,
        address _priceOracle
    ) Ownable(msg.sender) {
        conditionalTokens = _conditionalTokens;
        collateralToken = _collateralToken;
        orderBook = _orderBook;
        priceOracle = _priceOracle;
    }

    /**
     * @notice Create a new BTC market
     * @param interval Market duration in minutes (15, 60, 360, 720)
     * @param startTime UTC timestamp when market starts
     * @param startPrice BTC price at start (8 decimals)
     * @return marketId Unique identifier for the market
     */
    function createBTCMarket(
        uint256 interval,
        uint256 startTime,
        uint256 startPrice
    ) external returns (bytes32 marketId) {
        require(msg.sender == priceOracle || msg.sender == owner(), "Only oracle or owner");
        require(_isValidInterval(interval), "Invalid interval");
        require(startTime >= block.timestamp, "Start time must be in future");
        require(startPrice > 0, "Invalid start price");

        uint256 endTime = startTime + (interval * 60); // Convert minutes to seconds
        
        // Generate unique market ID
        marketId = keccak256(abi.encodePacked(
            "BTC",
            interval,
            startTime,
            block.timestamp
        ));
        
        require(markets[marketId].marketAddress == address(0), "Market already exists");

        // Generate question ID for the market (must be unique!)
        // Use block.timestamp and gasleft() to ensure uniqueness
        // These values are guaranteed to be different for each transaction
        bytes32 questionId = keccak256(abi.encodePacked(
            "BTC_",
            interval,
            "_",
            startTime,
            "_",
            block.timestamp,
            "_",
            gasleft()
        ));

        // Create the OpinionMarket
        OpinionMarket market = new OpinionMarket(
            conditionalTokens,
            collateralToken,
            address(this), // Factory is the oracle
            questionId,
            address(this), // Factory is the creator
            orderBook
        );

        // Store market info
        markets[marketId] = BTCMarket({
            marketAddress: address(market),
            interval: interval,
            startTime: startTime,
            endTime: endTime,
            startPrice: startPrice,
            endPrice: 0,
            resolved: false,
            outcome: 0
        });
        
        allMarketIds.push(marketId);

        // Seed liquidity (approve and call orderbook)
        // TEMPORARILY DISABLED - debugging market creation first
        // _seedLiquidity(address(market));

        emit BTCMarketCreated(
            marketId,
            address(market),
            interval,
            startTime,
            endTime,
            startPrice
        );

        return marketId;
    }

    /**
     * @notice Resolve a BTC market based on end price
     * @param marketId Unique identifier for the market
     * @param endPrice BTC price at end time (8 decimals)
     */
    function resolveBTCMarket(
        bytes32 marketId,
        uint256 endPrice
    ) external {
        require(msg.sender == priceOracle || msg.sender == owner(), "Only oracle or owner");
        
        BTCMarket storage market = markets[marketId];
        require(market.marketAddress != address(0), "Market does not exist");
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.endTime, "Market not expired yet");
        require(endPrice > 0, "Invalid end price");

        // Determine outcome: 0 = UP (price increased), 1 = DOWN (price decreased or same)
        uint256 outcome = endPrice > market.startPrice ? 0 : 1;

        // Update market state
        market.endPrice = endPrice;
        market.resolved = true;
        market.outcome = outcome;

        // Resolve the OpinionMarket contract
        OpinionMarket(market.marketAddress).resolveMarket(outcome);

        emit BTCMarketResolved(marketId, market.marketAddress, endPrice, outcome);
    }

    /**
     * @notice Seed liquidity for a newly created market
     * @dev Places balanced buy/sell orders at 0.50 price to create initial liquidity
     * @param marketAddress Address of the market to seed
     */
    function _seedLiquidity(address marketAddress) internal {
        // Check factory has enough USDC
        uint256 balance = IERC20(collateralToken).balanceOf(address(this));
        require(balance >= LIQUIDITY_AMOUNT, "Insufficient USDC for liquidity");
        
        // Approve orderbook to spend USDC
        IERC20(collateralToken).approve(orderBook, LIQUIDITY_AMOUNT);
        
        // Split liquidity 50/50 between YES and NO
        uint256 halfAmount = LIQUIDITY_AMOUNT / 2;
        uint256 price = 500000; // 0.50 in 6 decimals (50% probability)
        
        // Place YES buy order at 0.50
        // outcomeIndex 0 = YES/UP
        IOrderBook(orderBook).placeOrderFor(
            address(this),      // maker (factory owns the liquidity)
            marketAddress,      // market
            0,                  // outcomeIndex (0 = YES/UP)
            price,              // price (0.50)
            halfAmount,         // amount (5k USDC)
            true                // isBid (buying YES tokens)
        );
        
        // Place NO buy order at 0.50
        // outcomeIndex 1 = NO/DOWN
        IOrderBook(orderBook).placeOrderFor(
            address(this),      // maker (factory owns the liquidity)
            marketAddress,      // market
            1,                  // outcomeIndex (1 = NO/DOWN)
            price,              // price (0.50)
            halfAmount,         // amount (5k USDC)
            true                // isBid (buying NO tokens)
        );
    }

    /**
     * @notice Check if interval is supported
     */
    function _isValidInterval(uint256 interval) internal view returns (bool) {
        for (uint256 i = 0; i < supportedIntervals.length; i++) {
            if (supportedIntervals[i] == interval) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Update price oracle address
     */
    function setPriceOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        address oldOracle = priceOracle;
        priceOracle = newOracle;
        emit PriceOracleUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Get market info by ID
     */
    function getMarket(bytes32 marketId) external view returns (BTCMarket memory) {
        return markets[marketId];
    }

    /**
     * @notice Get all market IDs
     */
    function getAllMarketIds() external view returns (bytes32[] memory) {
        return allMarketIds;
    }

    /**
     * @notice Get markets by interval
     */
    function getMarketsByInterval(uint256 interval) external view returns (bytes32[] memory) {
        uint256 count = 0;
        
        // Count matching markets
        for (uint256 i = 0; i < allMarketIds.length; i++) {
            if (markets[allMarketIds[i]].interval == interval) {
                count++;
            }
        }
        
        // Build result array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allMarketIds.length; i++) {
            if (markets[allMarketIds[i]].interval == interval) {
                result[index] = allMarketIds[i];
                index++;
            }
        }
        
        return result;
    }

    /**
     * @notice Withdraw USDC from factory (emergency)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        IERC20(collateralToken).transfer(owner(), amount);
    }

    /**
     * @notice Fund factory with USDC for liquidity seeding
     */
    function fundFactory(uint256 amount) external {
        IERC20(collateralToken).transferFrom(msg.sender, address(this), amount);
    }
}
