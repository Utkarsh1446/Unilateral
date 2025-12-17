import { ethers } from "ethers";

export const CONTRACTS = {
    PlatformToken: "0xC59FD3678fCCB26284f763832579463AED36304D", // USDC
    ConditionalTokens: "0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83",
    FeeCollector: "0x8D99A4C5C13885350A9Be5Fa810Deb9f75e7056d",
    AdminController: "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a",
    CreatorShareFactory: "0x5b8037A726f99B9aB2b5a63928BAA22Fb1036b54",
    OrderBook: "0x54fC379D88bF6be411E1F4719fAF4bC84725616A",
    OpinionMarketFactory: "0x9D2519b4c40E4E7A3d814e0E4f61A6a15DbC7AF0" // Updated: Immediate resolution support
};

export const ABIS = {
    OpinionMarketFactory: [
        "function requestMarket(bytes32 questionId, uint256 feeAmount, uint256 deadline, bytes memory signature) external",
        "function approveMarket(bytes32 questionId) external returns (address)",
        "function rejectMarket(bytes32 questionId, string memory reason) external",
        "event MarketRequested(bytes32 indexed questionId, address indexed creator, uint256 feeAmount)",
        "event MarketApproved(bytes32 indexed questionId, address indexed market)",
        "event MarketRejected(bytes32 indexed questionId, string reason)",
        "event MarketCreated(address indexed market, bytes32 indexed questionId, address creator)",
    ],
    PlatformToken: [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)",
        "function mint(address to, uint256 amount) external", // For testing
    ],
    OpinionMarket: [
        "function mintSets(uint256 amount) external",
        "function redeemSets(uint256 amount) external",
        "function resolveMarket(uint256 outcome) external",
        "function resolved() external view returns (bool)",
        "function conditionId() external view returns (bytes32)",
        "function collateralToken() external view returns (address)",
        "function conditionalTokens() external view returns (address)",
        "function state() external view returns (uint8)",
        "function creator() external view returns (address)",
        "function oracle() external view returns (address)",
    ],
    OrderBook: [
        "function placeOrder(address market, uint256 outcomeIndex, uint256 price, uint256 amount, bool isBid) external returns (uint256)",
        "function cancelOrder(uint256 orderId) external",
        "function cancelAllOrdersForMarket(address market) external",
        "function fillOrder(uint256 orderId, uint256 amount) external",
        "function fillOrders(uint256[] calldata orderIds, uint256[] calldata amounts) external",
        "function orders(uint256) view returns (uint256 id, address maker, address market, uint256 outcomeIndex, uint256 price, uint256 amount, uint256 filled, bool isBid, bool active)",
        "event OrderPlaced(uint256 indexed orderId, address indexed market, address indexed maker, uint256 outcomeIndex, uint256 price, uint256 amount, bool isBid)",
        "event OrderCancelled(uint256 indexed orderId)",
        "event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 amount, uint256 cost)"
    ],
    ERC20: [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)",
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
    ],
    ConditionalTokens: [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[])",
        "function isApprovedForAll(address account, address operator) view returns (bool)",
        "function setApprovalForAll(address operator, bool approved) external",
        "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] calldata indexSets) external"
    ],
    CreatorShareFactory: [
        "function createCreatorShare(string memory name, string memory symbol, uint256 deadline, bytes memory signature) external returns (address)",
        "event ShareCreated(address indexed creator, address shareAddress)"
    ],
    CreatorShare: [
        "function buyShares(uint256 amount) external payable",
        "function sellShares(uint256 amount) external",
        "function balanceOf(address account) view returns (uint256)",
        "function getBuyPrice(uint256 amount) view returns (uint256)",
        "function getSellPrice(uint256 amount) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function creator() view returns (address)",
        "function pendingDividends(address account) view returns (uint256)",
        "function claimDividends() external",
        "event Transfer(address indexed from, address indexed to, uint256 value)"
    ]
};

export function getContract(address: string, abi: any[], signerOrProvider: any) {
    return new ethers.Contract(address, abi, signerOrProvider);
}
