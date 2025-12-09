import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x1Ac8F5ACCeC2C565F3b9791DeB390e821f79BFcB";
    const questionId = "0xcfc355efe17a1b2aab55aa926aa2408316ecca914e9e6374947dc1e0edbb26f0";

    console.log("Checking Request on Factory:", factoryAddress);
    console.log("Question ID:", questionId);

    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const factory = OpinionMarketFactory.attach(factoryAddress);

    const request = await factory.marketRequests(questionId);
    console.log("Request Exists:", request.exists);
    console.log("Creator:", request.creator);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
