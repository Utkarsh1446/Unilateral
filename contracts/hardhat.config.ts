import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      chainId: 31337,
      forking: {
        url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
        enabled: true,
      },
      chains: {
        84532: {
          hardforkHistory: {
            shanghai: 0,
            cancun: 10000000,
          }
        }
      }
    }
  },
};

export default config;
