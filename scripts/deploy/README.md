# Midas protocol contracts deployment guide

## Prerequisites

Check the repository [prerequisites](../../README.md#prerequisites)

### New network (only if needed)

If deploying to a brand new network, make sure the network is added to the repo network configuration and explorer verification configuration. Files:

- [`hardhat.config.ts`](../../hardhat.config.ts)
- [`config/networks/index.ts`](../../config/networks/index.ts)

---

## Deployment overview

The flow is:

1. Prepare configs.
2. Generate contracts (only for a brand-new product).
3. Generate per-network deployment config.
4. Compile + test.
5. Run deployment scripts in order.
6. Run post-deployment scripts.

## Deployment notes

- After runing the deployment command, add the deployed proxy address to the addresses file ([`config/constants/addresses.ts`](../../config/constants/addresses.ts))
- Always check if contract was properly verified, if not - verify it in a separate command (check [Troubleshooting](#troubleshooting))

## Configuring the repository

### Step 1 — Add a new product (skip if existing product)

Run:

```bash
yarn deploy:generate:contracts
```

Follow the interactive prompts (token name, symbol, contract prefix, roles prefix, etc.).

After generation:

- Review the git diff and ensure the generated contracts/config look correct.

### Step 2 — Prepare deployment config

#### Payment token config (only if adding a new payment token)

If a new payment token is introduced, add:

- Token enum entry
- Deployment config for the payment token
- Token address data

#### Generate product deployment config

Run (case sensitive):

```bash
yarn deploy:generate:config --network <network_name> --mtoken <mToken_name>
```

Notes:

- Provide values from the deployment ticket.
- If the command does not ask for a value you need, edit the generated config manually.
- If the product already exists, this will update/extend the existing config for the new network.

### Step 3 — Compile and test

```
yarn compile
yarn test
```

Also confirm verification settings in `.env` are correct if you expect automatic verification to run.

---

## 3 Deployment (CLI)

### Common CLI parameters

- `--network <network_name>`: required for all scripts
- `--mtoken <mToken_name>`: required for product deployment scripts
- `--ptoken <pToken_name>`: required for payment-token specific scripts

### Important: persist deployed addresses

After each step, the script prints proxy and implementation addresses.

Add new addresses to the repo configuration before proceeding to the next step. Skipping this typically causes later validation to fail.

### Deployment order

#### A If deploying to a brand new network

Deploy access control:

```bash
yarn deploy:ac --network <network>
```

Post steps:

```bash
yarn deploy:post:grant:admin --network <network>
yarn deploy:post:revoke:roles --network <network>
```

#### If deploying to an existing network

For each command below, include `--network` and `--mtoken`:

```bash
yarn deploy:token

yarn deploy:aggregator

yarn deploy:feed

# Deposit vault (pick the one that matches your vault type)
yarn deploy:dv
# or
yarn deploy:dv:ustb

# Redemption vault (pick the one that matches your vault type)
yarn deploy:rv
# or
yarn deploy:rv:swapper
```

#### If new payment token is introduced

If introducing a new payment token, deploy its feed components:

```bash
yarn deploy:aggregator:ptoken --network <network> --ptoken <ptoken>
yarn deploy:feed:ptoken --network <network> --ptoken <ptoken>
```

---

## 4 Post-deployment

### Standard commands for new mProducts

```bash
yarn deploy:post:grant:roles --network <network_name> --mtoken <mToken>
yarn deploy:post:set:price --network <network_name> --mtoken <mToken>
yarn deploy:post:add:ptokens --network <network_name> --mtoken <mToken>
```

### Optional post-deployment (only if explicitly required)

- Waive vault fee for an address
- Pause selected functions on vaults

## Troubleshooting

- If contract verification failed, you can retry it using `verify` command. Example:

```bash
yarn hardhat verify 0xfc8ac00c85cced29304c37727f525860039b852c --network monad <here you can incert constructor parameters if needed>
```
