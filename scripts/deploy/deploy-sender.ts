import { ethers } from "hardhat";

async function main() {
  // 1. Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("[DEBUG] Deployer address:", deployer.address);

  // 2. Read LayerZero endpoint and token address from env
  const LZ_XDC = process.env.LAYERZERO_XDC_ENDPOINT!;
  console.log("[DEBUG] LayerZero XDC endpoint:", LZ_XDC);
  const SENT = process.env.SENTINEL_TOKEN_ADDRESS!;
  console.log("[DEBUG] SentinelToken address:", SENT);

  // 3. Encode placeholder for receiver (zero address)
  const RECEIVER_PLACEHOLDER = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address"],
    [ethers.ZeroAddress]
  );
  console.log("[DEBUG] Encoded receiver placeholder:", RECEIVER_PLACEHOLDER);

  // 4. Fetch contract factory
  console.log("[DEBUG] Fetching XdcLevelerSender factory...");
  const Sender = await ethers.getContractFactory("XdcLevelerSender");
  console.log("[DEBUG] Factory fetched successfully.");

  // 5. Deploy contract
  console.log("[DEBUG] Deploying XdcLevelerSender...");
  const sender = await Sender.deploy(
    LZ_XDC,
    SENT,
    RECEIVER_PLACEHOLDER
  );
//   console.log("[DEBUG] Deployment tx hash:", await (await sender.waitForDeployment()).getAddress());

  // 6. Wait for deployment to complete
  await sender.waitForDeployment();
  console.log("[DEBUG] Deployment confirmed at address:", await sender.getAddress());
  //0x68636Bf774e8C5b7fD51C977Cd530c10b080005a

  // 7. Optional: verify on-chain parameters
  try {
    const chainId = await deployer.provider?.getNetwork().then((network) => network.chainId);
    console.log("[DEBUG] Deployed on chainId:", chainId);
  } catch (e) {
    console.warn("[DEBUG] Could not fetch chainId:", e);
  }
}

main().catch((e) => {
  console.error("[ERROR] deploy-sender.js failed:", e);
  process.exit(1);
});
