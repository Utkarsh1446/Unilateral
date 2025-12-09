import { ethers } from "hardhat";

async function main() {
    const shareAddress = "0x910F2859AE32C6cE2fa789A55CA22b30911a9D07";
    const CreatorShare = await ethers.getContractFactory("CreatorShare");
    const share = CreatorShare.attach(shareAddress);

    console.log("Debugging share purchase for:", shareAddress);

    // Impersonate a signer
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Check current state
    const supply = await share.totalSupply();
    console.log("Current Supply:", supply.toString());

    const price = await share.getBuyPrice(1);
    console.log("Buy Price for 1 share:", ethers.formatEther(price));

    // Try to buy
    console.log("Attempting to buy 1 share...");
    try {
        const tx = await share.buyShares(1, { value: price > 0n ? price : 1n });
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Purchase successful!");
    } catch (error: any) {
        console.error("Purchase failed!");
        if (error.data) {
            console.error("Error data:", error.data);
            // Try to decode error
            try {
                const decoded = share.interface.parseError(error.data);
                console.error("Decoded error:", decoded);
            } catch (e) {
                console.error("Could not decode error");
            }
        } else {
            console.error(error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
