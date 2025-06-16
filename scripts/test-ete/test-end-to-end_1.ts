import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import {
  AlturaNFTLevelerV4,
  SentinelToken,
  XdcLevelerSender,
} from "../../typechain-types";

dotenv.config();

// End-to-end test: burnAndLevel on XDC, then verify leveling on Amoy
async function main() {
  // Load configs
  const XDC_RPC = process.env.XDC_RPC_URL!;
  const AMOY_RPC = process.env.AMOY_RPC_URL!;
  const SENDER_ADDRESS = process.env.SENDER_ADDRESS!;
  const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS!; // Amoy receiver
  const LEVELER_ADDRESS = process.env.LEVELER_PROXY_ADDRESS!;
  const SENTINEL_ADDRESS = process.env.SENTINEL_TOKEN_ADDRESS!;

  const [xdcSigner] = await ethers.getSigners();
  const xdcProvider = ethers.provider;
  console.log(
    "[DEBUG] Running on XDC network:",
    (await xdcProvider.getNetwork()).name
  );
  const PRIVATE_KEY = process.env.DEPLOYER_PK!;

  // Connect contracts
  const sender = await ethers.getContractAt("XdcLevelerSender", SENDER_ADDRESS);
  const receiver = await ethers.getContractAt("LevelerReceiver", RECEIVER_ADDRESS);
  // receiver.once(receiver.filters.ReceivedCall(), () => {
  //   console.log("✅ ReceivedCall() fired on the Amoy receiver!");
  // });
  const sentinel = await ethers.getContractAt(
    "SentinelToken",
    SENTINEL_ADDRESS
  );
  const leveler = await ethers.getContractAt(
    "AlturaNFTLevelerV4",
    LEVELER_ADDRESS
  );

  // Test parameters
  const AMOUNT = ethers.parseUnits("5.1", 18);
  const TOKEN_ID = 69;

  console.log("[TEST] Approving SENTINEL burn...", AMOUNT.toString());
  const chain = await sender.AMOY_CHAIN();
  const endpoint = await sender.endpoint();
  console.log("[TEST] CHAINID: ", chain);
  console.log("[TEST] amoyReceiver:", await sender.amoyReceiver());
  console.log("[TEST] sender:", await sender.getAddress());
  await (await sentinel.approve(SENDER_ADDRESS, AMOUNT)).wait();

  console.log("[TEST] Calling burnAndLevel on XDC...");
  console.log("[TEST] xdcSigner.address:" + xdcSigner.address);
  // Estimate fee
  // 2) Build the same payload you’ll send on-chain
  //    (must match what your contract does: abi.encode(user, tokenId))
  const user = await xdcSigner.getAddress();
  const tokenId = 69;
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [user, tokenId]
  );

  // 3) Call `estimateFees` on the endpoint to get the cross-chain fee
   // 3) Ask your contract to estimate fees
  const [nativeFee, zroFee]: [any, any] =
    await sender.estimateFees(payload, false, "0x");

  console.log("▶️  nativeFee:", nativeFee.toString());
  console.log("▶️  zroFee:   ", zroFee.toString());

  console.log("⚙️  LayerZero nativeFee:", nativeFee.toString());
  console.log("⚙️  LayerZero zroFee:", zroFee.toString());
  try {
    
    const tx = await sender
      .connect(xdcSigner)
      .burnAndLevel(
        ethers.solidityPacked(["uint"], [AMOUNT]),
        await xdcSigner.getAddress(),
        ethers.solidityPacked(["uint"], [TOKEN_ID]),
        { value: AMOUNT }
      );
    await tx.wait();
  } catch (err: any) {
    // Ethers attaches the raw bytes in err.error.data or err.data

    console.error("[ERROR] burnAndLevel failed:", err.message);
    throw err; // or process.exit(1)
  }

  console.log("[TEST] Waiting for cross-chain propagation (sleep 60s)...");
//   await new Promise((r) => setTimeout(r, 60000));

}

main().catch((e) => {
  console.error("[ERROR] test-end-to-end failed:", e);
  process.exit(1);
});
