import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { AlturaNFTLevelerV4 } from "../../typechain-types";

dotenv.config();

async function main() {
  // 1) Load your Polygon RPC and the Leveler proxy address
  const AMOY_RPC_URL          = process.env.POLYGON_RPC_URL!;
  const LEVELER_PROXY_ADDRESS = process.env.LEVELER_PROXY_ADDRESS!;

  // 2) The token IDs you want to check
  const TOKEN_IDS = [1, 2, 69];

  // 3) Spin up a Polygon provider
  const polygonProvider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
  console.log("[POLYGON] RPC URL:", AMOY_RPC_URL);

  // 4) Attach to your Leveler contract with the polygon provider
  const leveler = (await ethers.getContractAt(
    "AlturaNFTLevelerV4",
    LEVELER_PROXY_ADDRESS,
  )) as AlturaNFTLevelerV4;
  console.log("[POLYGON] AlturaNFTLevelerV4 @", LEVELER_PROXY_ADDRESS);

  // 5) Fetch all levels in one batch call
  console.log("[CHECK] tokenIds:", TOKEN_IDS);
  const levels = await leveler.getLevels(TOKEN_IDS);
  
  // 6) Print results
  console.log("\n🎯 Current levels:");
  TOKEN_IDS.forEach((id, i) => {
    console.log(`  • token ${id}: level ${levels[i].toString()}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
