import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying Verifier with account:", deployer.address);

    const Verifier = await ethers.getContractFactory("SignatureVerifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    console.log("Verifier deployed to:", await verifier.getAddress());

    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 5000));

    const chainId = (await deployer.provider.getNetwork()).chainId;
    console.log("Provider Chain ID:", chainId);
    console.log("Contract Chain ID:", await verifier.getChainId());

    const questionId = ethers.hexlify(ethers.randomBytes(32));
    const initialVirtualLiquidity = ethers.parseUnits("100", 18);
    const feeAmount = 0;
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const types = ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"];
    const values = [deployer.address, questionId, initialVirtualLiquidity, feeAmount, deadline, chainId];

    const hash = ethers.solidityPackedKeccak256(types, values);
    const signature = await deployer.signMessage(ethers.getBytes(hash));

    console.log("Local Hash:", hash);

    const result = await verifier.verify(
        deployer.address,
        questionId,
        initialVirtualLiquidity,
        feeAmount,
        deadline,
        chainId,
        signature
    );

    console.log("Contract Hash:", result.hash);
    console.log("Contract Recovered:", result.recovered);
    console.log("Match?", result.recovered === deployer.address);
    console.log("Hash Match?", result.hash === hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
