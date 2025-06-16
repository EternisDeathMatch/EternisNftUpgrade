import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SentinelToken with account:", deployer.address);

  const Sentinel = await ethers.getContractFactory("SentinelToken");
  const sentinel = await Sentinel.deploy(
    "Sencoin",
    "SEN",
    ethers.parseUnits("8000000", 18),
    deployer.address
  );
  await sentinel.waitForDeployment();
  console.log("SentinelToken deployed at", await sentinel.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
