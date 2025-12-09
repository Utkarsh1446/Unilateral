const { ethers } = require("ethers");

async function main() {
    const privateKey = "18690e25000a25be8adefa9e375e061bc2aaecdcd9413b9e7a358eeca8ec2bc2";
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const wallet = new ethers.Wallet(privateKey, provider);

    const factoryAddress = "0xa410Ea6e59CC47e847D1c17de5aE4C1dB1367Bf3";
    const tokenAddress = "0xF904c3653282efaeDC56aBC448fd5b53afB4342d";

    // ABI snippets
    const factoryAbi = [
        "function createMarket(bytes32 questionId, uint256 feeAmount, uint256 deadline, bytes signature) external returns (address)",
        "event MarketCreated(address indexed market, bytes32 indexed questionId, address creator)"
    ];
    const tokenAbi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const marketAbi = [
        "function mintSets(uint256 amount) external"
    ];

    const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet);
    const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);

    // 1. Generate Params
    const userAddress = wallet.address;
    const questionId = ethers.hexlify(ethers.randomBytes(32));
    const feeAmount = 100000000;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const chainId = 84532;

    console.log("Generating signature...");
    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256"],
        [userAddress, questionId, feeAmount, deadline, chainId]
    );
    const signature = await wallet.signMessage(ethers.getBytes(hash));

    // 2. Create Market
    console.log("Creating Market...");
    const txCreate = await factory.createMarket(questionId, feeAmount, deadline, signature);
    console.log("Create Tx:", txCreate.hash);
    const receiptCreate = await txCreate.wait();

    let marketAddress = null;
    for (const log of receiptCreate.logs) {
        try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "MarketCreated") {
                marketAddress = parsed.args[0];
                break;
            }
        } catch (e) { }
    }
    console.log("Market Created at:", marketAddress);

    if (!marketAddress) throw new Error("Market address not found");

    // 3. Approve Market
    const amountWei = ethers.parseUnits("500", 6); // 500 USDC
    console.log("Approving Market...");
    const txApprove = await token.approve(marketAddress, amountWei);
    console.log("Approve Tx:", txApprove.hash);
    await txApprove.wait();

    // 4. Wait for Allowance
    console.log("Waiting for allowance...");
    let retries = 0;
    while (retries < 10) {
        const allowance = await token.allowance(userAddress, marketAddress);
        console.log(`Allowance: ${allowance.toString()} / ${amountWei.toString()}`);
        if (allowance >= amountWei) break;
        await new Promise(r => setTimeout(r, 2000));
        retries++;
    }

    // 5. Mint Sets
    console.log("Minting Sets...");
    const market = new ethers.Contract(marketAddress, marketAbi, wallet);
    const txMint = await market.mintSets(amountWei);
    console.log("Mint Tx:", txMint.hash);
    await txMint.wait();
    console.log("Minting Complete!");

    // 6. Approve CT for OrderBook
    console.log("Approving CT for OrderBook...");
    const ctAddress = "0xe053845098384c546FfB682DE4038b246213aBEE";
    const orderBookAddress = "0x3B1A78D97456607587C32Ca22f42Ba85c4d0efF7";
    const ctAbi = ["function setApprovalForAll(address operator, bool approved) external"];
    const ct = new ethers.Contract(ctAddress, ctAbi, wallet);

    const txApproveCT = await ct.setApprovalForAll(orderBookAddress, true);
    console.log("Approve CT Tx:", txApproveCT.hash);
    await txApproveCT.wait();
    console.log("CT Approval Complete!");
}

main().catch(console.error);
