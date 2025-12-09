// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BondingCurve
 * @notice Implements the bonding curve formula using closed-form integrals
 * @dev Price(x) = BASE_PRICE + (x^2 / DIVISOR)
 *      Total cost to buy from supply to supply+amount = integral of Price(x) from supply to supply+amount
 *      = BASE_PRICE * amount + (1/DIVISOR) * ((supply+amount)^3 - supply^3) / 3
 */
library BondingCurve {
    uint256 public constant DIVISOR = 1400;
    uint256 public constant BASE_PRICE = 1e6; // 1 USDC base price per token
    uint256 public constant PRECISION = 1e18; // Token precision

    /**
     * @notice Calculates the spot price for the current supply level
     * @param supply The current supply of shares (in wei)
     * @return price The price per share at this supply level (in USDC with 6 decimals)
     */
    function getPrice(uint256 supply) internal pure returns (uint256 price) {
        // Convert supply to whole tokens for pricing
        uint256 supplyTokens = supply / PRECISION;
        return BASE_PRICE + (supplyTokens * supplyTokens * 1e6) / DIVISOR;
    }

    /**
     * @notice Calculates the total cost to buy an amount of shares
     * @dev Uses closed-form integral: sum of n^2 from a to b = (b*(b+1)*(2b+1) - a*(a+1)*(2a+1)) / 6
     * @param supply The current supply of shares (in wei)
     * @param amount The amount of shares to buy (in wei)
     * @return cost The total cost in USDC (6 decimals)
     */
    function getBuyPrice(uint256 supply, uint256 amount) internal pure returns (uint256 cost) {
        // Convert to whole token units for calculation
        uint256 startTokens = supply / PRECISION;
        uint256 endTokens = (supply + amount) / PRECISION;
        uint256 tokensToBy = endTokens - startTokens;
        
        if (tokensToBy == 0) {
            // Buying less than 1 full token - use linear interpolation from current price
            return (getPrice(supply) * amount) / PRECISION;
        }
        
        // Base cost = BASE_PRICE * number of tokens
        cost = BASE_PRICE * tokensToBy;
        
        // Add bonding curve premium using sum of squares formula
        // sum(i^2) from startTokens to endTokens-1 = sumSquares(endTokens-1) - sumSquares(startTokens-1)
        // where sumSquares(n) = n*(n+1)*(2n+1)/6
        if (endTokens > 0) {
            uint256 endSum = sumOfSquares(endTokens - 1);
            uint256 startSum = startTokens > 0 ? sumOfSquares(startTokens - 1) : 0;
            cost += ((endSum - startSum) * 1e6) / DIVISOR;
        }
    }

    /**
     * @notice Calculates the revenue from selling an amount of shares
     * @param supply The current supply of shares (in wei)
     * @param amount The amount of shares to sell (in wei)
     * @return revenue The total revenue in USDC (6 decimals)
     */
    function getSellPrice(uint256 supply, uint256 amount) internal pure returns (uint256 revenue) {
        require(supply >= amount, "Insufficient supply");
        
        uint256 startTokens = (supply - amount) / PRECISION;
        uint256 endTokens = supply / PRECISION;
        uint256 tokensToSell = endTokens - startTokens;
        
        if (tokensToSell == 0) {
            // Selling less than 1 full token
            return (getPrice(supply - amount) * amount) / PRECISION;
        }
        
        // Base revenue = BASE_PRICE * number of tokens
        revenue = BASE_PRICE * tokensToSell;
        
        // Add bonding curve component
        if (endTokens > 0) {
            uint256 endSum = sumOfSquares(endTokens - 1);
            uint256 startSum = startTokens > 0 ? sumOfSquares(startTokens - 1) : 0;
            revenue += ((endSum - startSum) * 1e6) / DIVISOR;
        }
    }
    
    /**
     * @notice Computes the sum of squares from 0 to n: n*(n+1)*(2n+1)/6
     */
    function sumOfSquares(uint256 n) internal pure returns (uint256) {
        return (n * (n + 1) * (2 * n + 1)) / 6;
    }
}
