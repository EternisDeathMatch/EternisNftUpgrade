// scripts/test-max-level.ts
import { ethers } from "hardhat";

async function main() {
  // ── A) Signers ────────────────────────────────────────────────
  // By convention in your tests: [owner, authorized, anotherAddr, userA, userB]
  const [owner, authorized, userA] = await ethers.getSigners();
  console.log("Owner (can setMaxLevel):", await owner.getAddress());
  console.log("Authorized (can call levelUp):", await authorized.getAddress());
  console.log("UserA   (owns the NFT):", await userA.getAddress());

  // ── B) Deployed contract addresses ───────────────────────────
  const MYTOKEN_ADDRESS = "0xDc77CA73578fA5cE67971632865618aF315dE321"; // replace
  const TESTTOKEN_ADDRESS = "0x4fecDD0B420af7F5d440C4eC45ebB77D0De8f438"; // replace
  const LEVELER_ADDRESS = "0x2312B28684a1819614f6201349a6654ea1960b94"; // replace

  // ── C) Attach to contracts ─────────────────────────────────
  const myToken = await ethers.getContractAt("MyToken", MYTOKEN_ADDRESS);
  const testToken = await ethers.getContractAt("TestToken", TESTTOKEN_ADDRESS);
  const leveler = await ethers.getContractAt(
    "AlturaNFTLevelerV3",
    LEVELER_ADDRESS
  );

  // ── D) Read & log maxLevel + current level ──────────────────
  const maxLevel = await leveler.maxLevel();
  console.log("Current maxLevel:", maxLevel.toString());

  const TOKEN_ID = 64; // pick an ID you know userA owns
  const initLvl = await leveler.getLevel(TOKEN_ID);
  console.log(`Initial levelOf[${TOKEN_ID}]:`, initLvl.toString());

  // ── E) Determine dynamic upgrade cost for TOKEN_ID and approve ─
  const cost = await leveler.getUpgradeCost(TOKEN_ID);
  if (cost > 0) {
    const totalNeeded = cost * maxLevel;
    console.log(`Approving ${totalNeeded.toString()} for userA…`);
    await testToken.connect(userA).approve(LEVELER_ADDRESS, totalNeeded);
  }

  // ── F) Try to levelUp until we hit the cap ───────────────────
  console.log(`\n⏳ Calling levelUp up to ${maxLevel.toString()} times…`);
  for (let i = 1n; i <= maxLevel + 1n; i++) {
    try {
      console.log(`  → Attempt #${i}`);
      const tx = await leveler
        .connect(authorized)
        .levelUp(await userA.getAddress(), TOKEN_ID, 1);
      await tx.wait();
      const lvl = await leveler.getLevel(TOKEN_ID);
      console.log("    ✔ success, level is now", lvl.toString());
    } catch (err: any) {
      console.log("    ✖ reverted:", err.reason || err.message);
    }
  }

  console.log("\n⏳ One more levelUp after raising cap:");
  try {
    const tx2 = await leveler
      .connect(authorized)
      .levelUp(await userA.getAddress(), TOKEN_ID, 1);
    await tx2.wait();
    console.log(
      "  ✔ success, level is now",
      (await leveler.getLevel(TOKEN_ID)).toString()
    );
  } catch (err: any) {
    console.log("  ✖ still reverted:", err.reason || err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
