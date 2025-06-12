// scripts/upgrade-leveler.ts
import { ethers, upgrades } from "hardhat";
// 0x7E8208FB014b5d4865264197EBF17eF600beF098 - latest implementation address
async function main() {
  // 1) Retrieve the deployer (this account must have the private key that was used
  //    to deploy the original proxy, or at least be an ADMIN for that proxy).
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading using account:", deployer.address);

  // 2) Specify the address of the existing proxy you want to upgrade
  const OLD_PROXY_ADDRESS = "0x2312B28684a1819614f6201349a6654ea1960b94"; // ← replace with your proxy address

  // 3) Fetch the new implementation’s factory; e.g. if you wrote V3 logic:
  const LevelerV3Factory = await ethers.getContractFactory("AlturaNFTLevelerV2");

  // 4) Execute the upgrade: this deploys a fresh implementation contract
  //    and updates the proxy’s internal pointer to that new implementation.
  const upgradedProxy = await upgrades.upgradeProxy(
    OLD_PROXY_ADDRESS,
    LevelerV3Factory
  );
  await upgradedProxy.deploymentTransaction()?.wait();

  // 5) Verify and log
  const newImplementation = await upgrades.erc1967.getImplementationAddress(
    await upgradedProxy.getAddress()
  );
  console.log("✅ Proxy address remains:  ", await upgradedProxy.getAddress());
  console.log("✅ New implementation:    ", newImplementation);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Upgrade failed:", err);
    process.exit(1);
  });
