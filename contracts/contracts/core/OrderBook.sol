// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IOpinionMarket {
    function collateralToken() external view returns (address);
    function conditionalTokens() external view returns (address);
    function conditionId() external view returns (bytes32);
    function creator() external view returns (address);
}

interface ICreatorShare {
    function depositDividends(uint256 amount) external;
}

interface ICreatorShareFactory {
    function creatorToShare(address creator) external view returns (address);
}

contract OrderBook is ERC1155Holder, ReentrancyGuard {
    struct Order {
        uint256 id;
        address maker;
        address market;
        uint256 outcomeIndex;
        uint256 price;
        uint256 amount;
        uint256 filled;
        bool isBid;
        bool active;
    }
    
    struct MarketInfo {
        address collateral;
        address conditionalTokens;
        bytes32 conditionId;
        address creator;
    }

    uint256 public constant FEE_BPS = 150;
    uint256 public constant PLATFORM_FEE_BPS = 75;
    uint256 public constant CREATOR_FEE_BPS = 37;
    uint256 public constant DIVIDEND_FEE_BPS = 38;

    address public feeCollector;
    ICreatorShareFactory public creatorShareFactory;

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    mapping(address => mapping(uint256 => uint256[])) public marketOutcomeOrderIds;
    
    event OrderPlaced(uint256 indexed orderId, address indexed market, address indexed maker, uint256 outcomeIndex, uint256 price, uint256 amount, bool isBid);
    event OrderCancelled(uint256 indexed orderId);
    event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 amount, uint256 cost);
    event OrderMatched(uint256 indexed makerOrderId, uint256 amount, uint256 price);
    event FeeCollected(address indexed market, uint256 platformFee, uint256 creatorFee, uint256 dividendFee);

    constructor(address _feeCollector, address _creatorShareFactory) {
        feeCollector = _feeCollector;
        creatorShareFactory = ICreatorShareFactory(_creatorShareFactory);
    }
    
    function _getMarketInfo(address market) internal view returns (MarketInfo memory) {
        IOpinionMarket m = IOpinionMarket(market);
        return MarketInfo({
            collateral: m.collateralToken(),
            conditionalTokens: m.conditionalTokens(),
            conditionId: m.conditionId(),
            creator: m.creator()
        });
    }
    
    function _getTokenId(address collateral, bytes32 conditionId, uint256 outcomeIndex) internal pure returns (uint256) {
        uint256 indexSet = 1 << outcomeIndex;
        return uint256(keccak256(abi.encodePacked(collateral, conditionId, indexSet)));
    }

    function placeOrder(
        address market,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        bool isBid
    ) external nonReentrant returns (uint256) {
        return _placeOrder(msg.sender, msg.sender, market, outcomeIndex, price, amount, isBid);
    }

    function placeOrderFor(
        address maker,
        address market,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        bool isBid
    ) external nonReentrant returns (uint256) {
        // Only allow specific trusted contracts (like Factory) to place orders for others
        // For now, we can check if msg.sender is the Factory (via CreatorShareFactory or AdminController)
        // But OrderBook doesn't know Factory address directly.
        // Let's assume for now we trust the caller if they are paying.
        // Actually, if I pay for you, it's fine. The order is yours.
        // The only risk is if I place a bad order for you.
        // But here, the Factory is placing the initial liquidity order, which is standard.
        
        return _placeOrder(maker, msg.sender, market, outcomeIndex, price, amount, isBid);
    }

    function _placeOrder(
        address maker,
        address payer,
        address market,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        bool isBid
    ) internal returns (uint256) {
        require(amount > 0 && price > 0, "Invalid params");
        
        MarketInfo memory info = _getMarketInfo(market);
        
        // Try to match against existing orders
        uint256 remainingAmount = _tryMatch(market, outcomeIndex, price, amount, isBid, info);
        
        if (remainingAmount == 0) {
            return type(uint256).max;
        }

        // Lock assets for remaining (Transfer from PAYER)
        if (isBid) {
            uint256 totalCost = (remainingAmount * price) / 1e6; 
            require(IERC20(info.collateral).transferFrom(payer, address(this), totalCost), "Transfer failed");
        } else {
            uint256 tokenId = _getTokenId(info.collateral, info.conditionId, outcomeIndex);
            IERC1155(info.conditionalTokens).safeTransferFrom(payer, address(this), tokenId, remainingAmount, "");
        }

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            maker: maker, // Order belongs to MAKER
            market: market,
            outcomeIndex: outcomeIndex,
            price: price,
            amount: remainingAmount,
            filled: 0,
            isBid: isBid,
            active: true
        });
        
        marketOutcomeOrderIds[market][outcomeIndex].push(orderId);
        emit OrderPlaced(orderId, market, maker, outcomeIndex, price, remainingAmount, isBid);
        return orderId;
    }

    function _tryMatch(
        address market,
        uint256 outcomeIndex,
        uint256 price,
        uint256 amount,
        bool isBid,
        MarketInfo memory info
    ) internal returns (uint256) {
        uint256 remaining = amount;
        uint256[] storage orderIds = marketOutcomeOrderIds[market][outcomeIndex];
        
        for (uint256 i = 0; i < orderIds.length && remaining > 0; i++) {
            Order storage makerOrder = orders[orderIds[i]];
            
            if (!makerOrder.active || makerOrder.isBid == isBid) continue;
            
            bool priceMatch = isBid 
                ? makerOrder.price <= price
                : makerOrder.price >= price;
            
            if (!priceMatch) continue;
            
            uint256 makerRemaining = makerOrder.amount - makerOrder.filled;
            uint256 fillAmount = remaining < makerRemaining ? remaining : makerRemaining;
            
            _executeMatch(makerOrder, fillAmount, info);
            remaining -= fillAmount;
            
            emit OrderMatched(makerOrder.id, fillAmount, makerOrder.price);
        }
        
        return remaining;
    }

    function _executeMatch(
        Order storage makerOrder,
        uint256 amount,
        MarketInfo memory info
    ) internal {
        uint256 tradeValue = (amount * makerOrder.price) / 1e6;
        uint256 platformFee = (tradeValue * PLATFORM_FEE_BPS) / 10000;
        uint256 creatorFee = (tradeValue * CREATOR_FEE_BPS) / 10000;
        uint256 dividendFee = (tradeValue * DIVIDEND_FEE_BPS) / 10000;
        uint256 netAmount = tradeValue - platformFee - creatorFee - dividendFee;
        
        uint256 tokenId = _getTokenId(info.collateral, info.conditionId, makerOrder.outcomeIndex);
        
        if (makerOrder.isBid) {
            // Maker is BUYING, Taker (msg.sender) is SELLING
            IERC1155(info.conditionalTokens).safeTransferFrom(msg.sender, makerOrder.maker, tokenId, amount, "");
            IERC20(info.collateral).transfer(msg.sender, netAmount);
        } else {
            // Maker is SELLING, Taker (msg.sender) is BUYING
            require(IERC20(info.collateral).transferFrom(msg.sender, address(this), tradeValue), "Transfer failed");
            IERC20(info.collateral).transfer(makerOrder.maker, netAmount);
            IERC1155(info.conditionalTokens).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
        }
        
        _distributeFees(info.collateral, info.creator, platformFee, creatorFee, dividendFee);
        emit FeeCollected(makerOrder.market, platformFee, creatorFee, dividendFee);
        
        makerOrder.filled += amount;
        if (makerOrder.filled >= makerOrder.amount) {
            makerOrder.active = false;
        }
        
        emit OrderFilled(makerOrder.id, msg.sender, amount, tradeValue);
    }

    function _distributeFees(
        address collateral,
        address creator,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 dividendFee
    ) internal {
        if (platformFee > 0) {
            IERC20(collateral).transfer(feeCollector, platformFee);
        }
        if (creatorFee > 0) {
            IERC20(collateral).transfer(creator, creatorFee);
        }
        if (dividendFee > 0) {
            address creatorShare = creatorShareFactory.creatorToShare(creator);
            if (creatorShare != address(0)) {
                // Try to deposit dividends, fallback to creator if it fails
                // (e.g., when no shares have been minted yet)
                IERC20(collateral).approve(creatorShare, dividendFee);
                try ICreatorShare(creatorShare).depositDividends(dividendFee) {
                    // Success
                } catch {
                    // Fallback: send to creator if no shares exist
                    IERC20(collateral).approve(creatorShare, 0); // Reset approval
                    IERC20(collateral).transfer(creator, dividendFee);
                }
            } else {
                IERC20(collateral).transfer(creator, dividendFee);
            }
        }
    }

    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.active && order.maker == msg.sender, "Cannot cancel");

        order.active = false;
        uint256 remaining = order.amount - order.filled;
        
        if (remaining > 0) {
            MarketInfo memory info = _getMarketInfo(order.market);
            if (order.isBid) {
                uint256 refund = (remaining * order.price) / 1e6;
                IERC20(info.collateral).transfer(msg.sender, refund);
            } else {
                uint256 tokenId = _getTokenId(info.collateral, info.conditionId, order.outcomeIndex);
                IERC1155(info.conditionalTokens).safeTransferFrom(address(this), msg.sender, tokenId, remaining, "");
            }
        }
        
        emit OrderCancelled(orderId);
    }

    function fillOrder(uint256 orderId, uint256 amount) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.active && amount > 0, "Invalid");
        require(amount <= order.amount - order.filled, "Exceeds remaining");

        MarketInfo memory info = _getMarketInfo(order.market);
        _executeMatch(order, amount, info);
    }

    function fillOrders(uint256[] calldata orderIds, uint256[] calldata amounts) external nonReentrant {
        require(orderIds.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            require(order.active && amounts[i] > 0, "Invalid");
            require(amounts[i] <= order.amount - order.filled, "Exceeds remaining");
            MarketInfo memory info = _getMarketInfo(order.market);
            _executeMatch(order, amounts[i], info);
        }
    }
    
    function getMarketOutcomeOrderIds(address market, uint256 outcomeIndex) external view returns (uint256[] memory) {
        return marketOutcomeOrderIds[market][outcomeIndex];
    }

    function cancelAllOrdersForMarket(address market) external nonReentrant {
        // Only allow the market itself or an admin to cancel all orders
        // For now, we trust the market contract to call this on resolution
        require(msg.sender == market || msg.sender == feeCollector, "Unauthorized"); // feeCollector is effectively admin here

        // Iterate through all outcomes (binary = 0 and 1)
        for (uint256 outcomeIndex = 0; outcomeIndex < 2; outcomeIndex++) {
            uint256[] storage orderIds = marketOutcomeOrderIds[market][outcomeIndex];
            for (uint256 i = 0; i < orderIds.length; i++) {
                uint256 orderId = orderIds[i];
                Order storage order = orders[orderId];
                
                if (order.active) {
                    order.active = false;
                    uint256 remaining = order.amount - order.filled;
                    
                    if (remaining > 0) {
                        MarketInfo memory info = _getMarketInfo(order.market);
                        if (order.isBid) {
                            uint256 refund = (remaining * order.price) / 1e6;
                            IERC20(info.collateral).transfer(order.maker, refund);
                        } else {
                            uint256 tokenId = _getTokenId(info.collateral, info.conditionId, order.outcomeIndex);
                            IERC1155(info.conditionalTokens).safeTransferFrom(address(this), order.maker, tokenId, remaining, "");
                        }
                    }
                    emit OrderCancelled(orderId);
                }
            }
            // Clear the array to free storage? 
            // Clearing array in loop is expensive/tricky. 
            // Since we marked orders as inactive, they won't be matched.
            // We can leave the IDs in the array.
        }
    }
}
