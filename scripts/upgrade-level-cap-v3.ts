// scripts/update-max-level.ts
import { ethers, upgrades } from "hardhat";
import { AlturaNFTLevelerV3__factory } from "../typechain-types";

// ✅ Proxy at: 0x2312B28684a1819614f6201349a6654ea1960b94
// ✅ implementation at: 0x73c3ae0FAC395f807cec05B0a4E9585285D261f6

async function main() {
  // 1) Grab your “owner” key
  const [deployer] = await ethers.getSigners();
  console.log("Updating maxLevel using account:", deployer.address);

  // 2) Proxy address & desired new cap
  const PROXY_ADDRESS = "0x2312B28684a1819614f6201349a6654ea1960b94";
  const NEW_MAX_LEVEL = 3;

  // 3) Use the factory’s static connect() to bind the ABI+deployer to your proxy
  const leveler = AlturaNFTLevelerV3__factory.connect(PROXY_ADDRESS, deployer);

  // 4) Send the owner-only tx
  console.log(`⏳ Setting maxLevel → ${NEW_MAX_LEVEL}…`);
  const tx = await leveler.setMaxLevel(NEW_MAX_LEVEL);
  await tx.wait();
  console.log("✅ maxLevel updated to", NEW_MAX_LEVEL);

  const newImpl = await upgrades.erc1967.getImplementationAddress(
    await leveler.getAddress()
  );
  console.log("✅ Proxy at:", await leveler.getAddress());
  console.log("✅ implementation at:", newImpl);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
