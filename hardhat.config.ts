import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";
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
    runOnCompile: true,
    alphaSort: true,
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
    xdc: {
      url: process.env.XDC_RPC_URL || "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [
        process.env.XDC_DEPLOYER_PRIVATE_KEY!
      ].filter((x) => x !== undefined),
      gas: "auto",
      gasPrice: "auto",
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      accounts: [process.env.POLYGON_DEPLOYER_PRIVATE_KEY!].filter((x) => x !== undefined),
      gas: "auto",
      gasPrice: "auto",
    },
     ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      chainId: 1,
      accounts: [
        process.env.ETHEREUM_DEPLOYER_PRIVATE_KEY!
      ].filter((x) => x !== undefined),
      gas: "auto",
      gasPrice: "auto",
    },
  },
};

export default config;