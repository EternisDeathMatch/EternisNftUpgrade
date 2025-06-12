// scripts/check‐batch‐levels.ts
import { ethers } from "hardhat";

async function main() {
  // ── A) Get three signers (we’ll use deployer for calls, but do not call levelUp)
  const [deployer, userA, userB] = await ethers.getSigners();
  console.log("Caller (deployer):", await deployer.getAddress());
  console.log("UserA:            ", await userA.getAddress());
  console.log("UserB:            ", await userB.getAddress());

  // ── B) Attach to already‐deployed contracts (on Amoy/Polygon)
  //    Replace these constants with your real addresses:
  const MYTOKEN_ADDRESS   = "0xDc77CA73578fA5cE67971632865618aF315dE321"; // MyToken (ERC‐1155)
  const TESTTOKEN_ADDRESS = "0x4fecDD0B420af7F5d440C4eC45ebB77D0De8f438"; // TestToken (ERC‐20)
  const LEVELER_ADDRESS   = "0x2312B28684a1819614f6201349a6654ea1960b94"; // Proxy for AlturaNFTLevelerV2

  const myToken   = await ethers.getContractAt("MyToken", MYTOKEN_ADDRESS);
  const testToken = await ethers.getContractAt("TestToken", TESTTOKEN_ADDRESS);
  const leveler   = await ethers.getContractAt("AlturaNFTLevelerV2", LEVELER_ADDRESS);

  // ── C) Choose a batch of token IDs to query (e.g., [1, 2, 3, 42])
  //    These IDs can be any uint256 values; if no one leveled them yet, getLevels will return 0.
  const tokenIds = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69];
  console.log("\nFetching levels for token IDs:", tokenIds);

  // ── D) Call getLevels(...) as a view (no gas cost when run off‐chain).
  const levels = await leveler.getLevels(tokenIds);

  // ── E) Print out the result side by side
  console.log("Returned levels:");
  for (let i = 0; i < tokenIds.length; i++) {
    console.log(`  tokenId = ${tokenIds[i]}  →  level = ${levels[i].toString()}`);
  }

  // ── F) Optionally, compare with single‐getter calls for sanity checking
  console.log("\nSanity check via single‐getter:");
  for (const tid of tokenIds) {
    const singleLvl = await leveler.getLevel(tid);
    console.log(`  getLevel(${tid}) = ${singleLvl.toString()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
