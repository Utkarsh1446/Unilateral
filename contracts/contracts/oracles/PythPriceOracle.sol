// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IPriceOracle.sol";

/**
 * @title IPyth
 * @notice Minimal interface for Pyth Network price feeds
 * @dev See https://docs.pyth.network/price-feeds/solidity-sdk
 */
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    function getPriceNoOlderThan(
        bytes32 id,
        uint256 age
    ) external view returns (Price memory price);

    function getPrice(bytes32 id) external view returns (Price memory price);
}

/**
 * @title PythPriceOracle
 * @notice Oracle implementation using Pyth Network for BTC/USD prices
 * @dev Fetches historical prices and converts to 8-decimal format
 * 
 * Pyth Network on Base Sepolia:
 * - Pyth Contract: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
 * - BTC/USD Price Feed ID: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
 */
contract PythPriceOracle is IPriceOracle {
    IPyth public immutable pyth;
    bytes32 public immutable btcUsdPriceId;
    
    // Price staleness tolerance (24 hours)
    uint256 public constant MAX_PRICE_AGE = 24 hours;
    
    // Pyth uses variable exponents, we normalize to 8 decimals
    uint256 public constant TARGET_DECIMALS = 8;
    
    event PriceQueried(uint256 timestamp, uint256 price);
    
    /**
     * @notice Initialize oracle with Pyth contract and BTC/USD feed ID
     * @param _pyth Address of Pyth contract on Base Sepolia
     * @param _btcUsdPriceId Pyth price feed ID for BTC/USD
     */
    constructor(address _pyth, bytes32 _btcUsdPriceId) {
        require(_pyth != address(0), "Invalid Pyth address");
        pyth = IPyth(_pyth);
        btcUsdPriceId = _btcUsdPriceId;
    }
    
    /**
     * @notice Get BTC/USD price at a specific timestamp
     * @dev For now, returns latest price. In production, would query historical data
     * @param timestamp Unix timestamp (currently unused, returns latest)
     * @return price BTC price in 8 decimals
     */
    function getPriceAtTime(uint256 timestamp) external view override returns (uint256 price) {
        // Get latest price from Pyth
        IPyth.Price memory pythPrice = pyth.getPriceNoOlderThan(btcUsdPriceId, MAX_PRICE_AGE);
        
        // Convert Pyth price to 8 decimals
        price = _convertPythPrice(pythPrice);
        
        // Note: timestamp parameter is for future historical price queries
        // For testnet, we use latest price as approximation
        // In production, integrate with Pyth's historical price API
        
        return price;
    }
    
    /**
     * @notice Compare prices at two timestamps
     * @param startTime Market start timestamp
     * @param endTime Market end timestamp
     * @return isHigher True if endPrice >= startPrice
     * @return startPrice Price at start in 8 decimals
     * @return endPrice Price at end in 8 decimals
     */
    function comparePrices(
        uint256 startTime,
        uint256 endTime
    ) external view override returns (
        bool isHigher,
        uint256 startPrice,
        uint256 endPrice
    ) {
        require(endTime > startTime, "End time must be after start time");
        
        // Get prices at both timestamps
        startPrice = this.getPriceAtTime(startTime);
        endPrice = this.getPriceAtTime(endTime);
        
        // Determine if price went up
        isHigher = endPrice >= startPrice;
        
        return (isHigher, startPrice, endPrice);
    }
    
    /**
     * @notice Check if price data is available for timestamp
     * @dev For testnet, always returns true if Pyth has recent data
     * @param timestamp Timestamp to check
     * @return available True if data is available
     */
    function isPriceAvailable(uint256 timestamp) external view override returns (bool available) {
        try pyth.getPriceNoOlderThan(btcUsdPriceId, MAX_PRICE_AGE) returns (IPyth.Price memory) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Convert Pyth price format to 8 decimals
     * @param pythPrice Pyth price struct with dynamic exponent
     * @return price Normalized price in 8 decimals
     */
    function _convertPythPrice(IPyth.Price memory pythPrice) internal pure returns (uint256 price) {
        require(pythPrice.price > 0, "Invalid price from Pyth");
        
        // Pyth price = price * 10^expo
        // We want: price * 10^8
        
        int256 priceValue = int256(int64(pythPrice.price));
        int32 expo = pythPrice.expo;
        
        // Calculate adjustment needed to get to 8 decimals
        int32 adjustment = int32(int256(TARGET_DECIMALS)) + expo;
        
        if (adjustment >= 0) {
            // Need to multiply
            price = uint256(priceValue) * (10 ** uint32(adjustment));
        } else {
            // Need to divide
            price = uint256(priceValue) / (10 ** uint32(-adjustment));
        }
        
        return price;
    }
    
    /**
     * @notice Get current BTC price (for testing/debugging)
     * @return price Current BTC price in 8 decimals
     */
    function getCurrentPrice() external view returns (uint256 price) {
        IPyth.Price memory pythPrice = pyth.getPriceNoOlderThan(btcUsdPriceId, MAX_PRICE_AGE);
        return _convertPythPrice(pythPrice);
    }
}
