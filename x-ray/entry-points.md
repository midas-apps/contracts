# Entry Point Map

> Midas Protocol | 86+ entry points | 12 permissionless | 40+ role-gated | 30+ admin-only

---

## Protocol Flow Paths

### Setup (Deployer)

`MidasAccessControl.initialize()` → `initializeRelationships(timelockManager, pauseManager)` → `MidasTimelockManager.initializeTimelock()` → vault `initialize()` → `addPaymentToken()` → feed `initialize()`

### Deposit (User)

`[setup above]` → `DepositVault.depositInstant()` ◄── greenlist/blacklist/sanctions if enabled
├─→ `depositRequest()` ◄── tokens escrowed to tokensReceiver
└─→ [admin] `approveRequest()` / `rejectRequest()`

### Redemption (User)

`[setup above]` → `RedemptionVault.redeemInstant()` ◄── local tokenOut liquidity or strategy pull
├─→ `redeemRequest()` ◄── mToken escrowed to requestRedeemer
└─→ [admin] `approveRequest()` / `rejectRequest()`

### Cross-Chain (User)

`[vault setup]` → `MidasLzVaultComposerSync.depositAndSend()` / `redeemAndSend()` ◄── LZ endpoint compose callback
→ `MidasAxelarVaultExecutable.depositAndSend()` / `redeemAndSend()`

### Oracle (Keeper / Public)

`CustomAggregatorV3CompatibleFeed.setRoundDataSafe()` ◄── ≥1h since last update, deviation bound
`PythChainlinkAdapter.updateFeeds()` ◄── pays Pyth update fee

### Timelock (Proposer / Council)

`[role granted]` → `MidasTimelockManager.scheduleTimelockOperation()` → [dispute period] → `executeTimelockOperation()`

---

## Permissionless

### `DepositVault.depositInstant()`

| Aspect           | Detail                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Visibility       | external, validateUserAccess                                                                                              |
| Caller           | User                                                                                                                      |
| Parameters       | tokenIn (user-controlled), amountToken (user-controlled), minReceiveAmount (user-controlled), recipient (user-controlled) |
| Call chain       | `→ ManageableVault._validateUserAccess → _depositInstant → mToken.mint()`                                                 |
| State modified   | totalMinted, tokensConfig.allowance, \_instantRateLimits                                                                  |
| Value flow       | tokenIn: user → tokensReceiver                                                                                            |
| Reentrancy guard | no                                                                                                                        |

### `DepositVault.depositRequest()`

| Aspect           | Detail                                            |
| ---------------- | ------------------------------------------------- |
| Visibility       | external, validateUserAccess                      |
| Caller           | User                                              |
| Parameters       | tokenIn, amountToken, recipient (user-controlled) |
| Call chain       | `→ _depositRequest → mintRequests[id]`            |
| State modified   | currentRequestId, mintRequests, upcomingSupply    |
| Value flow       | tokenIn: user → tokensReceiver                    |
| Reentrancy guard | no                                                |

### `RedemptionVault.redeemInstant()`

| Aspect           | Detail                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| Visibility       | external, validateUserAccess                                                     |
| Caller           | User                                                                             |
| Parameters       | tokenOut, amountMToken, minReceiveAmount, recipient (user-controlled)            |
| Call chain       | `→ _redeemInstant → mToken.burn → _obtainLiquidityAndTransfer → IERC20.transfer` |
| State modified   | tokensConfig.allowance, \_instantRateLimits                                      |
| Value flow       | mToken burn; tokenOut: vault → recipient                                         |
| Reentrancy guard | no                                                                               |

### `RedemptionVault.redeemRequest()`

| Aspect           | Detail                                                          |
| ---------------- | --------------------------------------------------------------- |
| Visibility       | external, validateUserAccess                                    |
| Caller           | User                                                            |
| Parameters       | tokenOut, amountMToken, recipient (user-controlled)             |
| Call chain       | `→ _redeemRequest → mToken.transferFrom(user, requestRedeemer)` |
| State modified   | currentRequestId, redeemRequests                                |
| Value flow       | mToken: user → requestRedeemer                                  |
| Reentrancy guard | no                                                              |

### `CustomAggregatorV3CompatibleFeed.setRoundDataSafe()`

| Aspect           | Detail                                 |
| ---------------- | -------------------------------------- |
| Visibility       | external                               |
| Caller           | Anyone                                 |
| Parameters       | answer (user-controlled)               |
| Call chain       | `→ _roundData[roundId]`, latestRound++ |
| State modified   | \_roundData, latestRound               |
| Value flow       | none                                   |
| Reentrancy guard | no                                     |

### `CustomAggregatorV3CompatibleFeedGrowth.setRoundDataSafe()`

| Aspect           | Detail                              |
| ---------------- | ----------------------------------- |
| Visibility       | external                            |
| Caller           | Anyone                              |
| Parameters       | answer, growthApr (user-controlled) |
| Call chain       | `→ _roundData`, latestRound++       |
| State modified   | \_roundData, latestRound            |
| Value flow       | none                                |
| Reentrancy guard | no                                  |

### `PythChainlinkAdapter.updateFeeds()`

| Aspect           | Detail                                        |
| ---------------- | --------------------------------------------- |
| Visibility       | external payable                              |
| Caller           | Anyone                                        |
| Parameters       | updateData (user-controlled)                  |
| Call chain       | `→ pyth.updatePriceFeeds → refund excess ETH` |
| State modified   | Pyth on-chain price state                     |
| Value flow       | ETH: msg.sender → Pyth                        |
| Reentrancy guard | no                                            |

### `AcreAdapter.deposit()`

| Aspect           | Detail                                                 |
| ---------------- | ------------------------------------------------------ |
| Visibility       | external                                               |
| Caller           | User                                                   |
| Parameters       | assetAmount, receiver, minShares (user-controlled)     |
| Call chain       | `→ IERC20.transferFrom → IDepositVault.depositInstant` |
| State modified   | ERC20 balances                                         |
| Value flow       | asset: user → adapter → vault                          |
| Reentrancy guard | no                                                     |

### `AcreAdapter.requestRedeem()`

| Aspect           | Detail                                                   |
| ---------------- | -------------------------------------------------------- |
| Visibility       | external                                                 |
| Caller           | User                                                     |
| Parameters       | shares, receiver (user-controlled)                       |
| Call chain       | `→ mToken.transferFrom → IRedemptionVault.redeemRequest` |
| State modified   | ERC20 balances                                           |
| Value flow       | mToken: user → adapter → vault escrow                    |
| Reentrancy guard | no                                                       |

### `MidasLzVaultComposerSync.depositAndSend()`

| Aspect           | Detail                                          |
| ---------------- | ----------------------------------------------- |
| Visibility       | external payable, nonReentrant                  |
| Caller           | User                                            |
| Parameters       | amount, minReceive, sendParam (user-controlled) |
| Call chain       | `→ depositVault.depositInstant → IOFT.send`     |
| State modified   | ERC20 balances/allowances                       |
| Value flow       | paymentToken in; mToken OFT cross-chain         |
| Reentrancy guard | yes                                             |

### `MidasLzVaultComposerSync.redeemAndSend()`

| Aspect           | Detail                                          |
| ---------------- | ----------------------------------------------- |
| Visibility       | external payable, nonReentrant                  |
| Caller           | User                                            |
| Parameters       | amount, minReceive, sendParam (user-controlled) |
| Call chain       | `→ redemptionVault.redeemInstant → IOFT.send`   |
| State modified   | ERC20 balances                                  |
| Value flow       | mToken in; paymentToken OFT cross-chain         |
| Reentrancy guard | yes                                             |

### `MidasAxelarVaultExecutable.depositAndSend()` / `redeemAndSend()`

| Aspect           | Detail                                               |
| ---------------- | ---------------------------------------------------- |
| Visibility       | external payable                                     |
| Caller           | User                                                 |
| Parameters       | amount, minReceive, chain metadata (user-controlled) |
| Call chain       | `→ vault deposit/redeem → ITS interchainTransfer`    |
| State modified   | ERC20 balances                                       |
| Value flow       | cross-chain deposit/redeem                           |
| Reentrancy guard | no                                                   |

---

## Role-Gated

### `M_TOKEN_MINTER` (via mToken.mint)

#### `mToken.mint()`

| Aspect           | Detail                                    |
| ---------------- | ----------------------------------------- |
| Visibility       | external, onlyRoleNoTimelock(minterRole)  |
| Caller           | Vault / authorized minter                 |
| Parameters       | to, amount (protocol-derived)             |
| Call chain       | `→ _mint → _beforeTokenTransfer`          |
| State modified   | balances, \_totalSupply, \_mintRateLimits |
| Value flow       | mint                                      |
| Reentrancy guard | no                                        |

### `CONTRACT_ADMIN` (vault)

#### `DepositVault.approveRequest()` / `rejectRequest()`

| Aspect           | Detail                                               |
| ---------------- | ---------------------------------------------------- |
| Visibility       | external, onlyContractAdmin                          |
| Caller           | Vault admin                                          |
| Parameters       | requestId, rates (keeper-provided on safe approve)   |
| Call chain       | `→ _approveRequest → mToken.mint` or status=Canceled |
| State modified   | mintRequests, upcomingSupply, totalMinted            |
| Value flow       | mint on approve                                      |
| Reentrancy guard | no                                                   |

#### `RedemptionVault.approveRequest()` / `rejectRequest()`

| Aspect           | Detail                                                |
| ---------------- | ----------------------------------------------------- |
| Visibility       | external, onlyContractAdmin                           |
| Caller           | Vault admin                                           |
| Parameters       | requestId, rates (keeper-provided)                    |
| Call chain       | `→ _approveRequest → mToken.burn → tokenOut transfer` |
| State modified   | redeemRequests, allowances                            |
| Value flow       | tokenOut out                                          |
| Reentrancy guard | no                                                    |

### `TIMELOCK_OPERATION_PAUSER_ROLE`

#### `MidasTimelockManager.pauseOperation()`

| Aspect           | Detail                                             |
| ---------------- | -------------------------------------------------- |
| Visibility       | external, onlyRoleNoTimelock                       |
| Caller           | Security pauser                                    |
| Parameters       | operationId (protocol-derived)                     |
| Call chain       | `→ _operationDetails[operationId].status = Paused` |
| State modified   | operation status                                   |
| Value flow       | none                                               |
| Reentrancy guard | no                                                 |

### `SECURITY_COUNCIL_MANAGER_ROLE`

#### `MidasTimelockManager.setSecurityCouncil()`

| Aspect           | Detail                              |
| ---------------- | ----------------------------------- |
| Visibility       | external, onlyRole                  |
| Caller           | Council manager                     |
| Parameters       | members[] (admin-controlled)        |
| Call chain       | `→ _securityCouncils[version]`      |
| State modified   | securityCouncilVersion, council set |
| Value flow       | none                                |
| Reentrancy guard | no                                  |

---

## Admin-Only

| Contract                         | Function                                | Parameters                      | State Modified                |
| -------------------------------- | --------------------------------------- | ------------------------------- | ----------------------------- |
| ManageableVault                  | `addPaymentToken()`                     | token, allowance, fee, dataFeed | tokensConfig, \_paymentTokens |
| ManageableVault                  | `removePaymentToken()`                  | token                           | delete tokensConfig           |
| ManageableVault                  | `changeTokenAllowance()`                | token, allowance                | tokensConfig.allowance        |
| ManageableVault                  | `changeTokenFee()`                      | token, fee                      | tokensConfig.fee              |
| ManageableVault                  | `setInstantFee()`                       | fee                             | instantFee                    |
| ManageableVault                  | `setTokensReceiver()`                   | addr                            | tokensReceiver                |
| ManageableVault                  | `withdrawToken()`                       | token, amount                   | ERC20 balance                 |
| ManageableVault                  | `setInstantLimitConfig()`               | window, limit                   | \_instantRateLimits           |
| DepositVault                     | `setMaxSupplyCap()`                     | cap                             | maxSupplyCap                  |
| DepositVault                     | `setMaxAmountPerRequest()`              | max                             | maxAmountPerRequest           |
| RedemptionVault                  | `setRequestRedeemer()`                  | addr                            | requestRedeemer               |
| RedemptionVault                  | `setLoanLp()` / `setLoanSwapperVault()` | addr                            | loan config                   |
| mToken                           | `setClawbackReceiver()`                 | addr                            | clawbackReceiver              |
| mToken                           | `mintGoverned()` / `burnGoverned()`     | to/from, amount                 | supply                        |
| mToken                           | `clawback()`                            | from, amount                    | balances                      |
| MidasAccessControl               | `grantRole()` / `revokeRole()`          | role, account                   | role membership               |
| MidasAccessControl               | `setPermissionRoleMult()`               | target, selectors               | \_permissionRoles             |
| MidasAccessControl               | `setDefaultDelay()`                     | delay                           | defaultDelay                  |
| DataFeed                         | `changeAggregator()`                    | aggregator                      | aggregator                    |
| DataFeed                         | `setHealthyDiff()`                      | diff                            | healthyDiff                   |
| CustomAggregatorV3CompatibleFeed | `setRoundData()`                        | answer                          | \_roundData (no safe guards)  |
| MidasTimelockManager             | `executeTimelockOperation()`            | operationId                     | executes scheduled call       |

---

## Initialization

| Contract                    | Function                                | Caller        | Notes                           |
| --------------------------- | --------------------------------------- | ------------- | ------------------------------- |
| mToken                      | `initialize()` / `initializeV2()`       | Deployer      | Once per proxy                  |
| DepositVault                | `initialize()`                          | Deployer      | Sets caps, ManageableVault init |
| RedemptionVault             | `initialize()`                          | Deployer      | Sets redeemer, loan config      |
| MidasAccessControl          | `initialize()` / `initializeV2()`       | Deployer      | Role registry                   |
| MidasTimelockManager        | `initialize()` / `initializeTimelock()` | DEFAULT_ADMIN | Two-step timelock wiring        |
| DataFeed / CustomAggregator | `initialize()`                          | Deployer      | Oracle config                   |
| MidasLzVaultComposerSync    | `initialize()`                          | Deployer      | Max approvals to vaults         |
