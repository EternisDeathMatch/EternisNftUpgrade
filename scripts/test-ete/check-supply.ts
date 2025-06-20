// scripts/checkSupply.ts
import { ethers } from "hardhat";

async function main() {
  // 1) Token contract address
  const TOKEN_ADDRESS = process.env.SENTINEL_TOKEN_ADDRESS;

  // 2) Minimal ABI
  const ERC20_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals()   view returns (uint8)",
  ];

  // 3) Get a provider & contract instance
  const provider = ethers.provider;
  const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

  // 4) Query on‐chain
  const [rawSupply, decimals] = await Promise.all([
    token.totalSupply(),
    token.decimals(),
  ]);

  // 5) Format into human‐readable tokens
  const formatted = ethers.formatUnits(rawSupply, decimals);

  console.log("🔹 raw totalSupply (wei):", rawSupply.toString());
  console.log("🔹 decimals:", decimals);
  console.log("🔹 formatted totalSupply:", formatted);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
