import { ethers } from "hardhat";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    const userAddress = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf"; // From logs
    const name = "elonmusk";
    const symbol = "SHARE";
    const deadline = 1764619851; // From logs (approx)
    const chainId = 84532;

    console.log("Params:", { userAddress, name, symbol, deadline, chainId });

    // 1. Backend Logic
    const hash = ethers.solidityPackedKeccak256(
        ["address", "string", "string", "uint256", "uint256"],
        [userAddress, name, symbol, deadline, chainId]
    );
    console.log("Hash:", hash);

    const signature = await signer.signMessage(ethers.getBytes(hash));
    console.log("Signature:", signature);

    // 2. Verification Logic (Simulating Contract)
    const recovered = ethers.verifyMessage(ethers.getBytes(hash), signature);
    console.log("Recovered:", recovered);

    if (recovered === signer.address) {
        console.log("Signature verification PASSED locally.");
    } else {
        console.error("Signature verification FAILED locally.");
    }

    // 3. Test against deployed contract (if possible)
    // We can't easily call the contract without sending a tx, but we can call a view function if we had one.
    // Since createCreatorShare is not view, we can try staticCall to see if it reverts.

    const factoryAddress = "0x04B929490B3d83545e2641DbFEf0263ccF263270";
    const factory = await ethers.getContractAt("CreatorShareFactory", factoryAddress);

    // We need to impersonate the user to make msg.sender match
    // But we can't impersonate on a live network (Base Sepolia).
    // We can only impersonate on a local fork.

    // However, we can check if the signer has the role on the AdminController
    const adminControllerAddress = await factory.adminController();
    const adminController = await ethers.getContractAt("AdminController", adminControllerAddress);
    const SIGNER_ROLE = await adminController.SIGNER_ROLE();
    const hasRole = await adminController.hasRole(SIGNER_ROLE, signer.address);
    console.log("Signer has role on contract:", hasRole);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
