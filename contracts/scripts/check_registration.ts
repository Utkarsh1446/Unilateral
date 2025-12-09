import { ethers } from "hardhat";

const NEW_FACTORY = "0x5b8037A726f99B9aB2b5a63928BAA22Fb1036b54";
const CREATOR = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
const SHARE = "0x8bcdc1ecd70d6f467caa92398ad1e03f3453e0a4";

async function main() {
    const factory = await ethers.getContractAt("CreatorShareFactory", NEW_FACTORY);

    // Check current mapping
    const registeredShare = await factory.creatorToShare(CREATOR);
    console.log("Creator -> Share:", registeredShare);

    const isShare = await factory.isShare(SHARE);
    console.log("isShare mapping:", isShare);

    if (registeredShare === ethers.ZeroAddress) {
        console.log("\n⚠️ Share not registered. Attempting to register...");
        const tx = await factory.registerExistingShare(CREATOR, SHARE);
        console.log("Tx hash:", tx.hash);
        await tx.wait();
        console.log("✅ Registration transaction confirmed");

        // Verify
        const newShare = await factory.creatorToShare(CREATOR);
        console.log("After registration:", newShare);
    }
}

main().catch(console.error);
