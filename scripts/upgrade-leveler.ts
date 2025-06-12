// scripts/upgrade-leveler.ts
import { ethers, upgrades } from "hardhat";
// Upgrading using account: 0x20F67281413FBFfDea3BBee8d896335689C38648
// ⏳ Upgrading proxy to V3…
// ✅ Proxy remains at: 0x2312B28684a1819614f6201349a6654ea1960b94
// ⏳ Initializing maxLevel = 10…
// ✅ maxLevel initialized to 10
// ✅ New implementation deployed at: 0x73c3ae0FAC395f807cec05B0a4E9585285D261f6 
async function main() {
  // 1) Retrieve the deployer (must be proxy admin or original deployer)
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading using account:", deployer.address);

  // 2) Your existing proxy address
  const PROXY_ADDRESS = "0x2312B28684a1819614f6201349a6654ea1960b94";

  // 3) Fetch the V3 factory (instead of V2)
  const LevelerV3Factory = await ethers.getContractFactory("AlturaNFTLevelerV3");

  // 4) Upgrade the proxy to V3
  console.log("⏳ Upgrading proxy to V3…");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, LevelerV3Factory, {
    unsafeAllowRenames: true
  });
  await upgraded.deploymentTransaction()?.wait();
  console.log("✅ Proxy remains at:", await upgraded.getAddress());

  // 5) Call your reinitializer to set the global cap
  const MAX_LEVEL = 3;  // ← pick your desired max
  console.log(`⏳ Initializing maxLevel = ${MAX_LEVEL}…`);
  const tx = await upgraded.initializeV3(MAX_LEVEL);
  await tx.wait();
  console.log("✅ maxLevel initialized to", MAX_LEVEL);

  // 6) (Optional) verify implementation address
  const newImpl = await upgrades.erc1967.getImplementationAddress(await upgraded.getAddress());
  console.log("✅ New implementation deployed at:", newImpl);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Upgrade failed:", err);
    process.exit(1);
  });
