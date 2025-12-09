// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../admin/AdminController.sol";
import "./OpinionMarket.sol";

import "./OpinionMarket.sol";

/**
 * @title OpinionMarketFactory
 * @notice Factory for deploying Opinion Markets (CLOB version)
 */
contract OpinionMarketFactory is AccessControl, ERC1155Holder {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public conditionalTokens;
    address public collateralToken;
    address public oracle;
    address public feeCollector;
    AdminController public adminController;

    mapping(bytes32 => bool) public usedSignatures;

    event MarketCreated(address indexed market, bytes32 indexed questionId, address creator);

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        address _oracle,
        address _feeCollector,
        address _adminController
    ) {
        conditionalTokens = _conditionalTokens;
        collateralToken = _collateralToken;
        oracle = _oracle;
        feeCollector = _feeCollector;
        adminController = AdminController(_adminController);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    struct MarketRequest {
        address creator;
        bytes32 questionId;
        uint256 feeAmount;
        uint256 deadline;
        bytes signature;
        bool exists;
    }

    mapping(bytes32 => MarketRequest) public marketRequests;

    event MarketRequested(bytes32 indexed questionId, address indexed creator, uint256 feeAmount);
    event MarketApproved(bytes32 indexed questionId, address indexed market);
    event MarketRejected(bytes32 indexed questionId, string reason);

    function requestMarket(
        bytes32 questionId, 
        uint256 feeAmount,
        uint256 deadline,
        bytes memory signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        require(!marketRequests[questionId].exists, "Request already exists");

        // Verify signature
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, questionId, feeAmount, deadline, block.chainid));
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        
        require(!usedSignatures[ethSignedHash], "Signature already used");
        usedSignatures[ethSignedHash] = true;

        address signer = ethSignedHash.recover(signature);
        require(adminController.hasRole(adminController.SIGNER_ROLE(), signer), "Invalid signature");

        // Collect Fee (USDC) from Creator to Factory (Escrow)
        if (feeAmount > 0) {
            require(IERC20(collateralToken).transferFrom(msg.sender, address(this), feeAmount), "Fee transfer failed");
        }

        marketRequests[questionId] = MarketRequest({
            creator: msg.sender,
            questionId: questionId,
            feeAmount: feeAmount,
            deadline: deadline,
            signature: signature,
            exists: true
        });

        emit MarketRequested(questionId, msg.sender, feeAmount);
    }

    function approveMarket(bytes32 questionId) external returns (address) {
        require(adminController.hasRole(adminController.DEFAULT_ADMIN_ROLE(), msg.sender), "Admin only");
        MarketRequest memory req = marketRequests[questionId];
        require(req.exists, "Request not found");

        // Get OrderBook address
        address orderBookAddr = adminController.orderBook();
        require(orderBookAddr != address(0), "OrderBook not set");

        // Create Market
        OpinionMarket market = new OpinionMarket(
            conditionalTokens,
            collateralToken,
            oracle,
            req.questionId,
            req.creator,
            orderBookAddr
        );
        address marketAddress = address(market);

        // Handle Initial Liquidity (Fee)
        if (req.feeAmount > 0) {
            // 1. Approve Market to spend Factory's USDC (held in escrow)
            IERC20(collateralToken).approve(marketAddress, req.feeAmount);

            // 2. Mint Sets (Factory receives YES and NO tokens)
            market.mintSets(req.feeAmount);

            address orderBookAddr = adminController.orderBook();
            require(orderBookAddr != address(0), "OrderBook not set");

            // 3. Approve OrderBook to spend Factory's Conditional Tokens
            IERC1155(conditionalTokens).setApprovalForAll(orderBookAddr, true);

            // 4. Place Sell Orders (Liquidity) FOR THE CREATOR
            // Factory pays (holds tokens), but Creator owns the order
            uint256 price = 500000; // 0.50 USDC
            
            IOrderBook(orderBookAddr).placeOrderFor(req.creator, marketAddress, 0, price, req.feeAmount, false);
            IOrderBook(orderBookAddr).placeOrderFor(req.creator, marketAddress, 1, price, req.feeAmount, false);
        }
        
        delete marketRequests[questionId];
        emit MarketCreated(marketAddress, req.questionId, req.creator);
        emit MarketApproved(req.questionId, marketAddress);
        return marketAddress;
    }

    function rejectMarket(bytes32 questionId, string memory reason) external {
        require(adminController.hasRole(adminController.DEFAULT_ADMIN_ROLE(), msg.sender), "Admin only");
        MarketRequest memory req = marketRequests[questionId];
        require(req.exists, "Request not found");

        // Refund Fee to Creator
        if (req.feeAmount > 0) {
            require(IERC20(collateralToken).transfer(req.creator, req.feeAmount), "Refund failed");
        }

        delete marketRequests[questionId];
        emit MarketRejected(questionId, reason);
    }
}
