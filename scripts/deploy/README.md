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
- `--lib <library_name>`: required for library deployment script
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

To grant the v2 network roles to the default accounts (the same for all the networks, hardcoded in `scripts/deploy/common/roles.ts`): pause admin (`PAUSE_ADMIN_ROLE` of the pause manager), timelock challenger (can pause pending timelock operations) and timelock executor (can execute timelock operations):

```bash
yarn deploy:post:grant:v2-network-roles --network <network>
```

To set the delays of an already deployed pause manager: the pause delay to the fixed `PAUSE_DELAY` (not configurable, the same for all the networks) and the unpause delay to the `pauseManager.unpauseDelay` value of the network config. The sender needs `PAUSE_ADMIN_ROLE`; both setters have a fixed 2 days timelock, so the txs are scheduled via the timelock manager and have to be executed after the delay:

```bash
yarn deploy:post:set:pause-delays --network <network>
```

To revoke the minter / burner roles from the v1 vaults of an mToken (`--mtoken` is required):

```bash
yarn deploy:post:revoke:v1-vault-roles --network <network> --mtoken <mtoken>
```

To revoke the legacy (v1) roles of an mToken that are replaced in v2 (`--mtoken` is required, v2 access control only). For now it revokes the legacy pauser role (`<PREFIX>_PAUSE_OPERATOR_ROLE`) from `postDeploy.grantRoles.tokenManagerAddress` of the mToken deployment config, once that address holds the token manager role:

```bash
yarn deploy:post:revoke:legacy-roles --network <network> --mtoken <mtoken>
```

To set the dedicated operator (role admin) of an mToken greenlist role (`customGreenlistOperatorRoleNames` in `helpers/roles.ts`, e.g. `RADIAL_GREENLIST_OPERATOR_ROLE` shared by radUSD and radYC). Does nothing if it is already set on-chain:

```bash
yarn deploy:post:set:greenlist-operator --network <network> --mtoken <mtoken>
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

#### Libraries

Some contracts are linked against external libraries (for example, `RedemptionVaultWithUSYC` uses `VaultsWithUSYCLibrary`). A library is deployed once per network:

```bash
yarn hardhat deploy:library --network <network> --lib <library_name>
```

Add the deployed address to the `libraries` section of the network addresses ([`config/constants/addresses.ts`](../../config/constants/addresses.ts)):

```ts
arc: {
  libraries: {
    VaultsWithUSYCLibrary: '0x...',
  },
},
```

Proxy deployments detect the libraries a contract links against from its artifact and link them automatically. If a required library address is missing, the script fails before deploying.

#### USYC vaults

The USYC Teller address is taken from `usycTellerContracts`. Deploy the library first (see [Libraries](#libraries)), then the redemption vault, so the deposit vault can use it as `tokensReceiver` and as its paired vault:

```bash
yarn hardhat deploy:rv:usyc --network <network> --mtoken <mToken>
# add `redemptionVaultUsycV2` to the addresses file
yarn hardhat deploy:dv:usyc --network <network> --mtoken <mToken>
# add `depositVaultUsycV2` to the addresses file
```

Config keys are `rvUsyc` (`type: 'USYC'`, optional `depositVault`, `anticipatedFeeRate`) and `dvUsyc` (`type: 'USYC'`, optional `redemptionVault`, `anticipatedFeeRate`). `depositVault` / `redemptionVault` are the mToken vaults used to convert USDC to and from the mToken, they take either an address or a `{ mToken, depositVaultType | redemptionVaultType }` reference.

`anticipatedFeeRate` is the fee rate the Teller is expected to charge the vault itself (1e18 = 1%): `subscriptionFeeRate(depositVaultUsyc)` for the deposit vault, `redemptionFeeRate(redemptionVaultUsyc)` for the redemption vault. A vault only uses USYC when its own rate matches and, if a paired vault is set, the rate the Teller charges the paired vault matches the `anticipatedFeeRate` of that vault. Without a paired vault only the vault's own rate is validated.

The paired vault is the other USYC vault of the same mToken and is not configured: a deployment looks it up in the addresses file (`redemptionVaultUsycV2` for the deposit vault, `depositVaultUsycV2` for the redemption vault, address profiles included). If it is not deployed yet, the vault is deployed unpaired; if more than one is found, the deployment fails. The vaults reference each other, so the vault deployed first is always unpaired. Once both addresses are in the addresses file, pair them:

```bash
yarn hardhat deploy:post:set:usycpairedvaults --network <network> --mtoken <mToken>
```

It sends `setRedemptionVaultPaired` / `setDepositVaultPaired` only to the vaults that are not paired with their counterpart yet.

USYC auto-invest deposits are disabled after deployment. To enable them, set `postDeploy.setUsycConfig` and run:

```bash
yarn hardhat deploy:post:set:usycconfig --network <network> --mtoken <mToken>
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
- `yarn deploy:post:add:addressbook`: add product addresses to the address book. With `--vault-version v2` vault names get a `v2` marker (`<mToken> Minter Vault v2 (Morpho) - <Network>`)
- `yarn deploy:post:add:addressbook:network`: add the network level contracts (access control, pause manager, AC timelock manager, AC timelock controller) to the address book as `<Contract> - <Network>`, restricted to the network chain. No `--mtoken` / `--vault-version`; `--keys accessControl,pauseManager,timelockManager,timelockController` limits it to the listed contracts. An existing record of the same address with another name or chains gets an update proposal (name and chain restriction; groups can only be changed in the Fordefi console)

v2 vaults only:

- `yarn deploy:format-log [LOG_PATH] [--print]`: format the log of a deploy / post-deploy run (latest `logs/log-*.log` by default) into a Linear-ready list of txs with the Fordefi tx id and the timelock operation id of timelocked txs, copied to the clipboard
- `yarn deploy:post:sync`: sync the whole product config of the network with on-chain state in one run. Runs the post-deploy steps below (roles, greenlist operator, vault settings, payment tokens, fee waived, greenlist, limits, token config, feed settings, expected answers, pauses) with sending replaced by recording, merges bulk calls from the same wallet (`grantRoleMult`, `revokeRoleMult`, `bulkPauseContract`, `bulkPauseContractFn`), then sends. Nothing is sent if a step fails. `--dry-run true` only prints the txs. Not synced: `setRoundData`, `set:sanctionsList`, LayerZero, Axelar. To sync a new setting, add it to an existing step or add a step to `syncSteps` in `post-deploy/sync_MToken.ts`
- `yarn deploy:post:set:feed-settings`: sync mToken feeds with `genericConfigs`: custom aggregators (`customAggregator`, `customAggregatorDv/Rv`: min/max answer, max answer deviation, growth APR bounds and `onlyUp`) and data feeds (`healthyDiff`). Only fields set in the config are synced; expected answers are synced by `set:expected-answers`
- `yarn deploy:post:set:vaultsettings`: sync the settings of deployed vaults with their deploy config (`dv`, `rv`, ...): min amount, instant fee and its bounds, max instant share, variation tolerance, max approve request id, sequential request processing, tokens receiver, sanctions list, DV min first deposit and max amount per request, RV request redeemer, USYC vaults anticipated fee rate and mToken vault links (`dvUsyc.redemptionVault`, `rvUsyc.depositVault`). Only fields set in the config are synced
- `yarn deploy:post:set:waived`: waive vault fee for an address (`addFeeWaived`)
- `yarn deploy:post:pause:functions`: pause selected vault functions via the pause manager (`pauseFunctions`)
- `yarn deploy:post:pause:contracts`: pause whole vaults via the pause manager (`pauseContracts`)
- `yarn deploy:post:set:instantlimits`: instant operation rate limit windows (`instantLimits`)
- `yarn deploy:post:set:mintratelimits`: mToken mint rate limit buckets and wallet buckets (`mintRateLimits`)
- `yarn deploy:post:set:tokenconfig`: mToken max supply cap and clawback receiver (`tokenConfig`)
- `yarn deploy:post:set:freefromminamount`: exempt accounts from vault min amount (`freeFromMinAmount`)
- `yarn deploy:post:set:preferloanliquidity`: redemption vault loan liquidity preference (`preferLoanLiquidity`)
- `yarn deploy:post:set:mtokenconfig`: `depositVaultMToken` auto-invest settings (`setMTokenConfig`)
- `yarn deploy:post:set:ustbconfig`: `depositVaultUstb` auto-invest settings (`setUstbConfig`)
- `yarn deploy:post:set:usycpairedvaults`: pair `depositVaultUsyc` and `redemptionVaultUsyc` of an mToken with each other

Network level (no `--mtoken`):

- `yarn deploy:post:sync:network`: sync the network level contracts with `network-configs.ts` and the network roles in one run, the same way as `deploy:post:sync` (`--dry-run true` only prints the table). Runs `wire:ac`, `grant:v2-network-roles`, `set:userfacingroles`, `set:pause-delays` and `set:network-settings`. Not synced: `grant:admin`, `revoke:roles`, `transfer:proxyadmin` (deployer one-offs)
- `yarn deploy:post:set:network-settings`: access control default delay (always timelocked) and timelock manager max pending operations per proposer. The security council and the timelock min delay are only compared, mismatches are reported as skipped
- `yarn deploy:post:set:userfacingroles`: mark all greenlisted and min balance exempt roles as user facing on access control

## Troubleshooting

- If contract verification failed, you can retry it using `verify` command. Example:

```bash
yarn hardhat verify 0xfc8ac00c85cced29304c37727f525860039b852c --network monad <here you can incert constructor parameters if needed>
```
