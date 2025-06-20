import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("[DEBUG] Deployer:", deployer.address);

  const LZ_XDC = process.env.LAYERZERO_XDC_ENDPOINT!;
  const SENT = process.env.SENTINEL_TOKEN_ADDRESS!;
  const BASE = process.env.BASE_COST!; // e.g. "100"
  const DST = process.env.INITIAL_DST_CHAIN!; // e.g. "1"
  const MAX = process.env.INITIAL_MAX_LEVEL!; // e.g. "10"
  const AUTH = process.env.INITIAL_AUTH!; // e.g. deployer.address

  // encode the receiver (bytes)
  const RECEIVER_PLACEHOLDER = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address"],
    [ethers.ZeroAddress]
  );

  // parse numeric envs
  const baseCost = ethers.parseUnits(BASE, 18);
  const initialDst = Number(DST);
  const initialMax = Number(MAX);
  const initialAuth = AUTH;

  console.log("[DEBUG] Params:", {
    LZ_XDC,
    SENT,
    baseCost,
    initialDst,
    initialMax,
    initialAuth,
  });

  // fetch factory & deploy
  const Sender = await ethers.getContractFactory("XdcLevelerSender");
  const sender = await Sender.deploy(
    LZ_XDC,
    SENT,
    RECEIVER_PLACEHOLDER,
    baseCost,
    initialDst,
    initialMax,
    initialAuth
  );
  await sender.waitForDeployment();

  console.log(
    "[DEBUG] XdcLevelerSender deployed at",
    await sender.getAddress()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
