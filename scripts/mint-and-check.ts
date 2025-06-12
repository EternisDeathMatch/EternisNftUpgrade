import { ethers } from "hardhat";

async function main() {
  // 1) Grab a signer (must be the owner of TestToken)
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // 2) Attach to the already‐deployed TestToken contract
  //    Replace with your actual TestToken address on Amoy (or whichever network)
  const TEST_TOKEN_ADDRESS = "0x4fecDD0B420af7F5d440C4eC45ebB77D0De8f438";
  const testToken = await ethers.getContractAt("TestToken", TEST_TOKEN_ADDRESS);

  // 3) Specify the target “userC” address and amount to mint
  const USER_C = "0x2DC487EA1bf6c882048B4f771D453eDa165a10af";
  const AMOUNT_TO_MINT = ethers.parseUnits("100.0", 18); // 50.0 TTKN

  // 4) Mint 50 TTKN to userC
  console.log(`Minting ${AMOUNT_TO_MINT.toString()} tokens to ${USER_C}...`);
  const tx = await testToken.connect(deployer).mint(USER_C, AMOUNT_TO_MINT);
  await tx.wait();
  console.log("Mint transaction hash:", tx.hash);

  // 5) Query userC’s balance to verify
  const balance = await testToken.balanceOf(USER_C);
  console.log(`UserC balance is now: ${ethers.formatUnits(balance, 18)} TTKN`);
}

// Boilerplate to run the script and catch errors
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
