// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/CTHelpers.sol";
import "hardhat/console.sol";

/**
 * @title ConditionalTokens
 * @notice ERC-1155 implementation for conditional outcome tokens
 */
contract ConditionalTokens is ERC1155 {
    struct Condition {
        address oracle;
        bytes32 questionId;
        uint256 outcomeSlotCount;
    }

    mapping(bytes32 => Condition) public conditions;
    mapping(bytes32 => uint256[]) public payoutNumerators;
    uint256 constant PAYOUT_DENOMINATOR = 1e6;

    event PositionSplit(address indexed user, bytes32 indexed conditionId, uint256 amount);
    event PositionMerged(address indexed user, bytes32 indexed conditionId, uint256 amount);
    event PositionRedeemed(address indexed user, bytes32 indexed conditionId, uint256 totalPayout);
    event ConditionPrepared(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount);
    event ConditionResolved(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256[] payoutNumerators);

    constructor() ERC1155("") {}

    function prepareCondition(address oracle, bytes32 questionId, uint256 outcomeSlotCount) external {
        require(outcomeSlotCount > 1, "Outcome slot count must be greater than 1");
        require(outcomeSlotCount <= 256, "Outcome slot count too large");
        
        bytes32 conditionId = CTHelpers.getConditionId(oracle, questionId, outcomeSlotCount);
        require(conditions[conditionId].oracle == address(0), "Condition already prepared");

        conditions[conditionId] = Condition({
            oracle: oracle,
            questionId: questionId,
            outcomeSlotCount: outcomeSlotCount
        });

        emit ConditionPrepared(conditionId, oracle, questionId, outcomeSlotCount);
    }

    // import "hardhat/console.sol";

    function splitPosition(IERC20 collateralToken, bytes32 conditionId, uint256 amount) external {
        console.log("SplitPosition called");
        Condition storage condition = conditions[conditionId];
        require(condition.oracle != address(0), "Condition not prepared");
        console.log("Condition prepared");
        
        console.log("Transferring from:", msg.sender);
        console.log("To:", address(this));
        console.log("Amount:", amount);
        
        bool success = collateralToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        console.log("Transfer success");

        uint256[] memory ids = new uint256[](condition.outcomeSlotCount);
        uint256[] memory amounts = new uint256[](condition.outcomeSlotCount);

        for (uint256 i = 0; i < condition.outcomeSlotCount; i++) {
            ids[i] = CTHelpers.getTokenId(collateralToken, conditionId, i);
            amounts[i] = amount;
            console.log("Token ID:", ids[i]);
        }

        console.log("Minting batch...");
        _mintBatch(msg.sender, ids, amounts, "");
        console.log("Minted");

        emit PositionSplit(msg.sender, conditionId, amount);
    }

    function mergePositions(IERC20 collateralToken, bytes32 conditionId, uint256 amount) external {
        Condition storage condition = conditions[conditionId];
        require(condition.oracle != address(0), "Condition not prepared");

        uint256[] memory ids = new uint256[](condition.outcomeSlotCount);
        uint256[] memory amounts = new uint256[](condition.outcomeSlotCount);

        for (uint256 i = 0; i < condition.outcomeSlotCount; i++) {
            ids[i] = CTHelpers.getTokenId(collateralToken, conditionId, i);
            amounts[i] = amount;
        }

        _burnBatch(msg.sender, ids, amounts);

        require(collateralToken.transfer(msg.sender, amount), "Transfer failed");

        emit PositionMerged(msg.sender, conditionId, amount);
    }

    function redeemPositions(IERC20 collateralToken, bytes32 conditionId, uint256[] calldata outcomeIndexes) external {
        uint256[] storage payouts = payoutNumerators[conditionId];
        require(payouts.length > 0, "Condition not resolved");

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < outcomeIndexes.length; i++) {
            uint256 index = outcomeIndexes[i];
            uint256 tokenId = CTHelpers.getTokenId(collateralToken, conditionId, index);
            uint256 balance = balanceOf(msg.sender, tokenId);
            
            if (balance > 0) {
                _burn(msg.sender, tokenId, balance);
                totalPayout += (balance * payouts[index]) / PAYOUT_DENOMINATOR;
            }
        }

        if (totalPayout > 0) {
            require(collateralToken.transfer(msg.sender, totalPayout), "Transfer failed");
        }
        
        emit PositionRedeemed(msg.sender, conditionId, totalPayout);
    }

    function reportPayouts(bytes32 questionId, uint256[] calldata payouts) external {
        // Reconstruct conditionId to find the condition
        // We need the oracle and outcomeSlotCount. 
        // Since we don't have them passed in, we might need to store a mapping from questionId to conditionId?
        // Or pass them in. The spec says "Oracle/admin sets payout numerators for conditionId".
        // Let's change the signature to take conditionId.
        revert("Use reportPayoutsByConditionId");
    }

    function reportPayoutsByConditionId(bytes32 conditionId, uint256[] calldata payouts) external {
        Condition storage condition = conditions[conditionId];
        require(condition.oracle != address(0), "Condition not prepared");
        require(msg.sender == condition.oracle, "Only oracle can report");
        require(payoutNumerators[conditionId].length == 0, "Condition already resolved");
        require(payouts.length == condition.outcomeSlotCount, "Invalid payout length");

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < payouts.length; i++) {
            totalPayout += payouts[i];
        }
        require(totalPayout == PAYOUT_DENOMINATOR, "Payouts must sum to denominator");

        payoutNumerators[conditionId] = payouts;
        emit ConditionResolved(conditionId, msg.sender, condition.questionId, payouts);
    }
}
