import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("LevelerMessenger", function () {
  it("forwards cross-chain messages to Leveler", async function () {
    const [owner, user, authorized] = await ethers.getSigners();

    // Deploy ERC1155
    const NFT = await ethers.getContractFactory("MyToken");
    const nft = await NFT.deploy(owner.address);
    await nft.mint(user.address, 1, 1, "0x");

    // Deploy ERC20
    const Token = await ethers.getContractFactory("TestToken");
    const token = await Token.deploy(owner.address);
    await token.mint(user.address, ethers.parseUnits("100", 18));

    // Deploy Leveler V3
    const Leveler = await ethers.getContractFactory("AlturaNFTLevelerV3");
    const leveler = await upgrades.deployProxy(
      Leveler,
      [await nft.getAddress(), await token.getAddress(), ethers.parseUnits("1", 18), authorized.address],
      { initializer: "initialize" }
    );
    await leveler.waitForDeployment();
    await leveler.initializeV3(10);

    // Deploy mock endpoint and messenger
    const Endpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    const endpoint = await Endpoint.deploy();

    const Messenger = await ethers.getContractFactory("LevelerMessenger");
    const messenger = await Messenger.deploy(await endpoint.getAddress(), await leveler.getAddress());

    // Make messenger the authorized caller
    await leveler.connect(owner).setAuthorized(await messenger.getAddress());

    // Approve fee payment
    await token.connect(user).approve(await leveler.getAddress(), ethers.parseUnits("10", 18));

    const payload = ethers.AbiCoder.defaultAbiCoder().encode([
      "address",
      "uint256",
      "uint8",
    ], [user.address, 1, 1]);

    await endpoint.send(await messenger.getAddress(), payload);

    expect(await leveler.getLevel(1)).to.equal(1);
  });
});

