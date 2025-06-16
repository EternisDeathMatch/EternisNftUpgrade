import { ethers, upgrades } from "hardhat";

async function main() {
  // Initial debug
  console.log("[DEBUG] Starting deploy-leveler script...");

  const [deployer] = await ethers.getSigners();
  console.log("[DEBUG] Deployer address:", deployer.address);

  const ALTURA_NFT = process.env.ALTURA_NFT_ADDRESS!;
  console.log("[DEBUG] ALTURA_NFT address from env:", ALTURA_NFT);

  // --- Deploy V2 ---
  console.log("[DEBUG] Deploying V2 proxy...");
  const V2 = await ethers.getContractFactory("AlturaNFTLevelerV2");
  console.log("[DEBUG] Got V2 factory: AlturaNFTLevelerV2");
  const levelerV2 = await upgrades.deployProxy(
    V2,
    [ALTURA_NFT, ethers.ZeroAddress, 1, deployer.address],
    { initializer: "initialize" }
  );
  // console.log("[DEBUG] V2 deploy transaction hash:", levelerV2.deploymentTransaction());
  await levelerV2.waitForDeployment();
  console.log("[DEBUG] V2 Proxy deployed at", await levelerV2.getAddress());

  // --- Upgrade to V3 ---
  console.log("[DEBUG] Upgrading proxy to V3...");
  const V3 = await ethers.getContractFactory("AlturaNFTLevelerV3");
  console.log("[DEBUG] Got V3 factory: AlturaNFTLevelerV3");
  const levelerV3 = await upgrades.upgradeProxy(
    await levelerV2.getAddress(),
    V3
  );
  // console.log("[DEBUG] V3 upgrade transaction hash:", (levelerV3.deployTransaction)?.hash);
  await levelerV3.waitForDeployment();
  console.log("[DEBUG] Proxy upgraded to V3 at", await levelerV3.getAddress());

  console.log(
    "[DEBUG] Calling initializeV3 with maxLevel=10 on V3 proxy at",
    await levelerV3.getAddress()
  );
  let init3;
  try {
    const tx3 = await levelerV3.initializeV3(3);
    console.log("[DEBUG] initializeV3 tx hash:", tx3.hash);
    init3 = await tx3.wait();
    console.log("[DEBUG] initializeV3 mined in block", init3?.blockNumber);
  } catch (err: any) {
    console.error("[ERROR] initializeV3 reverted:", err.message || err);
    throw err;
  }
  console.log("[DEBUG] Upgrading proxy to V4...");
  const V4 = await ethers.getContractFactory("AlturaNFTLevelerV4");
  console.log("[DEBUG] Got V4 factory: AlturaNFTLevelerV4");
  const levelerV4 = await upgrades.upgradeProxy(
    await levelerV2.getAddress(),
    V4
  );
  console.log(
    "[DEBUG] V4 upgrade transaction hash:",
    levelerV4.deploymentTransaction()?.hash
  );
  await levelerV4.waitForDeployment();
  console.log("[DEBUG] Proxy upgraded to V4 at", await levelerV4.getAddress());

  // Initialize V4
  console.log("[DEBUG] Initializing V4 bridgeAgent...");
  const tx4 = await levelerV4.initializeV4(ethers.ZeroAddress);
  console.log("[DEBUG] initializeV4 transaction hash:", tx4.hash);
  const init4 = await tx4.wait();
  console.log("[DEBUG] initializeV4 mined in block", init4?.blockNumber);

  console.log("[DEBUG] deploy-leveler script completed successfully.");
}

main().catch((e) => {
  console.error("[ERROR] deploy-leveler.ts failed:", e);
  process.exit(1);
});
