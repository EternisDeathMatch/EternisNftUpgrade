import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  MyToken,
  TestToken,
  AlturaNFTLevelerV2,
  AlturaNFTLevelerV3,
} from "../typechain-types";

describe("AlturaNFTLeveler (upgradeable) — using TestToken + MyToken", function () {
  let owner: SignerWithAddress;
  let authorized: SignerWithAddress;
  let anotherAddr: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;

  let nft: MyToken; // ERC-1155 stub
  let token: TestToken; // ERC-20 stub
  let leveler: AlturaNFTLevelerV2; // The proxy instance

  const TOKEN_ID = 1;
  const OTHER_TOKEN_ID = 2;
  const parseUnits = (v: string, d: number) => ethers.parseUnits(v, d);
  const INITIAL_COST = parseUnits("10.0", 18); // 10 TTKN

  beforeEach(async function () {
    [owner, authorized, anotherAddr, userA, userB] = await ethers.getSigners();

    // — Step 1: deploy MyToken (ERC-1155) —
    const MyTokenFactory = await ethers.getContractFactory("MyToken");
    nft = (await MyTokenFactory.deploy(owner.address)) as MyToken;

    // Mint NFTs (only owner can mint)
    await nft.connect(owner).mint(userA.address, TOKEN_ID, 1, "0x");
    await nft.connect(owner).mint(userB.address, OTHER_TOKEN_ID, 1, "0x");

    // — Step 2: deploy TestToken (ERC-20) —
    const TestTokenFactory = await ethers.getContractFactory("TestToken");
    token = (await TestTokenFactory.deploy(owner.address)) as TestToken;

    // Mint fee‐token to userA & userB
    await token.connect(owner).mint(userA.address, parseUnits("100.0", 18));
    await token.connect(owner).mint(userB.address, parseUnits("100.0", 18));

    // — Step 3: deploy the upgradeable Leveler via proxy —
    const LevelerFactory = await ethers.getContractFactory(
      "AlturaNFTLevelerV2"
    );
    leveler = (await upgrades.deployProxy(
      LevelerFactory,
      [
        await nft.getAddress(), // _alturaAddress
        await token.getAddress(), // _paymentToken
        INITIAL_COST, // _initialCost
        await authorized.getAddress(), // _authorizedAddr
      ],
      { initializer: "initialize" }
    )) as AlturaNFTLevelerV2;

    // No need to call “.deployed()” after deployProxy; it returns a fully initialized proxy.
  });

  describe("Deployment & initial state", function () {
    it("should set constructor (initialize) parameters correctly", async function () {
      // check that `altura` matches nft.address
      expect(await leveler.altura()).to.equal(await nft.getAddress());

      // check that paymentToken matches token.address
      expect(await leveler.paymentToken()).to.equal(await token.getAddress());

      // check that upgradeCost is what we passed in
      expect(await leveler.getBaseCost()).to.equal(INITIAL_COST);

      // Owner of the upgradeable contract is the deployer (owner.address)
      expect(await leveler.owner()).to.equal(owner.address);

      // Authorized must match what we passed in
      expect(await leveler.authorized()).to.equal(authorized.address);
    });

    it("should have initial levels equal to zero", async function () {
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(0);
      expect(await leveler.getLevel(OTHER_TOKEN_ID)).to.equal(0);
      expect(await leveler.getLevel(999)).to.equal(0);
    });
  });

  describe("Access control on setters", function () {
    it("only owner can call setUpgradeCost", async function () {
      const newCost = parseUnits("5.0", 18);

      // (1) Owner succeeds
      await expect(leveler.connect(owner).setUpgradeCost(newCost))
        .to.emit(leveler, "CostChanged")
        .withArgs(newCost);
      expect(await leveler.getBaseCost()).to.equal(newCost);

      // (2) Non-owner should revert; we catch the error and log its message:
      try {
        await leveler.connect(anotherAddr).setUpgradeCost(newCost);
      } catch (err: any) {
        console.log("Revert error for setUpgradeCost:", err.message);
      }

      // (3) Now assert using revertedWithCustomError:
      await expect(leveler.connect(anotherAddr).setUpgradeCost(newCost))
        .to.be.revertedWithCustomError(leveler, "OwnableUnauthorizedAccount")
        .withArgs(anotherAddr.address);
    });

    it("only owner can call setAuthorized", async function () {
      // (1) Owner → succeeds
      await expect(leveler.connect(owner).setAuthorized(userA.address))
        .to.emit(leveler, "AuthorizedChanged")
        .withArgs(userA.address);
      expect(await leveler.authorized()).to.equal(userA.address);

      // (2) Non-owner should revert; catch & log
      try {
        await leveler.connect(userB).setAuthorized(userB.address);
      } catch (err: any) {
        console.log("Revert error for setAuthorized:", err.message);
      }

      // (3) Finally assert custom‐error
      await expect(leveler.connect(userB).setAuthorized(userB.address))
        .to.be.revertedWithCustomError(leveler, "OwnableUnauthorizedAccount")
        .withArgs(userB.address);
    });

    it("setAuthorized reverts if zero address is passed", async function () {
      const ZERO = ethers.ZeroAddress;
      await expect(
        leveler.connect(owner).setAuthorized(ZERO)
      ).to.be.revertedWith("Zero address not allowed");
    });
  });

  describe("levelUp function", function () {
    beforeEach(async function () {
      // userA & userB each approve 10× cost (100 TTKN)
      await token
        .connect(userA)
        .approve(await leveler.getAddress(), INITIAL_COST * 10n);
      await token
        .connect(userB)
        .approve(await leveler.getAddress(), INITIAL_COST * 10n);
    });

    it("reverts if non-authorized account calls levelUp", async function () {
      await expect(
        leveler.connect(userA).levelUp(userA.address, TOKEN_ID, 1)
      ).to.be.revertedWith("Not authorized to upgrade");
    });

    it("reverts if target user does not own the NFT", async function () {
      await expect(
        leveler.connect(authorized).levelUp(userA.address, OTHER_TOKEN_ID, 1)
      ).to.be.revertedWith("Target does not own that NFT");
    });

    it("reverts if user has not approved enough ERC-20 for fee", async function () {
      const HIGH_COST = parseUnits("1000.0", 18);
      const LevelerFactory = await ethers.getContractFactory(
        "AlturaNFTLevelerV2"
      );
      const lv2 = (await upgrades.deployProxy(
        LevelerFactory,
        [
          await nft.getAddress(),
          await token.getAddress(),
          HIGH_COST,
          await authorized.getAddress(),
        ],
        { initializer: "initialize" }
      )) as AlturaNFTLevelerV2;

      // userA approves less than HIGH_COST
      await token
        .connect(userA)
        .approve(await lv2.getAddress(), HIGH_COST - 1n);

      await expect(lv2.connect(authorized).levelUp(userA.address, TOKEN_ID, 1))
        .to.be.reverted;
    });

    it("allows authorized to levelUp, charges fee, and increments level", async function () {
      const balBefore = await token.balanceOf(userA.address);
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(0);

      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 1);

      const balAfter = await token.balanceOf(userA.address);
      expect(balAfter).to.equal(balBefore - INITIAL_COST);
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(1);

      // Level again → becomes 2
      await leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1);
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(2);
    });

    it("works with multiple token IDs independently", async function () {
      const balBBefore = await token.balanceOf(userB.address);
      expect(await leveler.getLevel(OTHER_TOKEN_ID)).to.equal(0);

      await expect(
        leveler.connect(authorized).levelUp(userB.address, OTHER_TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userB.address, OTHER_TOKEN_ID, 1);

      const balBAfter = await token.balanceOf(userB.address);
      expect(balBAfter).to.equal(balBBefore - INITIAL_COST);
      expect(await leveler.getLevel(OTHER_TOKEN_ID)).to.equal(1);

      // TOKEN_ID (userA’s NFT) remains at 0
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(0);
    });

    it("allows zero-fee leveling if upgradeCost is set to 0", async function () {
      await leveler.connect(owner).setUpgradeCost(0);
      expect(await leveler.getBaseCost()).to.equal(0);

      const balBefore = await token.balanceOf(userA.address);
      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 1);

      const balAfter = await token.balanceOf(userA.address);
      expect(balAfter).to.equal(balBefore);
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(1);
    });
  });

  describe("Changing authorized mid-stream", function () {
    beforeEach(async function () {
      // Approve enough for both level-ups (1×base + 2×base = 3×base)
      const total = INITIAL_COST * 3n;
      await token.connect(userA).approve(await leveler.getAddress(), total);
    });
    it("only owner can change authorized, and new authorized works", async function () {
      expect(await leveler.authorized()).to.equal(authorized.address);

      // Old authorized does first levelUp (cost = 1×base)
      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 1);

      // Owner rotates to anotherAddr
      await expect(leveler.connect(owner).setAuthorized(anotherAddr.address))
        .to.emit(leveler, "AuthorizedChanged")
        .withArgs(anotherAddr.address);

      // Old authorized now fails
      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      ).to.be.revertedWith("Not authorized to upgrade");

      // New authorized can do the second levelUp (cost = 2×base → level becomes 2)
      await expect(
        leveler.connect(anotherAddr).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 2);
    });
  });

  describe("Advanced scenarios", function () {
    beforeEach(async function () {
      // Approve enough for both level-ups in these tests
      const total = INITIAL_COST * 30n;
      await token.connect(userA).approve(await leveler.getAddress(), total);
    });
    it("levelUp fails if NFT is transferred away before leveling", async function () {
      await token
        .connect(userA)
        .approve(await leveler.getAddress(), INITIAL_COST);
      await nft
        .connect(userA)
        .safeTransferFrom(userA.address, userB.address, TOKEN_ID, 1, "0x");

      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      ).to.be.revertedWith("Target does not own that NFT");

      await token
        .connect(userB)
        .approve(await leveler.getAddress(), INITIAL_COST);
      await expect(
        leveler.connect(authorized).levelUp(userB.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userB.address, TOKEN_ID, 1);
    });

    it("levelUp fails if paymentToken is paused", async function () {
      await token.connect(owner).pause();
      await token
        .connect(userA)
        .approve(await leveler.getAddress(), INITIAL_COST);

      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      ).to.be.reverted; // Paused → transferFrom fails

      await token.connect(owner).unpause();
      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 1);
    });

    it("fees accumulate in contract after multiple levelUps", async function () {
      // levelUp #1 (cost = 1×base) and #2 (cost = 2×base)
      await leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1);
      await leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1);

      // total fees = 3×base
      const contractBal = await token.balanceOf(await leveler.getAddress());
      expect(contractBal).to.equal(INITIAL_COST * 3n);
    });

    it("changing upgradeCost mid-stream applies new fee", async function () {
      // First levelUp at old base (cost = 1×INITIAL_COST)
      await leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1);

      // Owner bumps baseCost
      const NEW_COST = parseUnits("20.0", 18);
      await leveler.connect(owner).setUpgradeCost(NEW_COST);
      expect(await leveler.getBaseCost()).to.equal(NEW_COST);

      // Approve for next level (cost = 2×NEW_COST)
      await token
        .connect(userA)
        .approve(await leveler.getAddress(), NEW_COST * 2n);

      // Second levelUp at new base (cost = 2×NEW_COST)
      await leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1);

      // Check final balance: 100 − INITIAL_COST − 2*NEW_COST
      const starting = parseUnits("100.0", 18);
      const balFinal = await token.balanceOf(userA.address);
      expect(balFinal).to.equal(starting - INITIAL_COST - NEW_COST * 2n);
    });

    it("constructor allows zero payment token (free leveling only)", async function () {
      const ZERO = ethers.ZeroAddress;
      const LevelerFactory = await ethers.getContractFactory(
        "AlturaNFTLevelerV2"
      );
      const freeLeveler = (await upgrades.deployProxy(
        LevelerFactory,
        [await nft.getAddress(), ZERO, 0n, await authorized.getAddress()],
        { initializer: "initialize" }
      )) as AlturaNFTLevelerV2;

      await expect(
        freeLeveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(freeLeveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 1);

      const contractBal = await token.balanceOf(await freeLeveler.getAddress());
      expect(contractBal).to.equal(0n);
    });

    it("multiple users leveling same tokenId bumps the same counter", async function () {
      // Mint a second copy of TOKEN_ID to userB
      await nft.connect(owner).mint(userB.address, TOKEN_ID, 1, "0x");

      // Approve enough for both users: each will do two levelUps -> total 3×base
      const total = INITIAL_COST * 3n;
      await token.connect(userA).approve(await leveler.getAddress(), total);
      await token.connect(userB).approve(await leveler.getAddress(), total);

      // userA does first levelUp (1→1)
      await expect(
        leveler.connect(authorized).levelUp(userA.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userA.address, TOKEN_ID, 1);

      // userB does second levelUp (1→2)
      await expect(
        leveler.connect(authorized).levelUp(userB.address, TOKEN_ID, 1)
      )
        .to.emit(leveler, "LeveledUp")
        .withArgs(userB.address, TOKEN_ID, 2);

      // Confirm on-chain level is 2
      expect(await leveler.getLevel(TOKEN_ID)).to.equal(2);
    });
  });
  describe("Token address getters", function () {
    it("should return the ERC-1155 address via altura()", async function () {
      expect(await leveler.altura()).to.equal(await nft.getAddress());
    });

    it("should return the ERC-20 address via paymentToken()", async function () {
      expect(await leveler.paymentToken()).to.equal(await token.getAddress());
    });
  });
  describe("AlturaNFTLeveler V3 – maxLevel enforcement", () => {
    let owner: SignerWithAddress;
    let authorized: SignerWithAddress;
    let userA: SignerWithAddress;
    let nft: MyToken;
    let token: TestToken;
    let v2: AlturaNFTLevelerV2;
    let v3: AlturaNFTLevelerV3;

    const TOKEN_ID = 1;
    const INITIAL_COST = ethers.parseUnits("10", 18);
    const MAX_LEVEL = 2; // for testing

    beforeEach(async () => {
      [owner, authorized, , userA] = await ethers.getSigners();

      // 1) Deploy and mint ERC-1155
      const MyToken = await ethers.getContractFactory("MyToken");
      nft = (await MyToken.deploy(await owner.getAddress())) as MyToken;
      await nft
        .connect(owner)
        .mint(await userA.getAddress(), TOKEN_ID, 1, "0x");

      // 2) Deploy and mint ERC-20
      const TestToken = await ethers.getContractFactory("TestToken");
      token = (await TestToken.deploy(await owner.getAddress())) as TestToken;
      await token
        .connect(owner)
        .mint(await userA.getAddress(), ethers.parseUnits("100", 18));

      // 3) Deploy V2 proxy
      const V2Factory = await ethers.getContractFactory("AlturaNFTLevelerV2");
      v2 = (await upgrades.deployProxy(
        V2Factory,
        [
          await nft.getAddress(),
          await token.getAddress(),
          INITIAL_COST,
          await authorized.getAddress(),
        ],
        { initializer: "initialize" }
      )) as AlturaNFTLevelerV2;

      // Approve fee
      await token
        .connect(userA)
        .approve(await v2.getAddress(), INITIAL_COST * 10n);

      // 4) Upgrade to V3
      const V3Factory = await ethers.getContractFactory("AlturaNFTLevelerV3");
      v3 = (await upgrades.upgradeProxy(
        await v2.getAddress(),
        V3Factory
      )) as AlturaNFTLevelerV3;
      // initialize maxLevel via reinitializer
      await v3.initializeV3(MAX_LEVEL);
    });
    it("altura() still returns the correct ERC-1155 address", async () => {
      expect(await v3.altura()).to.equal(await nft.getAddress());
    });

    it("paymentToken() still returns the correct ERC-20 address", async () => {
      expect(await v3.paymentToken()).to.equal(await token.getAddress());
    });

    it("should start with maxLevel set correctly", async () => {
      expect(await v3.maxLevel()).to.equal(MAX_LEVEL);
    });

    it("lets you levelUp until you hit the cap", async () => {
      // first level: OK
      await expect(
        v3.connect(authorized).levelUp(await userA.getAddress(), TOKEN_ID, 1)
      )
        .to.emit(v3, "LeveledUp")
        .withArgs(await userA.getAddress(), TOKEN_ID, 1);

      // second level: still OK (MAX_LEVEL=2)
      await expect(
        v3.connect(authorized).levelUp(await userA.getAddress(), TOKEN_ID, 1)
      )
        .to.emit(v3, "LeveledUp")
        .withArgs(await userA.getAddress(), TOKEN_ID, 2);

      // third level: should revert
      await expect(
        v3.connect(authorized).levelUp(await userA.getAddress(), TOKEN_ID, 1)
      ).to.be.revertedWith("Already at maximum level");
    });

    it("allows the owner to raise maxLevel and resumes leveling", async () => {
      // hit the cap…
      await v3
        .connect(authorized)
        .levelUp(await userA.getAddress(), TOKEN_ID, 1);
      await v3
        .connect(authorized)
        .levelUp(await userA.getAddress(), TOKEN_ID, 1);
      await expect(
        v3.connect(authorized).levelUp(await userA.getAddress(), TOKEN_ID, 1)
      ).to.be.revertedWith("Already at maximum level");

      // owner bumps the cap
      await expect(v3.connect(owner).setMaxLevel(5))
        .to.emit(v3, "MaxLevelChanged")
        .withArgs(5);
      expect(await v3.maxLevel()).to.equal(5);

      // now leveling up works again
      await expect(
        v3.connect(authorized).levelUp(await userA.getAddress(), TOKEN_ID, 1)
      )
        .to.emit(v3, "LeveledUp")
        .withArgs(await userA.getAddress(), TOKEN_ID, 3);
    });

    it("only owner can change maxLevel", async () => {
      await expect(v3.connect(userA).setMaxLevel(10))
        .to.be.revertedWithCustomError(v3, "OwnableUnauthorizedAccount")
        .withArgs(userA.address);
    });
  });
  describe("Rarity × Level combinations", function () {
    const MAX_TEST_LEVEL = 3;
    const rarities = [1, 2, 3];

    rarities.forEach((rarity) => {
      describe(`rarity=${rarity}`, function () {
        for (
          let targetLevel = 1;
          targetLevel <= MAX_TEST_LEVEL;
          targetLevel++
        ) {
          it(`levels up to ${targetLevel} and charges correct fee`, async function () {
            // Deploy a fresh Leveler proxy
            const LevelerFactory = await ethers.getContractFactory(
              "AlturaNFTLevelerV2"
            );
            const isolated = (await upgrades.deployProxy(
              LevelerFactory,
              [
                await nft.getAddress(),
                await token.getAddress(),
                INITIAL_COST,
                await authorized.getAddress(),
              ],
              { initializer: "initialize" }
            )) as AlturaNFTLevelerV2;

            // Top up userA and approve
            await token
              .connect(owner)
              .mint(userA.address, parseUnits("1000.0", 18));
            await token
              .connect(userA)
              .approve(await isolated.getAddress(), parseUnits("1000.0", 18));

            // Record the actual starting balance
            const startingBal = await token.balanceOf(userA.address);

            let cumulativePaid = 0n;
            // Level up from 1 → targetLevel
            for (let lvl = 1; lvl <= targetLevel; lvl++) {
              const expectedCost = INITIAL_COST * BigInt(lvl) * BigInt(rarity);
              cumulativePaid += expectedCost;

              await expect(
                isolated
                  .connect(authorized)
                  .levelUp(userA.address, TOKEN_ID, rarity)
              )
                .to.emit(isolated, "LeveledUp")
                .withArgs(userA.address, TOKEN_ID, lvl);

              expect(await isolated.getLevel(TOKEN_ID)).to.equal(lvl);
            }

            // Check total ERC-20 taken matches the sum of all fees
            const finalBal = await token.balanceOf(userA.address);
            expect(finalBal).to.equal(startingBal - cumulativePaid);
          });
        }
      });
    });
  });
});
