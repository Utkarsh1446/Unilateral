const ethers = require('ethers');

const functions = [
    "buyOutcome(uint256,uint256)",
    "sellOutcome(uint256,uint256)"
];

const errors = [
    // Common errors
    "InsufficientBalance()",
    "InsufficientAllowance()",
    "TransferFailed()",
    // Potential custom errors from other contracts
    "PayoutMustBeGreaterThanZero()",
    "InsufficientLiquidityToSell()",
    "InvalidOutcomeIndex()",
    "MarketResolved()",
    "AmountMustBeGreaterThanZero()"
];

console.log("Function Selectors:");
functions.forEach(f => {
    console.log(`${f}: ${ethers.id(f).slice(0, 10)}`);
});

console.log("\nError Selectors (Hypothetical):");
errors.forEach(e => {
    console.log(`${e}: ${ethers.id(e).slice(0, 10)}`);
});
