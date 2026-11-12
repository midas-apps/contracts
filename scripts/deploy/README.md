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
yarn deploy:generate:mproduct
```

Follow the interactive prompts (token name, symbol, contract prefix, roles prefix, etc.).

This only registers the product in the off-chain registries (`config/types/tokens.ts`, `helpers/contracts.ts`, `helpers/roles.ts`, `helpers/mtokens-metadata.ts`). No per-product contracts are generated: v2 deploys the base contracts with the product roles passed as constructor args.

After generation:

- Review the git diff and ensure the registries look correct.

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
- `--vault-version <v1|v2>`: required for scripts that work with both vault versions (see below)

### Vault versions

`config/constants/addresses.ts` stores v1 vaults under the base keys (`depositVault`, `redemptionVaultSwapper`, ...) and v2 vaults under `V2`-postfixed keys (`depositVaultV2`, `redemptionVaultV2`, ...).

- Vault deployment, vault upgrades, codegen and the v2-only post-deploy commands always work with v2 vaults and take no version flag. New vault addresses go under the `V2` keys (the deploy script prints the exact key).
- Scripts that support both versions require `--vault-version`: `deploy:post:add:ptokens`, `deploy:post:grant:roles`, `deploy:post:set:greenlist`, `deploy:post:set:sanctionsList`, `deploy:post:set:aaveconfig`, `deploy:post:set:morphoconfig`, `deploy:post:add:addressbook`.
- Swapper and BUIDL redemption vaults exist only in v1. With `--vault-version v2` (and in v2-only commands) config entries that reference them fail with an error.
- With ad-hoc `yarn hardhat runscript`, `--vault-version` is optional; without it `getCurrentAddresses` returns no vault addresses.
- v1 vault upgrades are done from the `main` branch.

### Important: persist deployed addresses

After each step, the script prints proxy and implementation addresses.

Add new addresses to the repo configuration before proceeding to the next step. Skipping this typically causes later validation to fail.

### Deployment order

#### A If deploying to a brand new network

Add `accessControl`, `pauseManager` and `timelockManager` entries for the network to `scripts/deploy/configs/network-configs.ts` (default delay, unpause delay, security council, max pending operations). The deploy scripts fail if they are missing.

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
yarn deploy:rv:ustb
# or
yarn deploy:rv:aave
# or
yarn deploy:rv:morpho
# or
yarn deploy:rv:mtoken
```

Add each deployed vault address under its `V2` key in `config/constants/addresses.ts`.

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
yarn deploy:post:grant:roles --network <network_name> --mtoken <mToken> --vault-version v2
yarn deploy:post:set:price --network <network_name> --mtoken <mToken>
yarn deploy:post:add:ptokens --network <network_name> --mtoken <mToken> --vault-version v2
```

### Optional post-deployment (only if explicitly required)

Each command reads its section of the product `postDeploy` config. Include `--network` and `--mtoken`.

Both vault versions (add `--vault-version <v1|v2>`):

- `yarn deploy:post:set:greenlist`: enable/disable vault greenlist
- `yarn deploy:post:set:sanctionsList`: set the network sanctions list on vaults
- `yarn deploy:post:set:aaveconfig` / `yarn deploy:post:set:morphoconfig`: Aave / Morpho vault settings
- `yarn deploy:post:add:addressbook`: add product addresses to the address book

v2 vaults only:

- `yarn deploy:post:set:waived`: waive vault fee for an address (`addFeeWaived`)
- `yarn deploy:post:pause:functions`: pause selected vault functions via the pause manager (`pauseFunctions`)
- `yarn deploy:post:set:instantlimits`: instant operation rate limit windows (`instantLimits`)
- `yarn deploy:post:set:mintratelimits`: mToken mint rate limit buckets and wallet buckets (`mintRateLimits`)
- `yarn deploy:post:set:tokenconfig`: mToken max supply cap and clawback receiver (`tokenConfig`)
- `yarn deploy:post:set:freefromminamount`: exempt accounts from vault min amount (`freeFromMinAmount`)
- `yarn deploy:post:set:preferloanliquidity`: redemption vault loan liquidity preference (`preferLoanLiquidity`)
- `yarn deploy:post:set:mtokenconfig`: `depositVaultMToken` auto-invest settings (`setMTokenConfig`)
- `yarn deploy:post:set:ustbconfig`: `depositVaultUstb` auto-invest settings (`setUstbConfig`)

Network level (no `--mtoken`):

- `yarn deploy:post:set:userfacingroles`: mark all greenlisted and min balance exempt roles as user facing on access control

## Troubleshooting

- If contract verification failed, you can retry it using `verify` command. Example:

```bash
yarn hardhat verify 0xfc8ac00c85cced29304c37727f525860039b852c --network monad <here you can incert constructor parameters if needed>
```
