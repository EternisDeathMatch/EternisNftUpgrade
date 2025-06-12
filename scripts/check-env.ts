import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("DEPLOYER_PRIVATE_KEY =", process.env.DEPLOYER_PRIVATE_KEY);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
