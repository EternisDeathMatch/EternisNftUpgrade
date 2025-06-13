
import { ethers, upgrades } from "hardhat";

async function main() {
  // 1) Grab the deployer account from the configured network
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with wallet:", deployer.address);

  // 2) Ensure the ERC-1155 and ERC-20 “stub” contracts are already deployed on Mumbai.
  //    For example, suppose you have their addresses:
  const ALTURA_NFT_V3_ADDRESS = "0xDc77CA73578fA5cE67971632865618aF315dE321"; 
  const FEE_TOKEN_ADDRESS    = "0x4fecDD0B420af7F5d440C4eC45ebB77D0De8f438";     

  // 3) Pick your initial per-level fee (in the ERC-20’s smallest unit)
  //    e.g. 10 tokens if decimals = 18:
  const INITIAL_COST = ethers.parseUnits("10.0", 18);

  // 4) Choose which wallet should be “authorized” to call levelUp() (could be the same as deployer
  //    or a different EOA). Here we’ll use the deployer as authorized for simplicity.
  const AUTHORIZED_ADDR = deployer.address;

  // 5) Compile the upgradeable factory
  const LevelerFactory = await ethers.getContractFactory("AlturaNFTLevelerV2");

  // 6) Deploy a proxy, calling `initialize(...)` under the hood:
  const levelerProxy = await upgrades.deployProxy(
    LevelerFactory,
    [ALTURA_NFT_V3_ADDRESS, FEE_TOKEN_ADDRESS, INITIAL_COST, AUTHORIZED_ADDR],
    { initializer: "initialize" }
  );
  await levelerProxy.waitForDeployment();

  console.log("AlturaNFTLeveler (proxy) deployed at:", await levelerProxy.getAddress());

  // Deploy the messenger linked to this leveler
  const ENDPOINT = process.env.LZ_ENDPOINT;
  if (!ENDPOINT) throw new Error("LZ_ENDPOINT env var not set");
  const Messenger = await ethers.getContractFactory("LevelerMessenger");
  const messenger = await Messenger.deploy(ENDPOINT, await levelerProxy.getAddress());
  await messenger.waitForDeployment();
  console.log("LevelerMessenger deployed at:", await messenger.getAddress());

  // Grant messenger authorization to call levelUp
  const authTx = await levelerProxy.setAuthorized(await messenger.getAddress());
  await authTx.wait();
  console.log("Messenger authorized on leveler");

  // 7) (Optional) Output the implementation address for record‐keeping:
  const impl = await upgrades.erc1967.getImplementationAddress(await levelerProxy.getAddress());
  console.log("Implementation address:", impl);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
