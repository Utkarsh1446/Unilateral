// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CTHelpers
 * @notice Helper functions for Conditional Tokens
 */
library CTHelpers {
    /**
     * @notice Generates a deterministic token ID for an outcome
     * @param collateralToken The address of the collateral token (USDC)
     * @param conditionId The unique condition ID
     * @param index The index of the outcome (0 or 1 for binary)
     * @return tokenId The generated token ID
     */
    function getTokenId(IERC20 collateralToken, bytes32 conditionId, uint256 index) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(address(collateralToken), conditionId, 1 << index)));
    }

    /**
     * @notice Generates a condition ID
     * @param oracle The address of the oracle/resolver
     * @param questionId The unique question ID (e.g., from IPFS or internal)
     * @param outcomeSlotCount The number of outcome slots (usually 2)
     * @return conditionId The generated condition ID
     */
    function getConditionId(address oracle, bytes32 questionId, uint256 outcomeSlotCount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount));
    }
}
