import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x6873aAE003c31012122324db80b7D1DE2014dF8d";
    const questionId = "0x07c28da48daa8537503c03be74d57b67514fe1e63784bd247e578feeda6b48f4"; // From user logs

    console.log("Approving market via script...");
    console.log("Factory:", factoryAddress);
    console.log("Question ID:", questionId);

    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const factory = OpinionMarketFactory.attach(factoryAddress);

    try {
        const tx = await factory.approveMarket(questionId);
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Market approved successfully!");
    } catch (error: any) {
        console.error("Approval failed!");
        if (error.data) {
            console.error("Revert data:", error.data);
            // Try to decode
            try {
                const reason = ethers.toUtf8String('0x' + error.data.substring(138));
                console.error("Decoded reason:", reason);
            } catch (e) { }
        }
        console.error(error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
