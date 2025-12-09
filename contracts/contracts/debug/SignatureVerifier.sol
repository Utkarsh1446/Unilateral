// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SignatureVerifier {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    function verify(
        address sender,
        bytes32 questionId, 
        uint256 initialVirtualLiquidity,
        uint256 feeAmount,
        uint256 deadline,
        uint256 chainId,
        bytes memory signature
    ) external view returns (address recovered, bytes32 hash, bytes32 ethSignedHash) {
        // Replicate Factory logic
        // Note: Factory uses msg.sender and block.chainid.
        // We pass them as args to simulate.
        
        hash = keccak256(abi.encodePacked(sender, questionId, initialVirtualLiquidity, feeAmount, deadline, chainId));
        ethSignedHash = hash.toEthSignedMessageHash();
        recovered = ethSignedHash.recover(signature);
    }
    
    function getChainId() external view returns (uint256) {
        return block.chainid;
    }
}
