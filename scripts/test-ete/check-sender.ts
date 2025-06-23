// scripts/check-leveler-variables.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const RPC_URL       = process.env.XDC_RPC_URL!;
  const CONTRACT_ADDR = process.env.SENDER_ADDRESS!;

  if (!RPC_URL || !CONTRACT_ADDR) {
    console.error("⚠️  Please set XDC_RPC_URL and LEVELER_ADDRESS in your .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const abi = [
    // immutables
    "function endpoint() view returns (address)",
    "function sentinel() view returns (address)",
    // state vars
    "function authorized() view returns (address)",
    "function dstChain() view returns (uint16)",
    "function remoteReceiver() view returns (bytes)",
    "function baseCost() view returns (uint256)",
    "function maxLevel() view returns (uint256)",
  ];
  const lvl = new ethers.Contract(CONTRACT_ADDR, abi, provider);

  // fetch all vars in parallel
  const [
    endpointAddr,
    sentinelAddr,
    auth,
    chainId,
    receiver,
    cost,
    maxLvl
  ] = await Promise.all([
    lvl.endpoint(),
    lvl.sentinel(),
    lvl.authorized(),
    lvl.dstChain(),
    lvl.remoteReceiver(),
    lvl.baseCost(),
    lvl.maxLevel()
  ]);

  console.log(`\n🏗 XdcLevelerSender @ ${CONTRACT_ADDR}`);
  console.log(` • endpoint():        ${endpointAddr}`);
  console.log(` • sentinel():        ${sentinelAddr}`);
  console.log(` • authorized():      ${auth}`);
  console.log(` • dstChain():        ${chainId}`);
  console.log(` • remoteReceiver():  ${receiver}`);
  console.log(` • baseCost():        ${ethers.formatUnits(cost, 18)} (wei)`);
  console.log(` • maxLevel():        ${maxLvl.toString()}\n`);
}

main().catch((e) => {
  console.error("❌ script error:", e);
  process.exit(1);
});
