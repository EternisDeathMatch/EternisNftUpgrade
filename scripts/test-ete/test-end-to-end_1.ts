import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import {
  XdcLevelerSender,
  SentinelToken,
  LevelerReceiver,
} from "../../typechain-types";
import { Wallet } from "ethers";

dotenv.config();

async function main() {
  // 1️⃣ Load configs
  const XDC_RPC = process.env.XDC_RPC_URL!;
  const AMOY_RPC = process.env.AMOY_RPC_URL!;
  const SENDER_ADDRESS = process.env.SENDER_ADDRESS!;
  const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS!;
  const LEVELER_ADDRESS = process.env.LEVELER_PROXY_ADDRESS!;
  const SENTINEL_ADDRESS = process.env.SENTINEL_TOKEN_ADDRESS!;

  // 2️⃣ Your signer/provider – unchanged
  const [xdcSigner] = await ethers.getSigners();
  const xdcProvider = ethers.provider;
  console.log(
    "[DEBUG] Running on XDC network:",
    (await xdcProvider.getNetwork()).name
  );
  console.log("[DEBUG] Deployer address:", xdcSigner.address);
  const PRIVATE_KEY = process.env.DEPLOYER_PK!;

  // 3️⃣ Connect contracts *with* your signer
  const sender = (await ethers.getContractAt(
    "XdcLevelerSender",
    SENDER_ADDRESS
  )) as XdcLevelerSender;
  const sentinel = (await ethers.getContractAt(
    "SentinelToken",
    SENTINEL_ADDRESS
  )) as SentinelToken;

  const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL!;

  // create a plain provider for Amoy
  const amoyProvider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const amoySigner = new Wallet(PRIVATE_KEY, amoyProvider);
  console.log("[AMOY] RPC url:", AMOY_RPC);

  // attach to the deployed LevelerReceiver contract on Amoy
  const receiverOnAmoy = (await ethers.getContractAt(
    "LevelerReceiver",
    RECEIVER_ADDRESS,
    amoySigner
  )) as LevelerReceiver;
  const levelerAddr = await receiverOnAmoy.leveler();
  console.log("[AMOY] LevelerReceiver.leveler() →", levelerAddr);

  console.log("[DEBUG] XdcLevelerSender address:", await sender.getAddress());
  console.log(
    "[DEBUG] XdcLevelerSender address endpoint:",
    await sender.endpoint()
  );
  console.log("[DEBUG] SentinelToken address:", await sentinel.getAddress());

  // Read on‐chain sender config
  const dstChain = await sender.dstChain();
  const remoteReceiver = await sender.remoteReceiver();
  const baseCost = await sender.baseCost();
  const maxLevel = await sender.maxLevel();
  const authorized = await sender.authorized();
  console.log("[DEBUG] Sender config:", {
    dstChain,
    remoteReceiver,
    baseCost: baseCost.toString(),
    maxLevel: maxLevel.toString(),
    authorized,
  });

  // 4️⃣ Test parameters
  const AMOUNT = ethers.parseUnits("200", 18);
  const USER = await xdcSigner.getAddress();
  const TOKEN_ID = 5;
  const RARITY = 2; // 1..3
  const CURRENT_LEVEL = 0; // must be < maxLevel

  console.log("[TEST] burnAndLevel parameters:", {
    user: USER,
    tokenId: TOKEN_ID,
    rarity: RARITY,
    currentLevel: CURRENT_LEVEL,
  });

  // 5️⃣ Approve SENT spending
  console.log("[TEST] Approving SENT spend:", AMOUNT.toString());
  const approveTx = await sentinel.approve(SENDER_ADDRESS, AMOUNT);
  console.log("[DEBUG] Approval tx hash:", approveTx.hash);
  await approveTx.wait();
  const allowance = await sentinel.allowance(USER, SENDER_ADDRESS);
  console.log("[DEBUG] Allowance after approve:", allowance.toString());

  // 6️⃣ Build the ABI-encoded payload (matches `abi.encode(user, tokenId, rarity)`)
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint8"],
    [USER, TOKEN_ID, RARITY]
  );
  console.log("[DEBUG] Payload (ABI-encoded):", payload);

  // 7️⃣ Estimate the LayerZero fee
  const [nativeFee, zroFee] = await sender.estimateFees(payload, false, "0x");
  console.log("[TEST] LayerZero fees:", {
    nativeFee: nativeFee.toString(),
    zroFee: zroFee.toString(),
  });

  // 8️⃣ Call burnAndLevel(user, tokenId, rarity, currentLevel) + pay fee
  console.log("[TEST] Calling burnAndLevel on XDC…");
  try {
    const tx = await sender.burnAndLevel(
      USER,
      TOKEN_ID,
      RARITY,
      CURRENT_LEVEL,
      { value: nativeFee + 1n }
    );
    console.log("[DEBUG] burnAndLevel tx hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("[DEBUG] burnAndLevel mined in block:", receipt!.blockNumber);
    console.log("✅ burnAndLevel succeeded on XDC");
  } catch (err: any) {
    console.error("[ERROR] burnAndLevel failed:", err.message);
    process.exit(1);
  }

  // 9️⃣ (Optional) Now sleep/await and verify on the Amoy side…
  console.log("[TEST] Done. Verify your LevelerReceiver on Amoy network.");
}

main().catch((e) => {
  console.error("[ERROR] test-end-to-end failed:", e);
  process.exit(1);
});
