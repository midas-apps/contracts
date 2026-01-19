# Midas Protocol - EVM Smart Contracts

This repository contains EVM smart contracts for the Midas protocol.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Structure](#repository-structure)
- [Building and Testing](#building-and-testing)
- [Architecture Overview](#architecture-overview)
- [Core Contracts](#core-contracts)
- [Crosschain Contracts](#crosschain-contracts-axelar-layerzero)
- [Deployed Contract Addresses](#deployed-contract-addresses)
- [Deployment](#deployment)
- [Upgradeability](#upgradability)
- [Documentation](#documentation)
- [Development](#development)

## Prerequisites

### Required Software

- **Node.js**: >=22
- **Yarn**: Berry (check the [installation guide](https://yarnpkg.com/getting-started/install))

### Installation

```bash
# Install dependencies
yarn install
```

### Environment Setup

In the root of the repo, create a `.env` file from [.env.example](./.env.example)

## Repository Structure

```
midas-contracts/
├── contracts/          # Smart contract source code
│   ├── abstract/       # Abstract base contracts
│   ├── access/         # Access control contracts
│   ├── feeds/          # Price feed contracts
│   ├── interfaces/     # Contract interfaces
│   ├── libraries/      # Contract libraries
│   ├── misc/           # Miscellaneous contracts (LayerZero, Axelar, Custom price feed adapters)
│   ├── products/       # Individual mToken implementations
│   ├── testers/        # Non-production contracts that are used in tests
│   ├── mocks/          # Mocked contracts used in tests and some testnet deployments
│   ├── *.sol           # Core smart contracts
│   └── ...
├── config/             # Configuration files
│   ├── constants/      # Addresses and constants
│   ├── networks/       # Network configurations
│   └── types/          # TypeScript type definitions
├── scripts/            # Deployment and upgrade scripts
│   ├── deploy/         # Deployment scripts
│   └── upgrades/       # Upgrade scripts
├── test/               # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── helpers/            # Helper utilities
├── tasks/              # Hardhat tasks
└── docgen/             # Auto-generated documentation
```

## Building and Testing

### Build Contracts

```bash
# Clean and compile contracts
yarn build
```

### Run Tests

```bash
# Run all tests (unit + integration)
yarn test

# Run only unit tests
yarn test:unit

# Run only integration tests
yarn test:integration
```

### Code Coverage

```bash
# Generate coverage report
yarn coverage
```

Coverage reports are generated in the `coverage/` directory.

### Security Analysis

```bash
# Run Slither static analysis
yarn slither

# Get summary report
yarn slither:summary
```

**Note**: Install Slither separately. See [Slither installation guide](https://github.com/crytic/slither).

## Architecture Overview

### Core Components

1. **mTokens**: ERC20 tokens (e.g., mTBILL, mBASIS, mBTC)
2. **Vaults**: Smart contracts managing minting (deposits) and redemption processes
3. **Access Control**: Role-based permission system for managing protocol operations
4. **Price Feeds**: Oracle integrations for conversion rates
5. **Cross-Chain**: LayerZero and Axelar integrations for multi-chain operations

### System Flow

#### Deposit Flow (Minting)

1. User initiates the deposit
2. Vault calculates exchange rate and fees. For exchange rates vault calls data feeds for both payment token and mToken
3. Vault transfers payment tokens from user and redirect those funds to fees/proceeds wallets
4. For instant deposits (sync): mTokens are minted in the same transaction
5. For request deposits (async): Admin approves/rejects the request after off-chain processing

#### Redemption Flow (Burning)

1. User initiates the redemption
2. Vault calculates exchange rate and fees. For exchange rates vault calls data feeds for both payment token and mToken
3. Vault transfers fees from user to the fee recipient and burns the remaining of mTokens
4. For instant redemptions (sync): Payment tokens are transferred to user immediately
5. For request redemptions (async): Admin fulfills the request after off-chain processing

## Core Contracts

### **MidasAccessControl** ([`contracts/access/MidasAccessControl.sol`](contracts/access/MidasAccessControl.sol))

Centralized access control contract managing all roles across the protocol

**Key Features:**

- Role-based access control
- Greenlist/blacklist management

**Key Functions:**

- `grantRole()` - grants role to a specific address. Can be invoked only by role admin
- `revokeRole()` - revokes role from a specific address. Can be invoked only by role admin

The default role admin for all roles is `defaultAdmin`. Only exceptions are:

- `greenlisted` - role admin is `greenlistedOperator`
- `blacklisted` - role admin is `blacklistedOperator`

All roles in the system are documented in [`ROLES.md`](./ROLES.md). This file is auto-generated and contains:

- **Common Roles**: Roles shared across all contracts:
  - `defaultAdmin`: `0x0000000000000000000000000000000000000000000000000000000000000000`
  - `greenlisted`: Allows access to vault operations (if greenlist is enforced)
  - `blacklisted`: Prevents token transfers and vaults access

- **Token-Specific Roles**: Roles for each mToken including:
  - `minter` - Can mint tokens
  - `burner` - Can burn tokens
  - `pauser` - Can pause/unpause token transfers
  - `customFeedAdmin` - Can manage custom price feeds and data feeds
  - `depositVaultAdmin` - Can manage deposit vault operations
  - `redemptionVaultAdmin` - Can manage redemption vault operations

### **mToken** ([`contracts/mToken.sol`](contracts/mToken.sol))

Abstract base contract for all mToken implementations

**Key Features:**

- Minting and burning functionality (role-protected)
- Pausable transfers (inherited from `ERC20PausableUpgradeable`)
- Blacklist functionality - blacklisted users cannot send or receive any tokens

**Key Functions:**

- `mint(address to, uint256 amount)` - Mint tokens to any address (requires minter role)
- `burn(address from, uint256 amount)` - Burn tokens from any address (requires burner role)
- `pause()` / `unpause()` - Pause/unpause transfers (requires pauser role)

### **Vaults**

There are 2 types of vaults - Deposit vaults and Redemption vaults. Also each type of vault have different variations (like USTB, Swapper, BUIDL etc.)

**Common Key Features:**

- Fee calculation and collection
- Multiple payment tokens support
- Greenlist/Blacklist
- Chainalysis sanction list integration
- Minimal mToken amount for instant/request operations
- Daily limits for instant operations
- Vault Allowance - limits the total amount of mTokens that a vault can mint or redeem. It is a risk-control mechanism managed by the vault admin and is independent from token supply caps.

#### Instant vs Request-Based Operations

Both vaults support two execution modes:

**Instant (Synchronous):**

- Fully on-chain
- Atomic mint/burn + transfer
- Subject to daily limits, liquidity, and minimum amounts

**Request-Based (Asynchronous):**

- Two-step process
- User submits request on-chain
- Admin approves or rejects after off-chain processing
- Used when instant liquidity is insufficient or instant operations are disabled. Also for fiat operations

### **DepositVault** ([`contracts/DepositVault.sol`](contracts/DepositVault.sol))

Manages the minting process for mTokens. Users deposit payment tokens to receive mTokens.

**Key Features:**

- Instant deposits - minting happens atomically
- Request-based deposits - user pays in one transaction and tokens are minted in a second tx initiated by vault admin
- Supply cap management
- Minimal mTokens amount for first mint transaction

**Key Functions:**

- `depositInstant()` - Instant deposit with atomic minting
- `depositRequest()` - Create deposit request for admin approval
- `approveRequest()` - Admin approves deposit request
- `rejectRequest()` - Admin rejects deposit request

**Vault Variations:**

- USTB ([`contracts/DepositVaultWithUSTB.sol`](contracts/DepositVaultWithUSTB.sol)) - Automatically invests USDC into USTB tokens before transferring proceeds to the recipient.

### **RedemptionVault** ([`contracts/RedemptionVault.sol`](contracts/RedemptionVault.sol))

Manages the redemption process for mTokens. Burns mTokens from a user and transfers payment tokens in exchange

**Key Features:**

- Instant redemptions - user receive payment tokens atomically
- Request-based redemptions - tokens are burned from user in one transaction and payment tokens are transferred in a second tx initiated by vault admin
- Fiat redemption support
- Separate liquidity source for request-based operations

**Key Functions:**

- `redeemInstant()` - Instant redemption with immediate token transfer
- `redeemRequest()` - Create redemption request
- `redeemFiatRequest()` - Create fiat redemption request
- `approveRequest()` - Admin fulfills redemption request
- `rejectRequest()` - Admin rejects redemption request

**Vault Variations:**

- Swapper ([`contracts/RedemptionVaultWithSwapper.sol`](contracts/RedemptionVaultWithSwapper.sol)) - Uses an external liquidity source to exchange one mToken for another and redeems the obtained mTokens through a different Midas redemption vault. This flow is activated only when there is insufficient liquidity in the current Redemption Vault.
- BUIDL ([`contracts/RedemptionVaultWithBUIDL.sol`](contracts/RedemptionVaultWithBUIDL.sol)) (*deprecated*) - Stores pending liquidity as BUIDL tokens. When the vault has insufficient USDC liquidity to fulfill an instant redemption, BUIDL tokens are redeemed for USDC and used to complete the redemption.
- USTB ([`contracts/RedemptionVaultWithUSTB.sol`](contracts/RedemptionVaultWithUSTB.sol)) - Stores pending liquidity as USTB tokens. When the vault has insufficient USDC liquidity to fulfill an instant redemption, USTB tokens are redeemed for USDC and used to complete the redemption.

### **DataFeed** ([`contracts/feeds/DataFeed.sol`](contracts/feeds/DataFeed.sol))

Wraps Chainlink AggregatorV3 price feeds, validates the price (max/min/staleness) and converts answers to 18 decimals format

**Key Functions:**

- `getDataInBase18()`- View function, returns the validated and converted price with 18 decimals. Checks price for min/max allowed values, checks that its not stale

**DataFeed Variations:**

- CompositeDataFeed ([`contracts/feeds/CompositeDataFeed.sol`](contracts/feeds/CompositeDataFeed.sol)) -  computing the ratio of two underlying data feeds (numerator ÷ denominator)

### **CustomAggregatorV3CompatibleFeed** ([`contracts/feeds/CustomAggregatorV3CompatibleFeed.sol`](contracts/feeds/CustomAggregatorV3CompatibleFeed.sol))

Custom price aggregator compatible with Chainlink's AggregatorV3 interface. Used to publish mToken prices on-chain

**Key Functions:**

- `setRoundData()`- function to push the price on-chain
- `setRoundDataSafe()`- same as `setRoundData()` but also performs a deviation check by comparing current and new prices
- `latestRoundData()` - View function, returns latest submitted price with submission details (check [AggregatorV3Interface.sol](@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol))

**CustomAggregatorV3CompatibleFeed Variations:**

- CustomAggregatorV3CompatibleFeedGrowth ([`contracts/feeds/CustomAggregatorV3CompatibleFeedGrowth.sol`](contracts/feeds/CustomAggregatorV3CompatibleFeedGrowth.sol)) - includes a growth parameter that automatically increases the feed price over time

## Crosschain Contracts (Axelar, LayerZero)

### **LayerZero Integration** (`contracts/misc/layerzero/`)

Contracts for LayerZero cross-chain messaging:

- `MidasLzMintBurnOFTAdapter.sol` - OFT adapter that uses native mint/burn on mTokens
- `MidasLzVaultComposerSync.sol` - Vault composer for instant-only operations

### **Axelar Integration** (`contracts/misc/axelar/`)

Contracts for Axelar cross-chain functionality:

- `MidasAxelarVaultExecutable.sol` - Executable contract for cross-chain operations

## Deployed Contract Addresses

All deployed contract addresses are stored in [`config/constants/addresses.ts`](./config/constants/addresses.ts).

The addresses are organized by network and token. For example:

```typescript
main: {
  accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
  timelock: '0xE3EEe3e0D2398799C884a47FC40C029C8e241852',
  mTBILL: {
    token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
    depositVault: '0x99361435420711723aF805F08187c9E6bF796683',
    redemptionVault: '0xF6e51d24F4793Ac5e71e0502213a9BBE3A6d4517',
    // ...
  },
  // ...
}
```

## Deployment

Please read [this deployment README](./scripts/deploy/README.md)

## Upgradability

Most contracts in this repository are designed to be upgradeable. We are using OpenZeppelin's `TransparentUpgradeableProxy` for proxy deployments

**Safety measures:**

- We use `@openzeppelin/hardhat-upgrades` package which automatically checks for storage layout compatibility
- Upgrades are typically executed through a timelock to allow for review before execution

**Non-upgradeable contracts:**

Some miscellaneous contracts (like adapters and test contracts) are not upgradeable as they don't hold state or manage user funds.

## Documentation

All contracts are documented using NatSpec format. Generated documentation is available in [`docgen/index.md`](./docgen/index.md).

To regenerate documentation:

```bash
yarn docgen
```

## Development

### Code Style

```bash
# Check code style
yarn codestyle

# Fix code style issues
yarn codestyle:fix
```

### Linting

```bash
# Lint TypeScript files
yarn lint:ts

# Lint Solidity files
yarn lint:sol

# Fix linting issues
yarn lint:ts:fix
yarn lint:sol:fix
```

### Formatting

```bash
# Check formatting
yarn format:ts
yarn format:sol

# Fix formatting
yarn format:ts:fix
yarn format:sol:fix
```
