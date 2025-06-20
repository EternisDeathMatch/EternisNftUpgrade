import { ethers, upgrades } from "hardhat";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ALTURA_NFT = process.env.ALTURA_NFT_ADDRESS!;

  // 1) deploy V2 proxy
  const V2 = await ethers.getContractFactory("AlturaNFTLevelerV2");
  const levelerV2 = await upgrades.deployProxy(
    V2,
    [ALTURA_NFT, ethers.ZeroAddress, 1, deployer.address],
    { initializer: "initialize" }
  );
  await levelerV2.waitForDeployment();

  const proxyAddress = await levelerV2.getAddress();
  console.log("🔹 Proxy address:", proxyAddress);

  // give a moment before reading impl
  await delay(5000);
  const implV2 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("🔹 V2 Implementation address:", implV2);

  // 2) upgrade to V3 *and* run initializeV3
  const V3 = await ethers.getContractFactory("AlturaNFTLevelerV3");
  const levelerV3 = await upgrades.upgradeProxy(proxyAddress, V3, {
    call: { fn: "initializeV3", args: [3] },
  });
  await levelerV3.waitForDeployment();

  // pause before fetching V3 impl
  console.log("⏳ Waiting 5s before reading V3 implementation…");
  await delay(5000);
  const implV3 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("🔹 V3 Implementation address:", implV3);

  // 3) upgrade to V4 *and* run initializeV4
  const V4 = await ethers.getContractFactory("AlturaNFTLevelerV4");
  const levelerV4 = await upgrades.upgradeProxy(proxyAddress, V4, {
    call: { fn: "initializeV4", args: [ethers.ZeroAddress] },
  });
  await levelerV4.waitForDeployment();

  // final pause before reading V4 impl
  console.log("⏳ Waiting 5s before reading V4 implementation…");
  await delay(5000);
  const implV4 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("🔹 V4 Implementation address:", implV4);

  console.log("✅ Fully upgraded to V4 at proxy:", proxyAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
// 🔹 Proxy address: 0x7d4Bfb6cC51AF9D9e4cadA539aC3EEd7e0638312
// 🔹 V2 Implementation address: 0x40dD81435115e73D9d8C5AB128DABF400C1BdAA4
// ⏳ Waiting 5s before reading V3 implementation…
// 🔹 V3 Implementation address: 0xDaAc7e908dDf05E452475D4949e93806036C5394
// ⏳ Waiting 5s before reading V4 implementation…
// 🔹 V4 Implementation address: 0x9420b11fe9Bc3D68EbBD5c1b5A862dce83f299F9
// ✅ Fully upgraded to V4 at proxy: 0x7d4Bfb6cC51AF9D9e4cadA539aC3EEd7e0638312