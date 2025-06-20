// scripts/set-dst-chain.ts
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const SENDER_ADDRESS = process.env.SENDER_ADDRESS!;
  const NEW_DST_CHAIN  = process.env.NEW_DST_CHAIN!;    // e.g. "109"

  if (!SENDER_ADDRESS || !NEW_DST_CHAIN) {
    console.error("❌ Missing env vars. Make sure SENDER_ADDRESS and NEW_DST_CHAIN are set.");
    process.exit(1);
  }

  // 1) Get the deployer / owner signer
  const [owner] = await ethers.getSigners();
  console.log("[DEBUG] Using owner:", owner.address);

  // 2) Attach to your deployed contract
  const sender = await ethers.getContractAt(
    "XdcLevelerSender",
    SENDER_ADDRESS,
  );
  console.log("[DEBUG] Contract at:", await sender.getAddress());

  // 3) Call setDstChain with your new chain ID
  const tx = await sender.connect(owner).setDstChain(Number(NEW_DST_CHAIN));
  console.log(`⏳ setDstChain(${NEW_DST_CHAIN}) tx hash:`, tx.hash);
  await tx.wait();
  console.log("✅ Transaction mined");

  // 4) Verify on-chain
  const updated = await sender.dstChain();
  console.log("🔄 dstChain is now:", updated.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
