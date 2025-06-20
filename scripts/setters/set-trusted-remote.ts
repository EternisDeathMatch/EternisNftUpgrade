// scripts/set-trusted-remote.ts
import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  // 🏭 Config: read from env or hard-code
  const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS!; // your LevelerReceiver on Amoy
  const SENDER_ADDRESS = process.env.SENDER_ADDRESS!; // XdcLevelerSender on XDC
  const SENDER_CHAIN_ID = Number(process.env.INITIAL_DST_CHAIN!); // e.g. 50
  const AMOY_DEPLOYER_PK = process.env.DEPLOYER_PK!;
  const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL!;

  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const owner = new ethers.Wallet(AMOY_DEPLOYER_PK, provider);

  console.log(`Running on Hardhat network: ${network.name}`);
  console.log(`Receiver: ${RECEIVER_ADDRESS}`);
  console.log(`Sender:   ${SENDER_ADDRESS}`);
  console.log(`Chain ID to trust: ${SENDER_CHAIN_ID}`);

  // 👤 Get the first signer (must be owner of the receiver contract)
  console.log("Signer address:", owner.address);

  // 🔌 Attach to your receiver contract
  const receiver = await ethers.getContractAt(
    "LevelerReceiver",
    RECEIVER_ADDRESS,
    owner
  );

  // 🛠 Build the 40-byte path = remote (XDC sender) || local (Amoy receiver)
  const path = ethers.solidityPacked(
    ["address", "address"],
    [SENDER_ADDRESS, RECEIVER_ADDRESS]
  );
  //   console.log("Path to set:", path.);
  //   console.log(` → Calling setTrustedRemote(${SENDER_CHAIN_ID}, 0x${path.slice(2)})`);
  const tx = await receiver.setTrustedRemote(SENDER_CHAIN_ID, path);
  console.log("   tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ setTrustedRemote completed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
