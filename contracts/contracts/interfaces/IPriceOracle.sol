// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPriceOracle
 * @notice Interface for querying historical BTC prices at specific timestamps
 * @dev Used by BTCMarketFactory to dynamically determine strike prices and resolve markets
 */
interface IPriceOracle {
    /**
     * @notice Get BTC/USD price at a specific timestamp
     * @param timestamp Unix timestamp in seconds
     * @return price BTC price in 8 decimals (e.g., 95000 * 10^8 = 9500000000000)
     */
    function getPriceAtTime(uint256 timestamp) external view returns (uint256 price);
    
    /**
     * @notice Compare prices at two timestamps and determine outcome
     * @param startTime First timestamp (market start)
     * @param endTime Second timestamp (market end)
     * @return isHigher True if price at endTime >= price at startTime (UP wins)
     * @return startPrice Price at startTime in 8 decimals
     * @return endPrice Price at endTime in 8 decimals
     */
    function comparePrices(
        uint256 startTime,
        uint256 endTime
    ) external view returns (
        bool isHigher,
        uint256 startPrice,
        uint256 endPrice
    );
    
    /**
     * @notice Check if oracle has data available for a given timestamp
     * @param timestamp Unix timestamp to check
     * @return available True if price data is available
     */
    function isPriceAvailable(uint256 timestamp) external view returns (bool available);
}
