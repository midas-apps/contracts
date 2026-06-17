# Midas Protocol - EVM Smart Contracts

This repository contains EVM smart contracts for the Midas protocol.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Structure](#repository-structure)
- [Building and Testing](#building-and-testing)
- [Architecture Overview](#architecture-overview)
- [Contracts Overview](#contracts-overview)
  - [Access Control Contracts](#access-control-contracts)
  - [mTokens](#mtokens)
  - [Data Feeds and Aggregators](#data-feeds-and-aggregators)
  - [Vaults](#vaults)
  - [Miscellaneous Contracts](#miscellaneous-contracts)
- [Deployment](#deployment)
- [Upgradeability](#upgradability)
- [Documentation](#documentation)
- [Development](#development)
- [Deployed Contract Addresses](#deployed-contract-addresses)

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
│   ├── access/         # Access control, timelock and pause contracts
│   ├── feeds/          # Price feed and aggregator contracts
│   ├── interfaces/     # Contract interfaces
│   ├── libraries/      # Contract libraries
│   ├── misc/           # Miscellaneous contracts (LayerZero, Axelar, data feed adapters)
│   ├── testers/        # Non-production contracts that are used in tests
│   ├── mocks/          # Mocked contracts used in tests and some testnet deployments
│   ├── *.sol           # Core smart contracts (mTokens and vaults)
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

The protocol is built around a few simple ideas:

- **mTokens** are the ERC20 tokens issued by the protocol (e.g. mTBILL, mBASIS, mBTC).
- **Vaults** are the entry points for users. They handle minting (deposits) and redemption (burns), calculate fees and exchange rates, and move funds.
- **Data Feeds and Aggregators** provide the prices that vaults use to compute exchange rates.
- **Access control contracts** sit underneath everything and control who is allowed to do what: roles, function-level permissions, timelock and pause management.
- **Miscellaneous contracts** connect the protocol to external systems: cross-chain bridges and third-party price feed adapters.

### Core Components

1. **mTokens**: ERC20 tokens (e.g., mTBILL, mBASIS, mBTC)
2. **Vaults**: Smart contracts managing minting (deposits) and redemption processes
3. **Access Control**: Role-based permission system for managing protocol operations
4. **Timelock and Pause**: Delayed execution of admin actions and a global pause mechanism
5. **Price Feeds**: Oracle integrations for conversion rates
6. **Cross-Chain**: LayerZero and Axelar integrations for multi-chain operations

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

## Contracts Overview

### Access Control Contracts

These contracts form the base layer of the protocol. They do not move user funds themselves, but they decide who is allowed to call protected functions, add a delay to sensitive admin actions, and allow the protocol to be paused.

#### **MidasAccessControl** ([`contracts/access/MidasAccessControl.sol`](contracts/access/MidasAccessControl.sol))

Centralized access control contract managing all roles across the protocol

**Key Features:**

- Role-based access control
- Function-level access control - on top of plain roles, access can be scoped to a specific function on a specific target contract. A function permission is identified by `(masterRole, targetContract, functionSelector)`, and only the accounts enabled for that permission can call the function. Grant operators manage who is enabled for each permission.
- Per-role timelock delays - each role (and each function permission) can have its own timelock delay, so changes to it only take effect after a configured period
- Greenlist/blacklist management

**Key Functions:**

- `grantRole()` - grants role to a specific address. Can be invoked only by role admin
- `revokeRole()` - revokes role from a specific address. Can be invoked only by role admin
- `setPermissionRoleMult()` - enables or disables accounts for a specific function-level permission `(masterRole, targetContract, functionSelector)`
- `setGrantOperatorRoleMult()` - sets the operators that are allowed to manage a given function permission
- `setRoleDelayMult()` / `setDefaultDelay()` - configure the timelock delay for individual roles or the default delay

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

#### **MidasTimelockManager** ([`contracts/access/MidasTimelockManager.sol`](contracts/access/MidasTimelockManager.sol))

Manages timelock scheduling, security council votes and operation details. Sensitive admin actions (for example access control changes and upgrades) are not executed directly. Instead they are scheduled here, optionally reviewed by a security council, and only executed after a delay.

**Key Features:**

- Scheduling of timelock operations, single and in bulk
- Security council with versioning, used to vote for or veto operations
- Expiration and dispute periods for pending operations
- A hard cap on the number of pending operations per proposer

**Key Functions:**

- `scheduleTimelockOperation()` - schedules a single operation to be executed after the delay
- `bulkScheduleTimelockOperation()` - schedules multiple operations at once
- `executeTimelockOperation()` - executes a scheduled operation once it is ready
- `voteForExecution()` / `voteForVeto()` - security council voting to approve or block an operation
- `setSecurityCouncil()` - updates the security council members

#### **Timelock Controllers**

The actual delayed execution is performed by OpenZeppelin based timelock controllers:

- **MidasTimelockController** ([`contracts/access/MidasTimelockController.sol`](contracts/access/MidasTimelockController.sol)) - A standard OpenZeppelin `TimelockController` extended with getters for proposers and executors.
- **MidasAccessControlTimelockController** ([`contracts/access/MidasAccessControlTimelockController.sol`](contracts/access/MidasAccessControlTimelockController.sol)) - A `TimelockController` that is driven by `MidasTimelockManager`. It is used to apply access control changes through the timelock flow.

#### **MidasPauseManager** ([`contracts/access/MidasPauseManager.sol`](contracts/access/MidasPauseManager.sol))

Global manager for pausing and unpausing protocol functions. Pausing can be applied globally, per contract, or per individual function, which gives fine-grained control during incidents.

**Key Features:**

- Global pause, per-contract pause and per-function pause
- Separate roles for pausing and unpausing
- Configurable delays for pause and unpause

**Key Functions:**

- `pause()` / `unpause()` - change the pause status for a contract or function
- Per-function granularity, so only the affected operations can be stopped

### mTokens

#### **mToken** ([`contracts/mToken.sol`](contracts/mToken.sol))

Base contract for all mToken implementations

**Key Features:**

- Minting and burning functionality (role-protected)
- Pausable transfers (inherited from `ERC20PausableUpgradeable`)
- Blacklist functionality - blacklisted users cannot send or receive any tokens

**Key Functions:**

- `mint(address to, uint256 amount)` - Mint tokens to any address (requires minter role)
- `burn(address from, uint256 amount)` - Burn tokens from any address (requires burner role)
- `pause()` / `unpause()` - Pause/unpause transfers (requires pauser role)

**mToken Variations:**

- **mTokenPermissioned** ([`contracts/mTokenPermissioned.sol`](contracts/mTokenPermissioned.sol)) - An mToken with fully permissioned transfers, where transfers are only allowed between approved addresses.

### Data Feeds and Aggregators

Vaults need prices to compute exchange rates. The protocol separates this into two layers: **aggregators** that publish or expose a price using the Chainlink `AggregatorV3` interface, and **data feeds** that wrap an aggregator, validate the price and convert it to a common 18 decimals format.

#### **DataFeed** ([`contracts/feeds/DataFeed.sol`](contracts/feeds/DataFeed.sol))

Wraps a Chainlink `AggregatorV3` price feed, validates the price (max/min/staleness) and converts answers to 18 decimals format

**Key Functions:**

- `getDataInBase18()` - View function, returns the validated and converted price with 18 decimals. Checks price for min/max allowed values, checks that it is not stale

**DataFeed Variations:**

- **CompositeDataFeed** ([`contracts/feeds/CompositeDataFeed.sol`](contracts/feeds/CompositeDataFeed.sol)) - Computes the ratio of two underlying data feeds (numerator ÷ denominator).
- **CompositeDataFeedMultiply** ([`contracts/feeds/CompositeDataFeedMultiply.sol`](contracts/feeds/CompositeDataFeedMultiply.sol)) - Computes the product of two underlying data feeds (numerator × denominator).

#### **CustomAggregatorV3CompatibleFeed** ([`contracts/feeds/CustomAggregatorV3CompatibleFeed.sol`](contracts/feeds/CustomAggregatorV3CompatibleFeed.sol))

Custom price aggregator compatible with Chainlink's `AggregatorV3` interface. Used to publish mToken prices on-chain

**Key Functions:**

- `setRoundData()` - function to push the price on-chain
- `setRoundDataSafe()` - same as `setRoundData()` but also performs a deviation check by comparing current and new prices
- `latestRoundData()` - View function, returns latest submitted price with submission details (check [AggregatorV3Interface.sol](@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol))

**CustomAggregatorV3CompatibleFeed Variations:**

- **CustomAggregatorV3CompatibleFeedGrowth** ([`contracts/feeds/CustomAggregatorV3CompatibleFeedGrowth.sol`](contracts/feeds/CustomAggregatorV3CompatibleFeedGrowth.sol)) - Includes a growth parameter that automatically increases the feed price over time.
- **CustomAggregatorV3CompatibleFeedAdjusted** ([`contracts/feeds/CustomAggregatorV3CompatibleFeedAdjusted.sol`](contracts/feeds/CustomAggregatorV3CompatibleFeedAdjusted.sol)) - A proxy feed that adjusts the price of an underlying Chainlink compatible feed by a signed percentage. A positive percentage raises the reported price, a negative percentage lowers it.

### Vaults

There are 2 types of vaults - Deposit vaults and Redemption vaults. Also each type of vault have different variations (like USTB, Swapper etc.)

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

#### **DepositVault** ([`contracts/DepositVault.sol`](contracts/DepositVault.sol))

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

- **USTB** ([`contracts/DepositVaultWithUSTB.sol`](contracts/DepositVaultWithUSTB.sol)) - Automatically invests USDC into USTB tokens before transferring proceeds to the recipient.
- **Aave** ([`contracts/DepositVaultWithAave.sol`](contracts/DepositVaultWithAave.sol)) - Invests deposited proceeds into an Aave V3 Pool.
- **Morpho** ([`contracts/DepositVaultWithMorpho.sol`](contracts/DepositVaultWithMorpho.sol)) - Invests deposited proceeds into a Morpho Vault.
- **mToken** ([`contracts/DepositVaultWithMToken.sol`](contracts/DepositVaultWithMToken.sol)) - Invests deposited proceeds into another mToken.

#### **RedemptionVault** ([`contracts/RedemptionVault.sol`](contracts/RedemptionVault.sol))

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

- **USTB** ([`contracts/RedemptionVaultWithUSTB.sol`](contracts/RedemptionVaultWithUSTB.sol)) - Stores pending liquidity as USTB tokens. When the vault has insufficient USDC liquidity to fulfill an instant redemption, USTB tokens are redeemed for USDC and used to complete the redemption.
- **Aave** ([`contracts/RedemptionVaultWithAave.sol`](contracts/RedemptionVaultWithAave.sol)) - Sources liquidity by withdrawing from an Aave V3 Pool.
- **Morpho** ([`contracts/RedemptionVaultWithMorpho.sol`](contracts/RedemptionVaultWithMorpho.sol)) - Sources liquidity by withdrawing from a Morpho Vault.
- **mToken** ([`contracts/RedemptionVaultWithMToken.sol`](contracts/RedemptionVaultWithMToken.sol)) - Uses an external liquidity source to exchange one mToken for another and redeems the obtained mTokens through a different Midas redemption vault. This flow is activated only when there is insufficient liquidity in the current Redemption Vault. (This contract replaces the former `RedemptionVaultWithSwapper`; its storage layout is preserved for safe upgrades.)

### Miscellaneous Contracts

These contracts are supporting pieces. Most of them do not hold protocol state or user funds. They connect Midas to external price oracles and to other chains.

#### Data Feed Adapters (`contracts/misc/adapters/`)

Adapters expose third-party price sources through the Chainlink `AggregatorV3` interface, so they can be consumed by the protocol `DataFeed` contracts in a uniform way. They share a common base ([`ChainlinkAdapterBase.sol`](contracts/misc/adapters/ChainlinkAdapterBase.sol)). Available adapters include:

- Generic protocol ports: `PythChainlinkAdapter`, `StorkChainlinkAdapter`, `BandStdChailinkAdapter`
- ERC4626 vaults: `ERC4626ChainlinkAdapter`
- Liquid staking and specific assets: `WstEthChainlinkAdapter`, `WrappedEEthChainlinkAdapter`, `RsEthChainlinkAdapter`, `BeHypeChainlinkAdapter`, `MantleLspStakingChainlinkAdapter`, `SyrupChainlinkAdapter`, `YInjChainlinkAdapter`
- Cross-format bridges: `DataFeedToBandStdAdapter`, `CompositeDataFeedToBandStdAdapter`

#### Acre Adapter ([`contracts/misc/acre/AcreAdapter.sol`](contracts/misc/acre/AcreAdapter.sol))

Wrapper around Midas vaults so they can be used by the Acre protocol.

#### Cross-Chain Contracts (Axelar, LayerZero)

**LayerZero Integration** (`contracts/misc/layerzero/`)

Contracts for LayerZero cross-chain messaging:

- `MidasLzMintBurnOFTAdapter.sol` - OFT adapter that uses native mint/burn on mTokens
- `MidasLzVaultComposerSync.sol` - Vault composer for instant-only operations

**Axelar Integration** (`contracts/misc/axelar/`)

Contracts for Axelar cross-chain functionality:

- `MidasAxelarVaultExecutable.sol` - Executable contract for cross-chain operations

## Deployment

Please refer to [this deployment README](./scripts/deploy/README.md)

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
