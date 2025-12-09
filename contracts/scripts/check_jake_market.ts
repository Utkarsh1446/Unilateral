const { ethers } = require('hardhat');

const MARKET = '0x82B84F35aAC546d32C7E94c56CEb769e0eD8A422';

async function main() {
    const market = await ethers.getContractAt('OpinionMarket', MARKET);
    console.log('State:', Number(await market.state()));
    console.log('Resolved:', await market.resolved());
    console.log('Proposed Outcome:', Number(await market.proposedOutcome()));
    console.log('Resolution Timestamp:', Number(await market.resolutionTimestamp()));
}
main().catch(console.error);
