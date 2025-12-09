const fs = require('fs');
const path = "/Users/utkarshtiwari/Guessly v0.1/contracts/artifacts/contracts/core/OrderBook.sol/OrderBook.json";

const artifact = JSON.parse(fs.readFileSync(path, 'utf8'));

console.log("Searching in methodIdentifiers...");
if (artifact.methodIdentifiers) {
    for (const [name, selector] of Object.entries(artifact.methodIdentifiers)) {
        if (selector === "c3bccc22") {
            console.log(`FOUND FUNCTION: ${name} -> ${selector}`);
        }
    }
}

console.log("Searching in abi for ALL functions...");
if (artifact.abi) {
    const ethers = require('ethers');
    for (const item of artifact.abi) {
        if (item.type === 'function') {
            const signature = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
            const selector = ethers.id(signature).slice(0, 10);
            console.log(`${selector} : ${signature}`);
            if (selector === "0xc3bccc22") {
                console.log(`\nMATCH FOUND: ${signature} -> ${selector}\n`);
            }
        }
    }
}
