// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../tokens/ConditionalTokens.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../libraries/CTHelpers.sol";

/**
 * @title OpinionMarket
 * @notice Prediction market using CLOB (via OrderBook)
 */
interface IOrderBook {
    function cancelAllOrdersForMarket(address market) external;
    function placeOrder(
        address market,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        bool isBid
    ) external returns (uint256);
    function placeOrderFor(
        address maker,
        address market,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        bool isBid
    ) external returns (uint256);
}

contract OpinionMarket is ERC1155Holder {
    ConditionalTokens public conditionalTokens;
    IERC20 public collateralToken;
    
    bytes32 public conditionId;
    bytes32 public questionId;
    address public oracle;
    address public creator;
    
    enum State { Open, ResolutionProposed, Disputed, Resolved }
    State public state;
    bool public resolved;
    
    uint256 public resolutionTimestamp;
    uint256 public constant DISPUTE_WINDOW = 6 hours;
    
    uint256 public proposedOutcome;
    
    event ResolutionProposed(uint256 outcome, uint256 timestamp);
    event ResolutionDisputed(address indexed disputer);
    event MarketResolved(uint256 outcome);

    address public orderBook;

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        address _oracle,
        bytes32 _questionId,
        address _creator,
        address _orderBook
    ) {
        conditionalTokens = ConditionalTokens(_conditionalTokens);
        collateralToken = IERC20(_collateralToken);
        oracle = _oracle;
        questionId = _questionId;
        creator = _creator;
        orderBook = _orderBook;
        state = State.Open;
        
        // Prepare condition (binary)
        // OpinionMarket itself is the oracle for ConditionalTokens
        conditionalTokens.prepareCondition(address(this), questionId, 2);
        conditionId = keccak256(abi.encodePacked(address(this), questionId, uint256(2)));
    }

    // Admin proposes resolution
    function proposeResolution(uint256 outcome) external {
        require(msg.sender == oracle, "Only oracle/admin can propose");
        require(state == State.Open || state == State.Disputed, "Invalid state");
        require(outcome < 2, "Invalid outcome");
        
        proposedOutcome = outcome;
        state = State.ResolutionProposed;
        resolutionTimestamp = block.timestamp;
        
        emit ResolutionProposed(outcome, block.timestamp);
    }

    // Any user can dispute within window
    function disputeResolution() external {
        require(state == State.ResolutionProposed, "Not in proposed state");
        require(block.timestamp < resolutionTimestamp + DISPUTE_WINDOW, "Dispute window closed");
        
        state = State.Disputed;
        emit ResolutionDisputed(msg.sender);
    }

    // Finalize after window passes
    function finalizeResolution() external {
        require(state == State.ResolutionProposed, "Not in proposed state");
        require(block.timestamp >= resolutionTimestamp + DISPUTE_WINDOW, "Dispute window active");
        
        _resolve(proposedOutcome);
    }

    // Internal resolution logic
    function _resolve(uint256 outcome) internal {
        state = State.Resolved;
        resolved = true;
        
        // Cancel all pending orders and refund makers
        if (orderBook != address(0)) {
            try IOrderBook(orderBook).cancelAllOrdersForMarket(address(this)) {
                // Success
            } catch {
                // If it fails, we shouldn't block resolution, but we should probably log it.
                // For now, let's assume it works or revert if critical.
                // Reverting is safer to ensure funds aren't stuck.
                revert("Failed to cancel orders");
            }
        }
        
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = outcome == 0 ? 1000000 : 0; // YES
        payouts[1] = outcome == 1 ? 1000000 : 0; // NO
        
        conditionalTokens.reportPayoutsByConditionId(conditionId, payouts);
        emit MarketResolved(outcome);
    }

    // Mint Sets: Convert USDC -> YES + NO
    function mintSets(uint256 amount) external {
        require(state == State.Open, "Market not open");
        require(amount > 0, "Amount must be > 0");
        
        // 1. Transfer USDC from user
        require(collateralToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // 2. Approve ConditionalTokens
        collateralToken.approve(address(conditionalTokens), amount);
        
        // 3. Split Position
        conditionalTokens.splitPosition(collateralToken, conditionId, amount);
        
        // 4. Transfer YES and NO to user
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        
        ids[0] = CTHelpers.getTokenId(collateralToken, conditionId, 0);
        ids[1] = CTHelpers.getTokenId(collateralToken, conditionId, 1);
        amounts[0] = amount;
        amounts[1] = amount;
        
        conditionalTokens.safeBatchTransferFrom(address(this), msg.sender, ids, amounts, "");
    }

    // Redeem Sets: Convert YES + NO -> USDC
    function redeemSets(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // 1. Transfer YES and NO from user
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        
        ids[0] = CTHelpers.getTokenId(collateralToken, conditionId, 0);
        ids[1] = CTHelpers.getTokenId(collateralToken, conditionId, 1);
        amounts[0] = amount;
        amounts[1] = amount;
        
        conditionalTokens.safeBatchTransferFrom(msg.sender, address(this), ids, amounts, "");
        
        // 2. Merge Positions
        conditionalTokens.mergePositions(collateralToken, conditionId, amount);
        
        // 3. Transfer USDC to user
        require(collateralToken.transfer(msg.sender, amount), "Transfer failed");
    }
}
