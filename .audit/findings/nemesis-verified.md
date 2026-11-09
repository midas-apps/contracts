# N E M E S I S — Verified Findings: radYC / USYC strategy (PR midas-apps/contracts#276)

## Scope

- Language: Solidity 0.8.34 (Hardhat, OZ upgradeable 4.x)
- Diff base: `origin/feat/v2-contracts` → `feat/radyc-strategy` @ `3122f60`
- New contracts (bug-bounty relevant, not covered by prior audits):
  - `contracts/DepositVaultWithUSYC.sol`
  - `contracts/RedemptionVaultWithUSYC.sol`
  - `contracts/libraries/RedemptionVaultWithUSYCLibrary.sol` (linked library, delegatecalled)
  - `contracts/interfaces/usyc/IUSYCTeller.sol`
- Modified, previously audited contracts (re-interrogated only on the delta):
  - `contracts/RedemptionVault.sol` — `_obtainLiquidity` now sources only the net payout, LP shortfall is grossed up; `_approveRequest` safe-liquidity check uses net payout
  - `contracts/RedemptionVaultWithMToken.sol`, `contracts/libraries/RedemptionSwapperHelpersLibrary.sol` — rename of rounding helpers (no semantic change)
- Context used: `DepositVault`, `RedemptionVault`, `ManageableVault`, `mToken`, USTB/MToken siblings, `USYCTellerMock`, Arc-fork integration fixture, `scripts/deploy/configs/radYC.ts`
- Nemesis passes run: Feynman (full) → State (full) → Feynman (targeted) → State (targeted) → converged

## Phase 0 — Recon

**Topology (from fixture + deploy config)**

```
user ──radUSD──▶ radYC DV ──radUSD──▶ radUSD RV ──USDC──▶ radYC DV ──USDC──▶ Teller ──USYC──▶ radYC RV (tokensReceiver)
user ◀──radUSD── radYC RV ◀──radUSD── radUSD DV ◀──USDC── radYC RV ◀──USDC── Teller ◀──USYC── radYC RV
```

**Attack goals considered**

1. Extract more value from the radYC RV than the burned radYC is worth (drain USYC).
2. Mint radYC without delivering matching USYC/USDC to the RV.
3. Leave the vault in a partially executed state (USYC burned but payout not delivered, or user tokens taken without mint).
4. Grief: DoS redemptions / deposits, or exhaust limits and allowances of the *inner* radUSD vaults from the outside.
5. Reenter any vault through the new external calls (Teller, inner DV/RV).

**Value stores and coupled state**

| Store | Outflows | Must stay in sync with |
|---|---|---|
| radYC RV: USYC, USDC, radUSD | `redeemInstant` (via library), `withdrawToken` (admin) | radYC supply (mint on DV ↔ USYC in on RV; burn on RV ↔ USYC out) |
| radYC DV: transient radUSD / USDC | `_autoInvest` (same tx) | Nothing persistent; must end each tx at zero balance |
| radUSD RV: USDC | `redeemInstant` called by radYC DV | its instant limit + USDC `tokensConfig.allowance` |
| radUSD DV: — | `depositInstant` called by radYC RV | its instant limit, `maxSupplyCap`, USDC allowance, `totalMinted[RV]` |

## Phase 1 — Nemesis map (functions × state × couplings)

| Function | Writes | Coupled counterpart | Sync status |
|---|---|---|---|
| `DVUSYC._autoInvest` (instant + request hooks) | pulls tokenIn, burns radUSD on inner RV, mints USYC to RV | radYC minted by caller `_depositInstant` / request stored by `_depositRequest` | ✓ same tx, revert on any inner failure (fallback only replaces USYC with USDC in the same receiver) |
| `RVUSYC._obtainVaultLiquidity` → library | burns USYC, mints radUSD (or receives USDC) into RV | `_obtainLiquidityAndTransfer` pays user from RV balance | ✓ executed inside try/catch self-call; inner success + outer transfer failure reverts the whole tx |
| `RV._obtainLiquidity` (modified) | none; computes shortfall | fee is never paid out in cash (only `amountTokenOutWithoutFee` transferred) | ✓ new "payout-only" target is consistent with `_obtainLiquidityAndTransfer` and `_approveRequest` |
| `RV._obtainLoanLpLiquidityExternal` (unchanged, new input) | loan request `amountTokenOut`, `amountFee` | LP delivers gross − lpFeePortion | ✓ proven: delivered ≥ missing cash (see NM-V1) |
| admin setters (`setUsycTeller`, `setRedemptionVault`, `setDepositVault`, `setAnticipatedFeeRate`, flags) | config only | — | n/a (admin, timelock-able) |

No persistent accounting state is introduced by the new contracts, so no classical "A updated without B" gap exists inside them. All coupling is cross-contract and tx-atomic.

## Verification summary

| ID | Source | Severity | Verdict |
|---|---|---|---|
| NM-001 | Feynman Cat.4 → State (cross-contract limits) | LOW (griefing / ops) | TRUE POSITIVE |
| NM-002 | Feynman Cat.4 (assumption about Teller) | LOW (assumption to verify) | TRUE POSITIVE (conditional) |
| NM-003 | Feynman Cat.6 (return/error path) | INFO | TRUE POSITIVE (doc/behaviour mismatch) |
| NM-004 | Feynman Cat.4 (fee check granularity) | LOW | TRUE POSITIVE (hardening) |
| NM-005 | Feynman Cat.3 (consistency between siblings) | INFO | TRUE POSITIVE |
| NM-006 | Feynman Cat.4 / economics | INFO (design) | TRUE POSITIVE (design note) |
| NM-007 | State (rounding at the seam) | INFO | TRUE POSITIVE (edge, no loss) |
| NM-V1 | Verification of modified base code | — | SOUND |
| NM-V2 | Reentrancy / atomicity | — | SOUND |

No CRITICAL or HIGH findings. No path was found that lets a user take more than the oracle-priced value of the radYC they burn, mint radYC without funding the RV, or leave USYC burned without the payout.

---

## Verified findings

### NM-001 — radYC vaults spend the radUSD vaults' instant limits and token allowances; a zero-fee round trip can grief them
**Severity:** LOW (griefing / operations)
**Files:** `contracts/DepositVaultWithUSYC.sol:308`, `contracts/libraries/RedemptionVaultWithUSYCLibrary.sol:136`

**Feynman question:** "What does the inner vault assume about `msg.sender` when the radYC vault calls it as a user?"

The radYC DV calls `radUSD_RV.redeemInstant(...)` and the radYC RV calls `radUSD_DV.depositInstant(...)` as ordinary users. Each call therefore:

- consumes the inner vault's instant rate limit (`_requireAndUpdateLimit`, `RedemptionVault.sol:675`, `DepositVault.sol:405`);
- decrements the inner vault's non-replenishing `tokensConfig[usdc].allowance` (`ManageableVault.sol:634`);
- on the DV side, counts toward `maxSupplyCap` and `totalMinted[radYC_RV]`.

**Trigger sequence (with the Sepolia/Arc config: `instantFee: 0`, radYC vaults fee-waived on the radUSD vaults):**
1. Attacker holds N radUSD. Deposits into radYC DV → radUSD RV instant limit −N, USDC allowance −N; attacker receives radYC.
2. Attacker redeems radYC on radYC RV with `tokenOut = radUSD` while the RV holds no radUSD → USYC redeemed, radUSD DV instant limit −N, USDC allowance −N.
3. Repeat. Each cycle costs the attacker only gas plus the Teller mint/redeem price spread (≈ one day of USYC accrual, ~0.01%), because every Midas fee on the path is 0 / waived.

**Consequence:** radUSD DV/RV instant limits are exhausted for the day and their finite USDC allowances are burned down until an admin tops them up, DoS-ing instant radUSD operations for everyone. The radYC vaults' own limits also apply, so the attacker's reach per day is bounded by the radYC limits, but the radUSD vaults have no way to tell the two sources apart.

**Mitigation options:** set `allowance = type(uint256).max` for the strategy pair on the inner vaults (the fixture already does this; the deploy config uses 50 000), size the radYC instant limits as a sub-budget of the radUSD limits, or keep a non-zero `instantFee` on at least one leg so cycling is not free.

---

### NM-002 — The RV library assumes the Teller's `previewWithdrawData(account, assets)` is "net assets in, shares out" and that `redeem(shares)` returns ≥ `assets`
**Severity:** LOW (assumption to verify against Circle's Teller; no loss either way)
**File:** `contracts/libraries/RedemptionVaultWithUSYCLibrary.sol:115-131`

**Feynman question:** "What is implicitly trusted about the callee's rounding and fee direction?"

The library computes the USDC it needs (rounding every step up), asks the Teller for the share count via `previewWithdrawData`, caps by `maxRedeem`, redeems, and then relies on `receivedUsdc` covering `assetAmount` so that the inner DV mints at least `missingAmountBase18`. The guarantee that `mint ≥ missing` was traced through the DV's floor/floor math and holds **only if** `receivedUsdc ≥ assetAmount`.

If the real Teller (a) interprets `assets` in `previewWithdrawData` as gross, or (b) rounds in a way that returns one unit less than requested when a redemption fee applies, the inner DV mints one unit less than needed and the user-facing `_tokenTransferFromTo` at `RedemptionVault.sol:778` reverts with insufficient balance. The outer tx reverts, so nothing is lost, but every USYC-backed redemption fails whenever the RV has exactly zero slack and a Teller fee is in force.

With `anticipatedFeeRate = 0` and Circle's rate for the vault = 0 (the fixture's configuration) no fee applies and the mock's semantics match. Recommend confirming (a)/(b) against Circle's Teller/TellerFeeManager source or by an Arc-fork test with a non-zero redemption fee rate, or adding a +1 unit safety margin to `assetAmount` when `anticipatedFeeRate != 0`.

---

### NM-003 — `ZeroTokensReceived` reverts even with `autoInvestFallbackEnabled`, while the NatSpec says fallback covers Teller deposit failure
**Severity:** INFO
**File:** `contracts/DepositVaultWithUSYC.sol:328-340`, NatSpec at `:271-273`

The `require(usycReceived > 0, ...)` sits inside the `try` success block, so it is **not** caught by `catch`; the whole deposit reverts regardless of the fallback flag. The unit test `should fail: teller returns zero shares, even with fallback enabled` pins this behaviour, so it is intentional. The `@dev` note ("Falls back … when … the Teller deposit fails") should say explicitly that a successful call returning zero shares is *not* a fallback case. Not a security issue.

---

### NM-004 — Fee gate compares the Teller *rate*, not the fee the Teller will actually take
**Severity:** LOW (hardening)
**Files:** `contracts/DepositVaultWithUSYC.sol:311-315`, `contracts/libraries/RedemptionVaultWithUSYCLibrary.sol:75`

**Feynman question:** "What does `subscriptionFeeRate(address(this)) == anticipatedFeeRate` actually prove about the next `deposit`?"

The vault gates on the per-account rate but never reads the fee that `previewDepositData(address(this), assetAmount)` / `previewWithdrawData` reports for the concrete amount. Any Teller fee component not expressed through the per-account rate (flat fees, tiering changes, future fee-manager logic) would be silently absorbed: on the DV side the user is minted radYC for the full radUSD amount while the RV receives fewer USYC (under-collateralisation equal to the fee); on the RV side extra USYC is burned.

Given the Teller is a trusted Circle contract and the operator consciously sets `anticipatedFeeRate`, this is acceptable, but a cheaper and stricter gate is available: in the DV, call `previewDepositData` and compare `fee` to `assetAmount * anticipatedFeeRate / 100e18` (or require `fee == 0` when `anticipatedFeeRate == 0`), and apply a `minShares` check instead of only `> 0`.

---

### NM-005 — Setter consistency vs. sibling strategy contracts
**Severity:** INFO
**Files:** `contracts/DepositVaultWithUSYC.sol:171-177`, `contracts/RedemptionVaultWithUSYC.sol:105-108`, `initialize` in both

- `setRedemptionVault` / `setDepositVault` allow `address(this)` and do not use `SameAddressValue`, unlike `RedemptionVaultWithMToken.setRedemptionVault` (`:75-79`). Zero is documented as "disable", which is fine; a self-check (`_validateAddress(addr, true)` when non-zero) would cost nothing.
- `initialize` sets `anticipatedFeeRate`, `redemptionVault` / `depositVault` without emitting the corresponding events, so indexers only see values set after deployment.
- `DepositVaultWithUSYC.initialize` does not validate `_redemptionVault != address(this)` either.

---

### NM-006 — Design note: instant fee of 0 plus separate DV/RV radYC feeds makes the strategy's solvency depend entirely on oracle discipline
**Severity:** INFO (pre-existing architecture, but the strategy makes the loop closed and cheap)
**Files:** `scripts/deploy/configs/radYC.ts` (separate `customAggregatorDv` / `customAggregatorRv`, `instantFee: 0`), `DepositVault._calcAndValidateDeposit`, `RedemptionVault._calcAndValidateRedeem`

radYC is minted at the DV's radYC feed and redeemed at the RV's radYC feed, while the actual USYC is bought at the Teller's `mintPrice` (next-day price) and sold at `price`. Because the radUSD legs are fee-waived and the config sets `instantFee: 0`, the only thing preventing a profitable DV→RV→DV loop is that `RV rate ≤ DV rate ≤ Teller prices`. If the RV aggregator is ever set above the DV aggregator (even briefly, e.g. an operator updates RV before DV on a daily price bump), a user can mint low and redeem high in one block and the USYC in the RV pays the difference. This holds for every Midas product, but with this strategy the round trip is fully on-chain and fee-free, so the operational rule "RV feed never above DV feed, both never above Teller price" deserves to be enforced by the feed-update tooling (or a small non-zero fee on one leg).

---

### NM-007 — Rounding at the Teller/DV seam can leave dust and relies on rounding-up guarantees
**Severity:** INFO
**File:** `contracts/libraries/RedemptionVaultWithUSYCLibrary.sol:97-113`

The mToken path inverts the DV's `floor(floor(a·r_usdc/1e18)·1e18/r_m)` with `ceil(ceil(m·r_m/1e18)·1e18/r_usdc)` and then a covering conversion to 6 decimals. Traced: `mint ≥ missing` holds for any rates (ceil∘ceil ≥ x ⇒ floor∘floor ≥ floor(x) = x). The library reads `usdcRate` as `1e18` when `tokensConfig(usdc).stable` is set, which matches `ManageableVault._getTokenRate` **except** that the DV also calls the feed (for its health/peg checks) and would revert if the feed were unhealthy; in that case `dv.depositInstant` reverts inside the try/catch and the function cleanly yields 0. Over-redeemed USDC (up to one USDC unit + fee rounding) stays in the RV as liquidity. No loss, noted for completeness.

---

## Modified base code — verification notes

### NM-V1 — `_obtainLiquidity` payout-only sourcing and LP gross-up (SOUND)
`contracts/RedemptionVault.sol:692-755`

- The fee is never transferred (only `amountTokenOutWithoutFee` leaves the vault at `:778`; `_approveRequest` transfers the same at `:499`), so requiring cash only for the payout is correct and strictly reduces unnecessary strategy unwinds. All five strategy overrides (`Aave`, `Morpho`, `USTB`, `MToken`, `USYC`) treat `missingAmountBase18` purely as "cash to obtain", so the semantic change is safe for them.
- Gross-up: `gross = ceil(missing·total/payout)`; LP delivers `gross − truncate(floor(fee·gross/total))`. Since `gross·payout/total ≥ missing` and the truncated fee portion `≤ fee·gross/total`, `gross − lpFeePortion ≥ missing`; the swapper's ceil-then-floor conversion returns `≥ gross − lpFeePortion`, and because `missing` and `lpFeePortion` are both multiples of the token unit, the truncated delivery is still `≥ missing`. Verified by the new unit tests (`when loan lp holds exactly the grossed up missing payout`).
- `payoutAmount > 0` is guaranteed by `FeeExceedsAmount`, so the `mulDiv` denominator is safe.
- Behavioural change to be aware of (not a bug): loan requests now record a slightly larger `amountTokenOut`/`amountFee` pro-rata to the gross than before when the vault covers part of the payout; LP repayment grows accordingly.

### NM-V2 — Atomicity and reentrancy (SOUND)
- DV: tokens are pulled, radUSD redeemed, USDC approved and deposited, all before `mToken.mint`; any inner failure (inner RV paused/greenlist/limit/insufficient USDC) reverts the whole deposit, and only the Teller leg can fall back, which keeps value in the same receiver (USDC instead of USYC). The DV ends every path with zero USDC/USYC/radUSD balance (fork tests assert this).
- RV: the library runs inside the existing `this._obtainVaultLiquidityExternal` try/catch with `_requireSelfCall`; a Teller redeem followed by a failing `dv.depositInstant` rolls both back; a successful inner call followed by a short outer transfer reverts everything. No callee on the path (Circle Teller, USYC, USDC, Midas mToken/vaults) hands control to the user, so no reentrancy window exists.
- Library `public` functions are DELEGATECALL-only by Solidity's library guard; `address(this)` resolves to the vault everywhere it is used.
- Gas griefing via the 63/64 rule against the try/catch was checked: the fallback branch needs more gas than the 1/64 remainder a failed Teller call would leave, so a caller cannot force the fallback path deliberately.

## False positives eliminated
- "USYC redeemed but payout not delivered" — impossible: inner self-call and outer transfer are in one tx; shortfall reverts everything.
- "Fee is lost because the vault no longer sources `payout + fee`" — the fee is value retained through the full mToken burn, never a cash obligation.
- "Dangling USDC allowance to the Teller" — allowance is reset to 0 on fallback; on success the Teller pulls `assets` in full (mock and fork behaviour); a residual allowance would be to a trusted contract only.
- "Unprivileged library call" — non-view library functions revert when called directly.

## Summary
- Functions analysed: 14 new/changed (+ 9 base functions re-traced)
- Cross-contract couplings mapped: 4
- Nemesis iterations: 2 (converged)
- Final: 0 CRITICAL | 0 HIGH | 0 MEDIUM | 3 LOW (NM-001, NM-002, NM-004) | 4 INFO
