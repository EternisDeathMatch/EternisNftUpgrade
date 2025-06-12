// Deploying new implementation with: 0x20F67281413FBFfDea3BBee8d896335689C38648
// Using proxy at: 0x2312B28684a1819614f6201349a6654ea1960b94
// ✅ New implementation deployed at: 0x4e9abB44dB5ad6cD650746B561c31EBD7422aa9e

import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying new implementation with:", deployer.address);

  // Your existing proxy
  const PROXY_ADDRESS = "0x2312B28684a1819614f6201349a6654ea1960b94";
  console.log("Using proxy at:", PROXY_ADDRESS);

  // Grab the V3 factory
  const LevelerV3Factory = await ethers.getContractFactory("AlturaNFTLevelerV3");

  // Deploy a new impl behind the scenes
  const newImpl = await upgrades.prepareUpgrade(
    PROXY_ADDRESS,
    LevelerV3Factory,
    {
      unsafeAllowRenames: true
    }
  );

  console.log("✅ New implementation deployed at:", newImpl);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error in deploy-impl:", e);
    process.exit(1);
  });
