const { ethers } = require("ethers");

async function checkCode() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const address = "0x1c22D5609768B569af22F4842E5FCF81231E1301";
    const code = await provider.getCode(address);
    console.log(`Code at ${address}:`, code);

    if (code === "0x") {
        console.log("ERROR: No code at address!");
    } else {
        console.log("SUCCESS: Code found!");
    }
}

checkCode();
