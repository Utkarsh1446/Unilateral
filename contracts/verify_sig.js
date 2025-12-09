const { ethers } = require("ethers");

async function main() {
    const privateKey = "18690e25000a25be8adefa9e375e061bc2aaecdcd9413b9e7a358eeca8ec2bc2";
    const wallet = new ethers.Wallet(privateKey);

    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const questionId = "0x7ab8a6327222b70e5ff3b2e1757c81dc02f4e53d6ade6ea09b3ac0a15c88efca";
    const feeAmount = 100000000;
    const deadline = 1764955372;
    const chainId = 84532;

    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256"],
        [userAddress, questionId, feeAmount, deadline, chainId]
    );

    const signature = await wallet.signMessage(ethers.getBytes(hash));

    console.log("Generated Signature:", signature);
    console.log("Expected Signature: ", "0x3aeb71b15a89345650308309a4bd87b4dee77101f356638a868685d8968116904326537022b01305a1e7083e55ea37c99d85b50a494d4d17edfdea4300dcd34b1c");

    if (signature === "0x3aeb71b15a89345650308309a4bd87b4dee77101f356638a868685d8968116904326537022b01305a1e7083e55ea37c99d85b50a494d4d17edfdea4300dcd34b1c") {
        console.log("MATCH");
    } else {
        console.log("MISMATCH");
    }
}

main();
