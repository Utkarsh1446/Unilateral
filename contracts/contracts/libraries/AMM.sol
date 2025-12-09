// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AMM
 * @notice AMM logic with virtual liquidity support for Opinion Markets
 */
library AMM {
    uint256 public constant DECAY_FACTOR = 1e6;

    /**
     * @notice Calculates the effective liquidity for a market outcome
     * @param realLiquidity The real liquidity (USDC) in the pool
     * @param virtualLiquidity The initial virtual liquidity amount
     * @return effectiveLiquidity The combined effective liquidity
     */
    function getEffectiveLiquidity(uint256 realLiquidity, uint256 virtualLiquidity) internal pure returns (uint256) {
        // Use constant virtual liquidity to ensure monotonic price curve.
        // E = R + V
        return realLiquidity + virtualLiquidity;
    }

    /**
     * @notice Calculates the cost to buy outcome tokens
     * @dev Uses a simplified CPMM-like pricing or fixed-product depending on exact market design.
     *      For this v1.2 implementation, we'll assume a standard CPMM where Price = PoolB / (PoolA + PoolB).
     *      However, the spec mentions "Price = S^2 / 1400" for Creator Shares, but for Opinion Markets it implies an AMM.
     *      Let's implement a basic CPMM price quote.
     */
    function getQuote(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountOut) {
        // CPMM: x * y = k
        // (x + dx) * (y - dy) = k
        // y - dy = k / (x + dx)
        // dy = y - (k / (x + dx))
        // dy = y - (x * y) / (x + dx)
        // dy = (y * dx) / (x + dx)
        
        uint256 amountInWithFee = amountIn * 985; // 1.5% fee is handled outside or here? Spec says 1.5% fee.
        // Let's calculate raw output and handle fees in the contract.
        
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }
}
