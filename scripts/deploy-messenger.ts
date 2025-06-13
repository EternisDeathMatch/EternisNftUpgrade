import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying LevelerMessenger with:", deployer.address);

  const LEVELER = process.env.LEVELER_ADDRESS;
  const ENDPOINT = process.env.LZ_ENDPOINT;
  if (!LEVELER || !ENDPOINT) {
    throw new Error("LEVELER_ADDRESS and LZ_ENDPOINT must be set in env");
  }

  const Messenger = await ethers.getContractFactory("LevelerMessenger");
  const messenger = await Messenger.deploy(ENDPOINT, LEVELER);
  await messenger.waitForDeployment();

  console.log("LevelerMessenger deployed at:", await messenger.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

