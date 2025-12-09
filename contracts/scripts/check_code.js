const hre = require("hardhat");

async function main() {
    const address = "0xfe22B1Bf2B4fe02b392A1882A25C2b45E8B5c2Ac";
    console.log("Checking code at:", address);
    const code = await hre.ethers.provider.getCode(address);
    if (code === "0x") {
        console.log("No code found at this address.");
    } else {
        console.log("Code found! Length:", code.length);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
