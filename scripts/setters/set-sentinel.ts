// scripts/set-sentinel.js
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  // ── CONFIG ──
  const RPC_URL        = process.env.XDC_RPC_URL;       // your XDC RPC endpoint
  const PRIVATE_KEY    = process.env.DEPLOYER_PK;       // owner key for sender contract
  const SENDER_ADDRESS = process.env.SENDER_ADDRESS;    // deployed XdcLevelerSender address
  // allow passing new sentinel via CLI or env var
  const NEW_SENTINEL   = process.argv[2] || process.env.NEW_SENTINEL_ADDRESS;

  if (!RPC_URL || !PRIVATE_KEY || !SENDER_ADDRESS || !NEW_SENTINEL) {
    console.error(`
  Missing configuration. Make sure you have:
    • XDC_RPC_URL
    • DEPLOYER_PK
    • SENDER_ADDRESS
    • NEW_SENTINEL_ADDRESS   (or pass as first CLI arg)
    `);
    process.exit(1);
  }

  // ── SETUP PROVIDER & WALLET ──
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  // ── ATTACH CONTRACT ──
  const senderAbi = [
    "function setSentinel(address _newSentinel) external"
  ];
  const sender = new ethers.Contract(SENDER_ADDRESS, senderAbi, wallet);

  // ── SEND TRANSACTION ──
  console.log(`Setting new SentinelToken address → ${NEW_SENTINEL}`);
  const tx = await sender.setSentinel(NEW_SENTINEL);
  console.log("⏳ Tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
}

main().catch(err => {
  console.error("💥 Error:", err);
  process.exit(1);
});
