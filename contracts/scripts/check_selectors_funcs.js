const ethers = require('ethers');

const functions = [
    "buyShares(uint256)",
    "sellShares(uint256)",
    "claimDividends()",
    "depositDividends(uint256)",
    "pendingDividends(address)",
    "getBuyPrice(uint256)",
    "getSellPrice(uint256)",
    "allowance(address,address)",
    "approve(address,uint256)",
    "balanceOf(address)",
    "decimals()",
    "dividendToken()",
    "dividendsPerShare()",
    "factory()",
    "feeCollector()",
    "lastDividendPoints(address)",
    "name()",
    "owner()",
    "renounceOwnership()",
    "symbol()",
    "totalDividends()",
    "totalSupply()",
    "transfer(address,uint256)",
    "transferFrom(address,address,uint256)",
    "transferOwnership(address)",
    "unclaimedDividends(address)"
];

console.log("Computing function selectors...");
functions.forEach(func => {
    const selector = ethers.id(func).slice(0, 10);
    console.log(`${selector} : ${func}`);
    if (selector === '0xd1a93d18') {
        console.log("MATCH FOUND: " + func);
    }
});
