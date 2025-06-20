import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating XdcLevelerSender receiver with account:", deployer.address);

  const SENDER   = process.env.SENDER_ADDRESS!;
  const RECEIVER = process.env.RECEIVER_ADDRESS!;

  const sender = await ethers.getContractAt("XdcLevelerSender", SENDER);
  const payload = ethers.solidityPacked(["address"], [RECEIVER]);
  const tx = await sender.setRemoteReceiver(payload);
  await tx.wait();
  console.log("XDC sender now points to receiver", RECEIVER);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
