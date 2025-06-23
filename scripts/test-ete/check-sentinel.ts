// scripts/check-sentinel-variables.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const RPC_URL        = process.env.XDC_RPC_URL!;
  const TOKEN_ADDRESS  = process.env.SENTINEL_TOKEN_ADDRESS!;
  // optional: address to inspect for “trusted spender”
  const INSPECT_ADDR   = process.env.SENDER_ADDRESS;

  if (!RPC_URL || !TOKEN_ADDRESS) {
    console.error("⚠️  Please set XDC_RPC_URL and SENTINEL_TOKEN_ADDRESS in your .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abi = [
    // basic ERC20 + Ownable
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function owner() view returns (address)",
    // your added getters
    "function isTrustedSpender(address) view returns (bool)",
    "function getStakeDetails(address,uint256) view returns (uint256 amount, uint256 startTime, uint256 endTime, bool claimed)"
  ];
  const token = new ethers.Contract(TOKEN_ADDRESS, abi, provider);

  // 1) Core token vars
  const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.owner(),
  ]);
  console.log("🔹 name():", name);
  console.log("🔹 symbol():", symbol);
  console.log("🔹 decimals():", decimals.toString());
  console.log(
    "🔹 totalSupply():",
    ethers.formatUnits(totalSupply, decimals),
    symbol
  );
  console.log("🔹 owner():", owner);

  // 2) If you want to inspect one address’s trusted-spender flag:
  if (INSPECT_ADDR) {
    const trusted = await token.isTrustedSpender(INSPECT_ADDR);
    console.log(`\n🔹 isTrustedSpender(${INSPECT_ADDR}):`, trusted);
  }

  // 3) If you want to inspect one stake’s details (set STAKE_USER and STAKE_INDEX in .env):
  const STAKE_USER = process.env.STAKE_USER;
  const STAKE_INDEX = process.env.STAKE_INDEX ? Number(process.env.STAKE_INDEX) : undefined;
  if (STAKE_USER && STAKE_INDEX !== undefined) {
    const [amt, startTs, endTs, claimed] = await token.getStakeDetails(
      STAKE_USER,
      STAKE_INDEX
    );
    console.log(`\n🔹 getStakeDetails(${STAKE_USER}, ${STAKE_INDEX}):`);
    console.log("   • amount:   ", ethers.formatUnits(amt, decimals), symbol);
    console.log("   • startTime:", new Date(startTs.toNumber() * 1e3).toISOString());
    console.log("   • endTime:  ", new Date(endTs.toNumber() * 1e3).toISOString());
    console.log("   • claimed:  ", claimed);
  }
}

main().catch((e) => {
  console.error("❌ script error:", e);
  process.exit(1);
});
