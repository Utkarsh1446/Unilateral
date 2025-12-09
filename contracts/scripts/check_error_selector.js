const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
    const artifactsDir = path.join(__dirname, '../artifacts/contracts');
    const targetSelector = "0xfb8f41b2";

    console.log(`Searching for error selector ${targetSelector} in artifacts...`);

    function searchDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                searchDir(fullPath);
            } else if (file.endsWith('.json') && !file.endsWith('.dbg.json')) {
                const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (artifact.abi) {
                    for (const item of artifact.abi) {
                        if (item.type === 'error') {
                            const signature = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
                            const selector = ethers.id(signature).slice(0, 10);
                            if (selector === targetSelector) {
                                console.log(`FOUND MATCH!`);
                                console.log(`Contract: ${file}`);
                                console.log(`Error: ${signature}`);
                                console.log(`Selector: ${selector}`);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    searchDir(artifactsDir);

    // Also check OpenZeppelin artifacts if possible, or just common ERC20 errors
    const commonErrors = [
        "ERC20InsufficientBalance(address,uint256,uint256)",
        "ERC20InsufficientAllowance(address,uint256,uint256)",
        "ERC20InvalidApprover(address)",
        "ERC20InvalidReceiver(address)",
        "ERC20InvalidSender(address)",
        "ERC20InvalidSpender(address)",
        "AccessControlUnauthorizedAccount(address,bytes32)",
        "OwnableUnauthorizedAccount(address)"
    ];

    for (const err of commonErrors) {
        const selector = ethers.id(err).slice(0, 10);
        if (selector === targetSelector) {
            console.log(`FOUND MATCH in Common Errors!`);
            console.log(`Error: ${err}`);
            return;
        }
    }
}

main();
