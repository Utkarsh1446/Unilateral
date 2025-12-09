// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../admin/AdminController.sol";
import "./CreatorShare.sol";

/**
 * @title CreatorShareFactory
 * @notice Factory for deploying Creator Shares with dividend distribution
 */
contract CreatorShareFactory {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public feeCollector;
    address public dividendToken; // USDC token for dividends
    AdminController public adminController;
    
    mapping(address => address) public creatorToShare;
    mapping(address => bool) public isShare;
    mapping(bytes32 => bool) public usedSignatures;

    event ShareCreated(address indexed creator, address shareAddress);

    constructor(address _feeCollector, address _dividendToken, address _adminController) {
        feeCollector = _feeCollector;
        dividendToken = _dividendToken;
        adminController = AdminController(_adminController);
    }

    function createCreatorShare(
        string memory name, 
        string memory symbol, 
        uint256 deadline, 
        bytes memory signature
    ) external returns (address) {
        require(creatorToShare[msg.sender] == address(0), "Share already exists");
        require(block.timestamp <= deadline, "Signature expired");

        // Verify signature
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, name, symbol, deadline, block.chainid));
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        
        require(!usedSignatures[ethSignedHash], "Signature already used");
        usedSignatures[ethSignedHash] = true;

        address signer = ethSignedHash.recover(signature);
        require(adminController.hasRole(adminController.SIGNER_ROLE(), signer), "Invalid signature");

        CreatorShare share = new CreatorShare(name, symbol, msg.sender, feeCollector, dividendToken);
        address shareAddress = address(share);
        
        creatorToShare[msg.sender] = shareAddress;
        isShare[shareAddress] = true;

        emit ShareCreated(msg.sender, shareAddress);
        return shareAddress;
    }

    /**
     * @notice Admin function to register an existing CreatorShare contract
     * @dev Used to fix mapping issues or register shares created before factory
     * @param creator The creator's wallet address
     * @param shareAddress The CreatorShare contract address
     */
    function registerExistingShare(address creator, address shareAddress) external {
        require(adminController.hasRole(adminController.DEFAULT_ADMIN_ROLE(), msg.sender), "Not admin");
        require(creator != address(0) && shareAddress != address(0), "Invalid addresses");
        require(creatorToShare[creator] == address(0), "Creator already has share");
        
        creatorToShare[creator] = shareAddress;
        isShare[shareAddress] = true;
        
        emit ShareCreated(creator, shareAddress);
    }
}
