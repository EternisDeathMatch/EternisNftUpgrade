import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TestToken as:", deployer.address);
// 1) Compile your factory as usual
const TestTokenFactory = await ethers.getContractFactory("TestToken");

// 2) Choose a safe gas limit (e.g. 3 million units) and fetch current gas price
const GAS_LIMIT = 3_000_000;
const gasPriceHex: string = await ethers.provider.send("eth_gasPrice", []);
const gasPrice: bigint = BigInt(gasPriceHex);
// const GAS_PRICE = await ethers.provider.getGasPrice(); // fallback if this still fails

  console.log("Gas price (wei):", gasPrice.toString());
// 3) Deploy while specifying `gasLimit` explicitly
const testToken = await TestTokenFactory.deploy(
  deployer.address,
  {
    gasLimit: GAS_LIMIT,
    // if `getGasPrice()` works against "latest", you can also pass:
    gasPrice: gasPrice
  }
);

// 4) Wait for it to be mined
await testToken.waitForDeployment();
console.log("Deployed at:", await testToken.getAddress());

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
