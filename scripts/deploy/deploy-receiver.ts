import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying LevelerReceiver with account:", deployer.address);

  const LZ_AMOY = process.env.LAYERZERO_AMOY_ENDPOINT!;
  const LEVELER = process.env.LEVELER_PROXY_ADDRESS!;

  const Receiver = await ethers.getContractFactory("LevelerReceiver");
  const receiver = await Receiver.deploy(LZ_AMOY, LEVELER);
  await receiver.waitForDeployment();
  console.log("LevelerReceiver deployed at", await receiver.getAddress());

  // Set bridgeAgent in Leveler
  const leveler = await ethers.getContractAt(
    "AlturaNFTLevelerV4",
    LEVELER,
  );

  await leveler.setBridgeAgent(await receiver.getAddress());
  //0xe630ea92cb3b0a993692dc5babcc2f39a830357c
  console.log("bridgeAgent set to", await receiver.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
