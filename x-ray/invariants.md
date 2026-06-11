# Invariant Map

> Midas Protocol | 28 guards | 14 inferred | 5 not enforced on-chain

---

## 1. Enforced Guards (Reference)

#### G-1
`require(mToken.totalSupply() + upcomingSupply <= maxSupplyCap)` · `DepositVault.sol:817-826` · caps effective mToken supply including pending mint requests

#### G-2
`require(estimatedMintAmount <= maxAmountPerRequest)` · `DepositVault.sol:561-563` · limits per-request mint size on async deposits

#### G-3
`require(totalMinted[userCopy] == 0 ? result.mintAmount >= minMTokenAmountForFirstDeposit : true)` · `DepositVault.sol:774-781` · enforces minimum first-deposit size per user

#### G-4
`require(instantShareToValidate <= maxInstantShare)` · `DepositVault.sol:386-388` · caps instant-deposit share of total supply

#### G-5
`require(request.status == RequestStatus.Pending)` · `DepositVault.sol:717-719` · one-shot request state for approve/reject

#### G-6
`require(instantShareToValidate <= maxInstantShare)` · `RedemptionVault.sol:574-576` · caps instant-redemption share

#### G-7
`require(IERC20(token).balanceOf(requestRedeemer) >= requiredLiquidity)` · `RedemptionVault.sol:1258-1259` · ensures escrow holds mToken before request approval payout

#### G-8
`require(tokensConfig[token].allowance >= amount)` · `ManageableVault.sol:655-660` · vault-level mint/redeem allowance cap per payment token

#### G-9
`require(priceDifPercent <= variationTolerance)` · `ManageableVault.sol:731-733` · bounds oracle drift on safe bulk approve

#### G-10
`require(sequentialRequestProcessing && requestId != nextExpectedRequestIdToProcess)` · `ManageableVault.sol:609-611` · enforces FIFO request processing when enabled

#### G-11
`require(_answer > 0)` · `DataFeed.sol` (via `_getDataInBase18`) · rejects zero/negative oracle answers

#### G-12
`require(block.timestamp - updatedAt <= healthyDiff)` · `DataFeed.sol` · staleness bound on Chainlink reads

#### G-13
`require(_data >= minAnswer && _data <= maxAnswer)` · `CustomAggregatorV3CompatibleFeed.sol` · manual feed answer bounds

#### G-14
`require(_getDeviation(newPrice) <= maxAnswerDeviation)` · `CustomAggregatorV3CompatibleFeed.sol` (setRoundDataSafe) · rate-limits manual price moves

#### G-15
`require(block.timestamp >= lastTimestamp + 1 hours)` · `CustomAggregatorV3CompatibleFeed.sol` (setRoundDataSafe) · minimum update interval on permissionless feed updates

#### G-16
`require(composite >= minExpectedAnswer && composite <= maxExpectedAnswer)` · `CompositeDataFeed.sol` · bounds composite oracle output

#### G-17
`require(denominator > 0)` · `CompositeDataFeed.sol` · prevents division by zero in ratio feeds

#### G-18
`require(_clawbackReceiver != address(0))` · `mToken.sol:140-142` · clawback sink must be configured

#### G-19
`PauseUtilsLibrary.requireNotPaused(accessControl, msg.sig)` · `mToken.sol:331` · function-level pause gate on transfers/mint/burn

#### G-20
`require(!_inClawback)` then blacklist check on `from` · `mToken.sol:334-337` · clawback bypasses sender blacklist only during clawback

#### G-21
`_mintRateLimits.consumeLimit(amount)` when `from == address(0)` · `mToken.sol:341-342` · mint rate limit consumption

#### G-22
`require(proposerPendingOperationsCount <= maxPendingOperationsPerProposer)` · `MidasTimelockManager.sol` · caps scheduled ops per proposer

#### G-23
`require(target != timelock)` · `MidasTimelockManager.sol` · blocks self-targeting timelock ops

#### G-24
`require(delay != 0)` · `MidasTimelockManager.sol` · scheduling requires non-zero role delay

#### G-25
`require(mTokenErc20 == depositVault.mToken() && mTokenErc20 == redemptionVault.mToken())` · `MidasLzVaultComposerSync.sol` (constructor) · cross-chain composer mToken consistency

#### G-26
`require(waivedFeeRestriction(address(this)))` · `AcreAdapter.sol` (requestRedeem) · adapter must be fee-waived for async redeem

#### G-27
`require(rate > 0)` · `AcreAdapter.sol` `_getTokenRate` · positive conversion rate for Acre wrapper

#### G-28
`require(ManageableVault(mTokenDepositVault).waivedFeeRestriction(address(this)))` · `DepositVaultWithMToken.sol:191-195` · linked deposit vault must waive fees for auto-invest path

---

## 2. Inferred Invariants (Single-Contract)

#### I-1

`Conservation` · On-chain: **Yes**

> `totalSupply` changes only via `_mint`/`_burn` paired with balance updates (OZ ERC20)

**Derivation** — Δ-pair: `mToken.sol` `_mint` → `Δ(_totalSupply) = +amount`, `Δ(balanceOf[to]) = +amount`; `_burn` inverse

**If violated** — supply/accounting desync; infinite mint or stuck burn

---

#### I-2

`Bound` · On-chain: **Yes**

> Effective mToken supply (minted + `upcomingSupply`) never exceeds `maxSupplyCap`

**Derivation** — guard-lift: G-1 at `DepositVault.sol:817-826`; only write sites for `upcomingSupply` are deposit request + approve paths, all preceded by G-1 check

**If violated** — over-mint beyond configured cap

---

#### I-3

`Bound` · On-chain: **Yes**

> Per-token vault allowance (`tokensConfig[token].allowance`) monotonically decreases on mint/redeem operations and is checked before debit

**Derivation** — guard-lift: G-8 + `_requireAndUpdateAllowance` write path in `ManageableVault.sol:655-660`

**If violated** — vault exceeds risk budget for payment token exposure

---

#### I-4

`Bound` · On-chain: **No**

> `instantFee` always within `[minInstantFee, maxInstantFee]` globally

**Derivation** — guard-lift: checks at `ManageableVault.sol:708-712` on fee application, but `setInstantFee` writes `instantFee` without re-validating against current min/max at write time (admin can set out of band until next operation)

**If violated** — users charged fees outside configured band until next setter call

---

#### I-5

`Ratio` · On-chain: **Yes**

> Mint amount = `tokenAmountUsd * 1e18 / mTokenRate` (with decimal correction) at deposit time

**Derivation** — Δ-pair/ratio: `DepositVault._calcAndValidateInstant` uses `_convertUsdToMToken` with snapshotted `mTokenRate` and `tokenInRate`

**If violated** — user receives wrong mToken quantity for deposit

---

#### I-6

`Ratio` · On-chain: **Yes**

> Redeem `tokenOut` amount derived from `mTokenAmount * mTokenRate / tokenOutRate` at redeem time

**Derivation** — ratio: `RedemptionVault._calcInstant` with rates from `_getMTokenRate` / `_getPTokenRate`

**If violated** — user receives wrong payment token on redemption

---

#### I-7

`StateMachine` · On-chain: **Yes**

> `mintRequests[id].status`: only `Pending` → `Processed` | `Canceled` (no reverse)

**Derivation** — edge: G-5 + approve sets `Processed` (`DepositVault.sol:656`), reject sets `Canceled` (`DepositVault.sol:293`)

**If violated** — double-processing or replay of finalized requests

---

#### I-8

`StateMachine` · On-chain: **Yes**

> `redeemRequests[id].status`: only `Pending` → `Processed` | `Canceled`

**Derivation** — edge: `RedemptionVault.sol:286`, `RedemptionVault.sol:530` with G-5 equivalent

**If violated** — double payout or double burn on same request

---

#### I-9

`StateMachine` · On-chain: **Yes**

> `timelock` address in `MidasTimelockManager` set once at init (`address(0)` → concrete)

**Derivation** — edge: `require(timelock == address(0))` on `initializeTimelock`

**If violated** — timelock pointer hijack

---

#### I-10

`Temporal` · On-chain: **Yes**

> Chainlink feed data used only if `block.timestamp - updatedAt <= healthyDiff`

**Derivation** — temporal: G-12 in `DataFeed._getDataInBase18`

**If violated** — stale prices drive mint/redeem at outdated rates

---

#### I-11

`Temporal` · On-chain: **Yes**

> Permissionless `setRoundDataSafe` requires ≥1 hour since last round timestamp

**Derivation** — temporal: G-15 in `CustomAggregatorV3CompatibleFeed.sol`

**If violated** — rapid manual oracle manipulation within deviation bounds

---

#### I-12

`Bound` · On-chain: **Yes**

> Manual feed answers ∈ `[minAnswer, maxAnswer]` on every `setRoundData` / `setRoundDataSafe`

**Derivation** — guard-lift: G-13 on all round write paths

**If violated** — oracle reports out-of-band prices

---

#### I-13

`Conservation` · On-chain: **Partial**

> Payment tokens received on deposit equal tokens transferred to `tokensReceiver` (minus fees when applicable)

**Derivation** — Δ-pair: `_tokenTransferFromUser` in `ManageableVault` moves full `tokenAmount` from user; fee split handled in child — instant path debits `tokensConfig.allowance` by USD equivalent

**If violated** — token leakage or silent fee extraction beyond configured `instantFee`

---

#### I-14

`Temporal` · On-chain: **Yes**

> Timelock operations expire after 45 days if not executed (`EXPIRY_PERIOD` in `MidasTimelockManager`)

**Derivation** — temporal: computed status `Expired` from `createdAt + EXPIRY_PERIOD`

**If violated** — stale privileged ops executable indefinitely

---

## 3. Inferred Invariants (Cross-Contract)

#### X-1

On-chain: **Yes**

> Deposit vault assumes `mToken.mint(recipient, amount)` only callable by vault minter role and increases `totalSupply` by `amount`

**Caller side** — `DepositVault.sol` `_approveRequest` / `_depositInstant` — calls `mToken.mint`

**Callee side** — `mToken.sol` `mint` — `onlyRoleNoTimelock(minterRole())`, `_mint` updates supply

**If violated** — mint fails or mints without supply update

---

#### X-2

On-chain: **Yes**

> Redemption vault assumes `mToken.burn(from, amount)` destroys tokens before `tokenOut` transfer on instant path

**Caller side** — `RedemptionVault._redeemInstant` — `mToken.burn` before `_tokenTransferToUser`

**Callee side** — `mToken.burn` — `onlyRoleNoTimelock(burnerRole())`

**If violated** — payout without burn (inflation) or burn without payout

---

#### X-3

On-chain: **No**

> `DepositVaultWithMToken` assumes linked `mTokenDepositVault` maintains consistent `mToken` and `mTokenDataFeed` with parent vault configuration

**Caller side** — `DepositVaultWithMToken._autoInvest` — calls `depositInstant` on linked vault

**Callee side** — linked vault's `mToken()` / rates — no on-chain check that linked vault's mToken matches this vault's `mToken` at runtime after `setMTokenDepositVault`

**If violated** — auto-invest mints wrong asset or uses mismatched oracle

---

#### X-4

On-chain: **Yes**

> `ManageableVault` rate reads assume `IDataFeed.getDataInBase18()` returns value already bounded by feed's min/max/staleness rules

**Caller side** — `ManageableVault._getMTokenRate` / `_getPTokenRate`

**Callee side** — `DataFeed.getDataInBase18`, `CompositeDataFeed.getDataInBase18`, `CustomAggregatorV3CompatibleFeed.latestRoundData`

**If violated** — vault accepts out-of-band prices if feed misconfigured

---

#### X-5

On-chain: **Yes**

> Cross-chain composer assumes deposit and redemption vaults share same `mToken` ERC20 (`MidasLzVaultComposerSync` constructor)

**Caller side** — `MidasLzVaultComposerSync` constructor equality check

**Callee side** — `ManageableVault.mToken()` on both vaults

**If violated** — compose path mints/redeems wrong token

---

#### X-6

On-chain: **No**

> `setRoundDataSafe` is permissionless but assumes honest deviation math; admin `setRoundData` can bypass 1h cooldown and deviation checks

**Caller side** — vaults reading `CustomAggregatorV3CompatibleFeed` via `DataFeed` wrapper or direct

**Callee side** — `setRoundData` (admin) vs `setRoundDataSafe` (public) — two write paths with different guards

**If violated** — admin can move price arbitrarily within `[minAnswer,maxAnswer]` instantly

---

## 4. Economic Invariants

#### E-1

On-chain: **Yes**

> Users cannot mint mToken without depositing payment tokens (instant path) or having tokens escrowed (request path)

**Follows from** — `I-5` + `I-13` + `X-1`

**If violated** — free mToken creation

---

#### E-2

On-chain: **Yes**

> Instant redemption cannot complete without burning equivalent mToken (modulo fee handling)

**Follows from** — `I-6` + `X-2`

**If violated** — redeem payment tokens without burning shares

---

#### E-3

On-chain: **No**

> Global mToken supply respects `maxSupplyCap` including all product vaults sharing one mToken

**Follows from** — `I-2` + `X-3`

**If violated** — cap enforced per vault but multiple vaults could collectively exceed intended supply if misconfigured

---

#### E-4

On-chain: **Yes**

> Oracle staleness on Chainlink-backed feeds prevents mint/redeem at prices older than `healthyDiff`

**Follows from** — `I-10` + `X-4`

**If violated** — arbitrage against stale NAV

---

#### E-5

On-chain: **No**

> Permissionless manual feed updates cannot move price faster than 1h intervals with deviation cap, but admin path has no such throttle

**Follows from** — `I-11` + `I-12` + `X-6`

**If violated** — privileged oracle front-run of user deposits/redemptions
