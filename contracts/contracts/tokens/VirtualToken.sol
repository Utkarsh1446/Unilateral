// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VirtualToken
 * @notice Manages virtual liquidity for bootstrapping markets
 */
contract VirtualToken is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");

    mapping(address => uint256) public virtualLiquidity; // per market
    mapping(address => uint256) public realLiquidity; // per market

    uint256 public constant DECAY_FACTOR = 1e6;

    event VirtualLiquidityAdded(address indexed market, uint256 amount);
    event RealLiquidityUpdated(address indexed market, uint256 realAmount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Bootstraps a market with virtual liquidity
     * @param market The market address
     * @param amount The amount of virtual liquidity
     */
    function bootstrapMarket(address market, uint256 amount) external onlyRole(ADMIN_ROLE) {
        virtualLiquidity[market] = amount;
        emit VirtualLiquidityAdded(market, amount);
    }

    /**
     * @notice Updates the real liquidity for a market
     * @param market The market address
     * @param realAmount The new real liquidity amount
     */
    function updateRealLiquidity(address market, uint256 realAmount) external onlyRole(MARKET_ROLE) {
        realLiquidity[market] = realAmount;
        emit RealLiquidityUpdated(market, realAmount);
    }

    /**
     * @notice Calculates the effective liquidity for a market
     * @param market The market address
     * @return The effective liquidity (real + decayed virtual)
     */
    function getEffectiveLiquidity(address market) external view returns (uint256) {
        uint256 real = realLiquidity[market];
        uint256 virtualAmount = virtualLiquidity[market];
        
        // Decay formula: virtualWeight = virtual * DECAY_FACTOR / (real + 1)
        uint256 virtualWeight = (virtualAmount * DECAY_FACTOR) / (real + 1);
        
        return real + virtualWeight;
    }
}
