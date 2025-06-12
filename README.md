# AlturaNFTLeveler

**Upgradeable smart contracts** for leveling ERC‑1155 NFTs with ERC‑20 fees, built with Hardhat and OpenZeppelin Upgradeable.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Usage](#usage)

   * [Deploying V2](#deploying-v2)
   * [Upgrading to V3](#upgrading-to-v3)
   * [Interacting with the Contract](#interacting-with-the-contract)
8. [Testing](#testing)
9. [Security Considerations](#security-considerations)
10. [License](#license)

---

## Overview

`AlturaNFTLeveler` is a pair of upgradeable contracts (`V2` and `V3`) that enable an authorized wallet to charge an ERC‑20 fee and increment on‑chain "levels" for ERC‑1155 token IDs, provided the target user owns the NFT. The contracts use OpenZeppelin's Upgradeable pattern (Transparent or UUPS) and are managed via Hardhat.

## Features

* **Upgradeable** via OpenZeppelin Upgrades plugin
* **ERC‑20 fees** based on token level and rarity
* **Ownership check** against an ERC‑1155 (AlturaNFTV3)
* **Global cap** on levels (added in V3)
* **Only authorized** address can invoke level‑up
* **Events** for on‑chain transparency

## Architecture

* `AlturaNFTLevelerV2`

  * Tracks `levelOf[tokenId]`
  * `levelUp` mechanic with dynamic cost: `baseCost × (currentLevel + 1) × rarity`
  * Uses `Initializable` and `OwnableUpgradeable`

* `AlturaNFTLevelerV3` (extends V2)

  * Adds `maxLevel` cap with initializer `initializeV3`
  * Overrides `levelUp` to enforce `maxLevel`

---

## Prerequisites

* [Node.js](https://nodejs.org/) v16+
* [Yarn](https://yarnpkg.com/) or npm
* [Hardhat](https://hardhat.org/)
* [Git](https://git-scm.com/)

## Installation

1. Clone this repo:

   ```bash
   git clone <REPO_URL>
   cd AlturaNFTLeveler
   ```

2. Install dependencies:

   ```bash
   yarn install
   # or
   npm install
   ```

3. Create a `.env` file:

   ```bash
   cp .env.example .env
   ```

---

## Configuration

Your `.env` should include:

```ini
# RPC provider URL (e.g. Infura, Alchemy)
RPC_URL=https://...

# Deployer private key
PRIVATE_KEY=0x...

# Addresses
ALTURA_NFT_ADDRESS=0x...   # AlturaNFTV3 contract
PAYMENT_TOKEN_ADDRESS=0x... # ERC-20 for fees
AUTHORIZER_ADDRESS=0x...    # Address allowed to call levelUp

# Network (e.g. rinkeby, mainnet)
NETWORK=rinkeby
```

---

## Usage

### Deploying V2

1. Compile and deploy V2:

   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy-v2.js --network $NETWORK
   ```

2. Save the deployed proxy address for later interactions.

### Upgrading to V3

1. Prepare an upgrade script (`scripts/upgrade-v3.js`).
2. Run:

   ```bash
   npx hardhat run scripts/upgrade-v3.js --network $NETWORK
   ```
3. Initialize V3 cap:

   ```js
   const leveler = await ethers.getContractAt(
     "AlturaNFTLevelerV3",
     proxyAddress
   );
   await leveler.initializeV3(maxLevel, { gasLimit: 500_000 });
   ```

### Interacting with the Contract

* **Level up**:

  ```js
  await leveler.connect(authSigner).levelUp(
    userAddress,
    tokenId,
    rarity
  );
  ```

* **View level**:

  ```js
  const lvl = await leveler.getLevel(tokenId);
  ```

* **Cost queries**:

  ```js
  const base = await leveler.getBaseCost();
  const nextCost = await leveler.getUpgradeCost(tokenId);
  ```

* **Admin functions** (owner only):

  * `setAuthorized(newAuth)`
  * `setUpgradeCost(newBaseCost)`
  * `setMaxLevel(newMax)` (V3)

---

## Testing

Run Hardhat tests:

```bash
npx hardhat test
```

Ensure you set up a local network in your Hardhat config.

---

## Security Considerations

* Ensure `authorized` address is secure; it controls `levelUp`.
* Keep private keys out of source control.
* Audit upgrade scripts and initializers.
* Monitor contract balances (ERC‑20 fees accumulate on the contract).

---

## License

MIT © \[Your Name or Organization]
