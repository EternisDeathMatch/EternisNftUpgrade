import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@layerzerolabs/hardhat-verify";
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
  contractSizer: {
    runOnCompile: true, // Automatically prints contract sizes after each compile
    alphaSort: true, // Sorts contracts alphabetically
    disambiguatePaths: false,
  },
  networks: {
    localhost: {
      url: "http://blockchain:8545",
      chainId: 1337,
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 1337,
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: [
        process.env.AMOY_DEPLOYER_PRIVATE_KEY!,
        process.env.AMOY_USERA_PRIVATE_KEY!,
        process.env.AMOY_USERB_PRIVATE_KEY!
      ].filter((x) => x !== undefined),
      gas: "auto",
      gasPrice: "auto",
    },
    xdcTestnet: {
      url: process.env.XDC_RPC_URL || "",
      chainId: 51,
      accounts: [process.env.XDC_DEPLOYER_PRIVATE_KEY!].filter((x) => x !== undefined),
      gas: "auto",
      gasPrice: "auto",
    },
  },
};

export default config;
