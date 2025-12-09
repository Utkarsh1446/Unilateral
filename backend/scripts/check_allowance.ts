import { ethers } from "ethers";

const USER_ADDRESS = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
const FACTORY_ADDRESS = "0x62c6186E67427135ccDe51C5f0F875aE63e5cCCc";
const TOKEN_ADDRESS = "0x199013a8eA21f024ab22A6d70FcFe920608aAC30";
const RPC_URL = "https://sepolia.base.org";

const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

    console.log("Checking Allowance...");
    const allowance = await token.allowance(USER_ADDRESS, FACTORY_ADDRESS);
    console.log(`Allowance: ${allowance.toString()} (${ethers.formatUnits(allowance, 6)} USDC)`);

    const balance = await token.balanceOf(USER_ADDRESS);
    console.log(`User Balance: ${balance.toString()} (${ethers.formatUnits(balance, 6)} USDC)`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
