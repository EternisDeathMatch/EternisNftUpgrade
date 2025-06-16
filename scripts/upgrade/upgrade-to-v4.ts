import { ethers, upgrades } from "hardhat";

async function main() {
  // 1. Deploying account
  const [deployer] = await ethers.getSigners();
  const proxyAddress = "0x7326Dc4AdAF4Fb1C59c91CffAF78874CEB5544A4";
  console.log("[DEBUG] Upgrading proxy", proxyAddress, "to V4 with account:", deployer.address);

  // 2. Fetch V4 factory
  const V4 = await ethers.getContractFactory("AlturaNFTLevelerV4");
  console.log("[DEBUG] Fetched AlturaNFTLevelerV4 factory");

  // 3. Perform upgrade
  const levelerV4 = await upgrades.upgradeProxy(proxyAddress, V4);
  console.log("[DEBUG] upgradeProxy tx hash:", levelerV4.deploymentTransaction()?.hash);

  // 4. Wait for deployment to finish
  await levelerV4.waitForDeployment();
  console.log("[DEBUG] Proxy now at V4 implementation, proxy address remains:", await levelerV4.getAddress());

  // 5. Initialize V4 (set bridgeAgent)
  console.log("[DEBUG] Initializing V4 (bridgeAgent placeholder)");
  const tx = await levelerV4.initializeV4(ethers.ZeroAddress);
  console.log("[DEBUG] initializeV4 tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("[DEBUG] initializeV4 mined in block:", receipt?.blockNumber);

  console.log("[DONE] Proxy upgrade to V4 complete.");
}

main().catch((e) => {
  console.error("[ERROR] upgrade-to-v4.ts failed:", e);
  process.exit(1);
});
