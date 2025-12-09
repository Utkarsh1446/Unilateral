// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/BondingCurve.sol";

/**
 * @title CreatorShare
 * @notice Represents shares of a creator's reputation with dividend distribution
 * @dev Dividends are distributed from creator's market fees (in USDC) proportionally to share holders
 */
contract CreatorShare is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1000 * 1e18; // 1000 tokens with 18 decimals
    uint256 public constant SELL_FEE_BPS = 500; // 5%

    address public feeCollector;
    address public factory;
    IERC20 public dividendToken; // USDC token for dividends

    // Dividend tracking
    uint256 public totalDividends; // Total dividends ever deposited
    uint256 public dividendsPerShare; // Accumulated dividends per share (scaled by 1e18)
    mapping(address => uint256) public lastDividendPoints; // Last dividend checkpoint for each holder
    mapping(address => uint256) public unclaimedDividends; // Unclaimed dividends for each holder

    event SharesBought(address indexed buyer, uint256 amount, uint256 price, uint256 supply);
    event SharesSold(address indexed seller, uint256 amount, uint256 price, uint256 supply);
    event DividendsDeposited(uint256 amount, uint256 newDividendsPerShare);
    event DividendsClaimed(address indexed holder, uint256 amount);

    constructor(
        string memory name, 
        string memory symbol, 
        address _creator, 
        address _feeCollector,
        address _dividendToken
    ) 
        ERC20(name, symbol) 
        Ownable(_creator) 
    {
        feeCollector = _feeCollector;
        factory = msg.sender;
        dividendToken = IERC20(_dividendToken);
    }

    /**
     * @notice Deposit dividends (USDC) to be distributed among share holders
     * @dev Called by markets when creator earns fees
     * @param amount Amount of USDC to distribute
     */
    function depositDividends(uint256 amount) external {
        require(amount > 0, "No dividends to deposit");
        require(totalSupply() > 0, "No shares exist");

        // Transfer USDC from sender
        require(dividendToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        totalDividends += amount;
        
        // Calculate dividends per share (scaled by 1e18 for precision)
        uint256 dividendsPerShareIncrease = (amount * 1e18) / totalSupply();
        dividendsPerShare += dividendsPerShareIncrease;

        emit DividendsDeposited(amount, dividendsPerShare);
    }

    /**
     * @notice Update unclaimed dividends for a holder
     * @param holder Address of the share holder
     */
    function _updateDividends(address holder) internal {
        if (balanceOf(holder) == 0) return;

        uint256 holderBalance = balanceOf(holder);
        uint256 newDividends = (holderBalance * (dividendsPerShare - lastDividendPoints[holder])) / 1e18;
        
        if (newDividends > 0) {
            unclaimedDividends[holder] += newDividends;
        }
        
        lastDividendPoints[holder] = dividendsPerShare;
    }

    /**
     * @notice Claim accumulated dividends in USDC
     */
    function claimDividends() external nonReentrant {
        _updateDividends(msg.sender);
        
        uint256 amount = unclaimedDividends[msg.sender];
        require(amount > 0, "No dividends to claim");
        
        unclaimedDividends[msg.sender] = 0;
        require(dividendToken.transfer(msg.sender, amount), "Dividend transfer failed");
        
        emit DividendsClaimed(msg.sender, amount);
    }

    /**
     * @notice Get pending dividends for a holder
     * @param holder Address to check
     * @return Pending dividend amount
     */
    function pendingDividends(address holder) external view returns (uint256) {
        if (balanceOf(holder) == 0) return unclaimedDividends[holder];
        
        uint256 holderBalance = balanceOf(holder);
        uint256 newDividends = (holderBalance * (dividendsPerShare - lastDividendPoints[holder])) / 1e18;
        
        return unclaimedDividends[holder] + newDividends;
    }

    function buyShares(uint256 amount) external nonReentrant {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        
        // Update dividends before balance changes
        _updateDividends(msg.sender);
        
        uint256 price = BondingCurve.getBuyPrice(totalSupply(), amount);
        uint256 fee = (price * SELL_FEE_BPS) / 10000; // 5% fee
        uint256 totalCost = price + fee;
        
        uint256 platformFee = fee / 2; // 2.5%
        uint256 creatorFee = fee - platformFee; // 2.5%
        
        // Transfer USDC from buyer
        require(dividendToken.transferFrom(msg.sender, address(this), totalCost), "Transfer failed");
        
        // Send fees
        require(dividendToken.transfer(feeCollector, platformFee), "Platform fee transfer failed");
        require(dividendToken.transfer(owner(), creatorFee), "Creator fee transfer failed");

        _mint(msg.sender, amount);
        
        // Set dividend checkpoint for new holder
        lastDividendPoints[msg.sender] = dividendsPerShare;
        
        emit SharesBought(msg.sender, amount, totalCost, totalSupply());
    }

    function sellShares(uint256 amount) external nonReentrant {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Update and auto-claim dividends before selling
        _updateDividends(msg.sender);
        if (unclaimedDividends[msg.sender] > 0) {
            uint256 dividendAmount = unclaimedDividends[msg.sender];
            unclaimedDividends[msg.sender] = 0;
            require(dividendToken.transfer(msg.sender, dividendAmount), "Dividend transfer failed");
            emit DividendsClaimed(msg.sender, dividendAmount);
        }

        uint256 revenue = BondingCurve.getSellPrice(totalSupply(), amount);
        uint256 fee = (revenue * SELL_FEE_BPS) / 10000;
        uint256 payout = revenue - fee;

        uint256 platformFee = fee / 2;
        uint256 creatorFee = fee - platformFee;

        _burn(msg.sender, amount);
        
        require(dividendToken.transfer(msg.sender, payout), "Payout failed");
        require(dividendToken.transfer(feeCollector, platformFee), "Platform fee transfer failed");
        require(dividendToken.transfer(owner(), creatorFee), "Creator fee transfer failed");

        emit SharesSold(msg.sender, amount, revenue, totalSupply());
    }

    /**
     * @notice Override transfer to update dividends
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0)) {
            _updateDividends(from);
        }
        if (to != address(0)) {
            _updateDividends(to);
            lastDividendPoints[to] = dividendsPerShare;
        }
        super._update(from, to, value);
    }

    function getBuyPrice(uint256 amount) external view returns (uint256) {
        return BondingCurve.getBuyPrice(totalSupply(), amount);
    }

    function getSellPrice(uint256 amount) external view returns (uint256) {
        return BondingCurve.getSellPrice(totalSupply(), amount);
    }
}
