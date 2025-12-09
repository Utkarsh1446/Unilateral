const { ethers } = require("ethers");
const { exec } = require("child_process");

async function main() {
    const privateKey = "18690e25000a25be8adefa9e375e061bc2aaecdcd9413b9e7a358eeca8ec2bc2";
    const wallet = new ethers.Wallet(privateKey);

    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const questionId = ethers.hexlify(ethers.randomBytes(32));
    const feeAmount = 100000000;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const chainId = 84532;

    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256"],
        [userAddress, questionId, feeAmount, deadline, chainId]
    );

    const signature = await wallet.signMessage(ethers.getBytes(hash));

    console.log("Params:");
    console.log("QuestionID:", questionId);
    console.log("Fee:", feeAmount);
    console.log("Deadline:", deadline);
    console.log("Signature:", signature);

    const command = `cast estimate 0xa410ea6e59cc47e847d1c17de5ae4c1db1367bf3 "createMarket(bytes32,uint256,uint256,bytes)" ${questionId} ${feeAmount} ${deadline} ${signature} --from ${userAddress} --rpc-url https://sepolia.base.org`;

    console.log("\nRunning cast estimate...");
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
        console.log(`Stdout: ${stdout}`);
    });
}

main();
