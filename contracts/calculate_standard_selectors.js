const ethers = require('ethers');

const errors = [
    "ERC20InsufficientBalance(address,uint256,uint256)",
    "ERC20InvalidSender(address)",
    "ERC20InvalidReceiver(address)",
    "ERC20InsufficientAllowance(address,uint256,uint256)",
    "ERC20InvalidApprover(address)",
    "ERC20InvalidSpender(address)",
    "ERC1155InsufficientBalance(address,uint256,uint256,uint256)",
    "ERC1155InvalidSender(address)",
    "ERC1155InvalidReceiver(address)",
    "ERC1155MissingApprovalForAll(address,address)",
    "ERC1155InvalidApprover(address)",
    "ERC1155InvalidOperator(address)",
    "ERC1155InvalidArrayLength(uint256,uint256)"
];

console.log("Standard Error Selectors:");
errors.forEach(e => {
    console.log(`${e}: ${ethers.id(e).slice(0, 10)}`);
});
