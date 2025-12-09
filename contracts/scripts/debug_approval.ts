import { ethers } from "hardhat";

async function main() {
    const questionId = "0x13ce881532ecf5d5a2055dc4874e362bd2ef5a39592cb4010f6b82cd1feba2e1";
    const factoryAddress = "0x7fB9FF01874F6e5d7a4A72089941A79cf6ee6081";

    const [signer] = await ethers.getSigners();
    console.log("Testing with:", signer.address);

    const factory = await ethers.getContractAt("OpinionMarketFactory", factoryAddress);

    // Check if market request exists
    const request = await factory.marketRequests(questionId);
    console.log("\nMarket Request:", {
        creator: request.creator,
        questionId: request.questionId,
        feeAmount: ethers.formatUnits(request.feeAmount, 6) + " USDC",
        deadline: request.deadline.toString(),
        exists: request.exists
    });

    if (!request.exists) {
        console.log("\n❌ Market request does not exist!");
        return;
    }

    // Check Factory's USDC balance
    const platformToken = await ethers.getContractAt("IERC20", "0xC59FD3678fCCB26284f763832579463AED36304D");
    const factoryBalance = await platformToken.balanceOf(factoryAddress);
    console.log("\nFactory USDC balance:", ethers.formatUnits(factoryBalance, 6));

    // Check AdminController OrderBook
    const adminController = await ethers.getContractAt("AdminController", "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a");
    const orderBookAddress = await adminController.orderBook();
    console.log("OrderBook in AdminController:", orderBookAddress);

    // Try to simulate the approval
    console.log("\nSimulating approveMarket...");
    try {
        const result = await factory.approveMarket.staticCall(questionId);
        console.log("✅ Simulation success! Market address would be:", result);
    } catch (error: any) {
        console.log("❌ Simulation failed:", error.reason || error.message);
        if (error.data) {
            console.log("Error data:", error.data);
        }
    }
}

main().catch(console.error);
