// scripts/set-trusted-spender.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

async function main(): Promise<void> {
  // ── CONFIG ──
  // RPC where your SentinelToken is deployed (e.g. XDC)
  const RPC_URL               = process.env.XDC_RPC_URL;
  const PRIVATE_KEY           = process.env.DEPLOYER_PK;
  // address of your SentinelToken
  const SENTINEL_ADDRESS      = process.env.SENTINEL_TOKEN_ADDRESS;
  // the address you want to whitelist as a trusted spender
  const TRUSTED_SPENDER_ADDR  = process.env.SENDER_ADDRESS;
  // true to enable, false to disable
  const ENABLE_TRUST          = process.env.ENABLE_TRUST === 'false' ? false : true;

  if (
    !RPC_URL ||
    !PRIVATE_KEY ||
    !SENTINEL_ADDRESS ||
    !TRUSTED_SPENDER_ADDR
  ) {
    console.error(`
Missing configuration in .env. Please set:
  • XDC_RPC_URL
  • DEPLOYER_PK
  • SENTINEL_TOKEN_ADDRESS
  • TRUSTED_SPENDER_ADDRESS
  • (optional) ENABLE_TRUST (default "true")
`);
    process.exit(1);
  }

  // ── SETUP ──
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Using deployer address:", wallet.address);

  // ── ATTACH TOKEN CONTRACT ──
  const sentinelAbi = [
    "function setTrustedSpender(address who, bool ok) external"
  ];
  const sentinel = new ethers.Contract(SENTINEL_ADDRESS, sentinelAbi, wallet);
  console.log("Attached SentinelToken @", SENTINEL_ADDRESS);

  // ── TRANSACTION ──
  console.log(
    `${ENABLE_TRUST ? "Adding" : "Removing"} trusted spender:`,
    TRUSTED_SPENDER_ADDR
  );
  const tx = await sentinel.setTrustedSpender(TRUSTED_SPENDER_ADDR, ENABLE_TRUST);
  console.log("⏳ Tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Completed in block", receipt.blockNumber);
}

main().catch((err) => {
  console.error("❌ Uncaught error:", err);
  process.exit(1);
});
