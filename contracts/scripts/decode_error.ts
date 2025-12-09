import { ethers } from "hardhat";

async function main() {
    const errorData = "0xfb8f41b20000000000000000000000001ac8f5accec2c565f3b9791deb390e821f79bfcb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f5e100";

    // Known selectors
    // 0x958632b0 -> RequestAlreadyExists() ?

    console.log("Decoding error data:", errorData);

    try {
        const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
        const iface = OpinionMarketFactory.interface;

        const decoded = iface.parseError(errorData);
        console.log("Decoded Error:", decoded);
    } catch (e) {
        console.log("Could not decode as custom error, trying string...");
        try {
            const reason = ethers.toUtf8String("0x" + errorData.slice(138)); // Skip selector + offset? No, standard decode
            console.log("Reason:", reason);
        } catch (err) {
            console.log("Raw decode failed");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
