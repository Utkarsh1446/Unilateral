const ethers = require('ethers');

const errors = [
    "ERC20InsufficientBalance(address,uint256,uint256)",
    "ERC20InvalidSender(address)",
    "ERC20InvalidReceiver(address)",
    "ERC20InsufficientAllowance(address,uint256,uint256)",
    "ERC20InvalidApprover(address)",
    "ERC20InvalidSpender(address)",
    "OwnableUnauthorizedAccount(address)",
    "SafeERC20FailedOperation(address)",
    "MathOverflowedMulDiv()",
    "EnforcedPause()",
    "ExpectedPause()",
    "ReentrancyGuardReentrantCall()"
];

console.log("Computing selectors...");
errors.forEach(err => {
    const selector = ethers.id(err).slice(0, 10);
    console.log(`${selector} : ${err}`);
});
