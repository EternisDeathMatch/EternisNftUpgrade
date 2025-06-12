// scripts/test-leveler-with-level-check.ts
import { ethers } from "hardhat";

async function main() {
  // A) Get signers
  const [deployer, userA, userB] = await ethers.getSigners();
  console.log("deployer:", await deployer.getAddress());
  console.log("userA:   ", await userA.getAddress());
  console.log("userB:   ", await userB.getAddress());

  // B) Attach to deployed contracts
  const MYTOKEN_ADDRESS = "0xDc77CA73578fA5cE67971632865618aF315dE321";
  const TESTTOKEN_ADDRESS = "0x4fecDD0B420af7F5d440C4eC45ebB77D0De8f438";
  const LEVELER_ADDRESS = "0x2312B28684a1819614f6201349a6654ea1960b94";

  const myToken = await ethers.getContractAt("MyToken", MYTOKEN_ADDRESS);
  const testToken = await ethers.getContractAt("TestToken", TESTTOKEN_ADDRESS);
  const leveler = await ethers.getContractAt(
    "AlturaNFTLevelerV2",
    LEVELER_ADDRESS
  );

  // C) Log initial state
  console.log("\n--- Initial State ---");
  console.log(
    " userA NFT(62)       =",
    (await myToken.balanceOf(await userA.getAddress(), 62)).toString()
  );
  console.log(
    " userA TTKN         =",
    ethers.formatUnits(await testToken.balanceOf(await userA.getAddress()), 18)
  );
  console.log(
    " baseCost            =",
    (await leveler.getBaseCost()).toString()
  );

  // D) Check current on-chain level
  const levelBefore = await leveler.getLevel(62);
  console.log(" current on-chain level for NFT 62 =", levelBefore.toString());

  // E) Approve fee tokens for userA (one upgrade)
  const cost = await leveler.getUpgradeCost(62);
  await testToken.connect(userA).approve(LEVELER_ADDRESS, cost);
  console.log("\n→ userA approved", cost.toString(), "TTKN to Leveler");

  // F) Call levelUp and wait for it to be mined
  console.log("\n--- Calling levelUp(userA, 62) as authorized (deployer) ---");
  const tx1 = await leveler
    .connect(deployer)
    .levelUp(await userA.getAddress(), 62, 1);
  await tx1.wait();
  console.log("→ leveled up userA’s token ID 62 once");

  // G) Verify state after the transaction is mined
  console.log("\n--- After LevelUp ---");
  console.log(
    " userA TTKN after    =",
    ethers.formatUnits(await testToken.balanceOf(await userA.getAddress()), 18)
  );
  console.log(
    " userA NFT(62) still =",
    (await myToken.balanceOf(await userA.getAddress(), 62)).toString()
  );

  const levelAfter = await leveler.getLevel(62);
  console.log(" new on-chain level for NFT 62     =", levelAfter.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
