# X-Ray Report

> Midas Protocol | 4030 nSLOC | f8f332b (`feat/2026-q2-contracts-scope`) | Hardhat | 11/06/26

Analyzed branch: `feat/2026-q2-contracts-scope` at `f8f332b`

---

## 1. Protocol Overview

**What it does:** Tokenized yield/RWA vault protocol where users deposit payment tokens to mint mTokens and redeem mTokens for payment tokens at oracle-derived rates.

- **Users**: Deposit payment tokens for mTokens (instant or request-based); redeem mTokens for payment tokens; cross-chain via LayerZero/Axelar composers
- **Core flow**: User deposits → vault reads mToken/payment-token oracles → mints mToken (or queues request for admin approval)
- **Key mechanism**: Request/async + instant sync modes; per-token allowance caps; optional strategy routing (Morpho, Aave, USTB, linked vaults)
- **Token model**: Upgradeable ERC20 `mToken` per product; optional `mTokenPermissioned` with greenlist-gated transfers
- **Admin model**: `MidasAccessControl` with per-function permission roles, timelock delays, security council veto on scheduled ops, and function-level pause manager

For a visual overview of the protocol's architecture, see the [architecture diagram](architecture.svg).

### Contracts in Scope

| Subsystem | Key Contracts | nSLOC | Role |
|-----------|--------------|------:|------|
| Core Vaults | DepositVault, RedemptionVault, ManageableVault | ~2100 | Mint/redeem, fees, request queue, payment-token registry |
| Vault Extensions | DepositVaultWithMorpho, RedemptionVaultWithMorpho, WithMToken, WithUSTB, WithAave | ~900 | Auto-invest / liquidity sourcing via external protocols |
| Tokens | mToken, mTokenPermissioned, mTokenBase | ~450 | ERC20 with role-gated mint/burn, clawback, rate limits |
| Access Control | MidasAccessControl, MidasTimelockManager, MidasPauseManager, Greenlistable, Blacklistable | ~1200 | Roles, timelock, pause, sanctions |
| Price Feeds | DataFeed, CustomAggregatorV3CompatibleFeed, CompositeDataFeed, Growth variant | ~700 | Chainlink wrapper, manual feeds, composites |
| Cross-Chain | MidasLzVaultComposerSync, MidasAxelarVaultExecutable, MidasLzMintBurnOFTAdapter | ~700 | LZ/Axelar deposit-redeem compose |
| Adapters | ChainlinkAdapterBase family, AcreAdapter, DataFeedToBandStdAdapter | ~500 | External oracle/strategy wrappers |
| Products | mWIN, mEVETH, liquidRWA, qHVNUSD, carryTradeUSDTRYLeverage, stockMarketTRBasisTrade | ~600 | Per-product role constants + thin vault/feed wrappers |
| Libraries | RateLimitLibrary, PauseUtilsLibrary, DecimalsCorrectionLibrary, AccessControlUtilsLibrary | ~400 | Shared math, pause, ACL helpers |

### Backwards-Compatibility Code

- `contracts/abstract/mTokenBase.sol` — removed in recent refactor (`9413ad3`); logic folded into `mToken.sol` directly. If still present in working tree, treat as migration remnant not active architecture.

### How It Fits Together

The core trick: vaults are oracles-driven mint/burn engines — payment-token USD value and mToken NAV come from feeds, with admin-approved async path when instant liquidity or policy requires off-chain processing.

### Instant Deposit

```
User.depositInstant(tokenIn, amount, minReceive, recipient)
├─ ManageableVault._validateUserAccess(recipient)     // greenlist, blacklist, sanctions, pause
├─ _getPTokenRate(tokenIn) → IDataFeed.getDataInBase18()
├─ _getMTokenRate() → mTokenDataFeed.getDataInBase18()
├─ IERC20.safeTransferFrom(user → tokensReceiver)
└─ mToken.mint(recipient, shares)                     // minter role on vault
```

### Request Deposit

```
User.depositRequest(...)
├─ tokens → tokensReceiver; mintRequests[id] = Pending; upcomingSupply += estimate
└─ Admin.approveRequest(id, rate) → mToken.mint; status = Processed
```

### Instant Redemption

```
User.redeemInstant(tokenOut, amountMToken, ...)
├─ mToken.burn(user, amount)                          // or transfer to requestRedeemer on request path
├─ _obtainLiquidityAndTransfer()                      // local balance / Morpho / USTB / linked vault
└─ IERC20.safeTransfer(tokenOut → recipient)
```

### Cross-Chain Compose

```
User.depositAndSend() [LzComposer]
├─ depositVault.depositInstant(...)
└─ mTokenOFT.send(cross-chain)
```

---

## 2. Threat & Trust Model

### Protocol Threat Profile

> Protocol classified as: **Yield Aggregator / Vault** with **Stablecoin** characteristics

Midas matches yield-vault signals (`deposit`/`withdraw`, share mint/burn, strategy hooks into Morpho/Aave/USTB, `tokensReceiver` treasury routing) plus stablecoin-like peg mechanics (mint/burn against collateral at oracle NAV, supply caps, allowance limits). (per spec)

### Actors & Adversary Model

| Actor | Trust Level | Capabilities |
|-------|-------------|-------------|
| User (depositor/redeemer) | Bounded (must pass access lists when enabled) | `depositInstant/Request`, `redeemInstant/Request`; cannot mint directly |
| Vault Admin (`CONTRACT_ADMIN_ROLE`) | Bounded (per-vault role) | Instant operational setters (fees, allowances, approve/reject requests, withdraw tokens) — subject to function-level pause; no timelock on most vault admin fns |
| Minter/Burner | Bounded | `mToken.mint/burn` only while holding role; mint rate-limited |
| DEFAULT_ADMIN | Trusted (with 2-day default delay on AC changes) | Grant/revoke roles, set delays, permission matrices — timelock + security council on scheduled ops |
| Security Council | Bounded (5–15 members, veto quorum) | Pause/veto timelock operations during dispute window; cannot directly move funds |
| Oracle Updater | Bounded | `setRoundDataSafe` permissionless with 1h cooldown + deviation cap; admin `setRoundData` instant within min/max |
| Cross-chain Relayer | Bounded | LZ/Axelar compose callbacks only from endpoint/ITS |

**Adversary Ranking:**

1. **Oracle manipulator** — Manual and composite feeds directly set mint/redeem exchange rates; flash-loan capital amplifies spot manipulation on external strategy pulls.
2. **Compromised vault admin** — Can approve requests at chosen rates, change fees/allowances, withdraw tokens to `tokensReceiver`, and disable greenlist mid-operation.
3. **Share inflation / first-depositor attacker** — Classic vault concern if empty-state mint rounding or donation paths exist; mitigated partially by `minMTokenAmountForFirstDeposit` and supply cap.
4. **Cross-chain compose attacker** — Compose refund paths and slippage params on LZ/Axelar entry points; failed compose refunds to `tx.origin`.
5. **Timelock/governance attacker** — Acquires proposer + council seats to pass malicious scheduled upgrades or role grants.

See [entry-points.md](entry-points.md) for the full permissionless entry point map.

### Trust Boundaries

- **User → Vault** — Access lists (greenlist/blacklist/sanctions) and pause gates protect entry; instant ops still trust oracle rates at tx time (`ManageableVault._getMTokenRate`).
- **Vault → mToken** — Vault holds minter/burner; compromise mints unbacked supply. No timelock on minter role grant at vault deploy time.
- **Vault → External strategies** — Morpho/Aave/USTB/linked-vault calls trust external protocol accounting; `DepositVaultWithMToken` does not re-verify linked vault mToken matches at runtime after admin setter (`X-3`).
- **Admin → Timelock** — 2-day default delay on AC role changes; operational vault functions largely instant. Council can veto scheduled ops within 45-day expiry.
- **Oracle → Vault** — Chainlink staleness bounded by `healthyDiff`; manual feed has permissionless `setRoundDataSafe` throttled but admin `setRoundData` is instant within bounds.

*Git signal: access_control area — 277 commits; fund_flows — 272 commits; elevated churn on `ManageableVault.sol`, `RedemptionVault.sol`, `MidasAccessControl.sol`.*

### Key Attack Surfaces

- **Instant deposit/redemption oracle snapshot** &nbsp;[[I-5](invariants.md#i-5), [I-6](invariants.md#i-6), [X-4](invariants.md#x-4)] — `ManageableVault._getMTokenRate` / `_getPTokenRate` at tx time; worth tracing whether composite/manual feeds can be moved within same block via `setRoundDataSafe` or admin path.

- **Request approve rate selection** &nbsp;[[G-9](invariants.md#g-9), [I-7](invariants.md#i-7)] — Admin sets `tokenOutRate`/`mTokenRate` on approve; `variationTolerance` only on safe bulk paths — worth confirming avg-rate fallback behavior (`08c7b06` fix area).

- **Supply cap vs upcomingSupply** &nbsp;[[G-1](invariants.md#g-1), [I-2](invariants.md#i-2)] — `upcomingSupply` tracks pending mints; worth checking all reject/cancel paths decrement `upcomingSupply`.

- **Vault token allowance debit** &nbsp;[[G-8](invariants.md#g-8), [I-3](invariants.md#i-3)] — Per-payment-token allowance is risk budget; worth confirming instant + request paths debit consistently including fee portions.

- **Permissionless manual feed updates** &nbsp;[[G-14](invariants.md#g-14), [G-15](invariants.md#g-15), [X-6](invariants.md#x-6)] — `setRoundDataSafe` public with deviation + 1h cooldown; admin `setRoundData` bypasses cooldown — worth comparing which feeds vaults actually consume.

- **Linked-vault auto-invest** &nbsp;[[X-3](invariants.md#x-3), [G-28](invariants.md#g-28)] — `DepositVaultWithMToken._autoInvest` calls external deposit vault; worth confirming mToken/oracle alignment after `setMTokenDepositVault`.

- **Redemption liquidity sourcing** — `RedemptionVault._obtainLiquidityAndTransfer` chains local balance, loan LP, Morpho redeem, USTB redeem, linked redemption vault; worth tracing shortfall handling when multiple sources partially fill.

- **mToken clawback path** &nbsp;[[G-18](invariants.md#g-18), [G-20](invariants.md#g-20)] — Admin clawback bypasses sender blacklist during `_inClawback`; worth confirming receiver blacklist still enforced.

- **Timelock operation lifecycle** &nbsp;[[I-9](invariants.md#i-9), [I-14](invariants.md#i-14)] — Council veto + 45-day expiry; worth confirming `abortOperation` reachable states and proposer pending cap under griefing.

- **Cross-chain compose refunds** &nbsp;[[X-5](invariants.md#x-5)] — LZ compose try/catch refunds to `tx.origin` on failure; worth tracing partial-deposit state if `depositInstant` succeeds but OFT send fails.

- **Instant fee band configuration** &nbsp;[[I-4](invariants.md#i-4)] — `setInstantFee` may write outside min/max until next operation; worth confirming enforcement on all fee-charging paths.

- **DEFAULT_ADMIN operational instant powers** — Vault `withdrawToken`, allowance changes, feed aggregator swaps execute without timelock delay (only role grant is delayed) — worth mapping full instant admin surface in ROLES.md.

### Upgrade Architecture Concerns

- **UUPS/transparent proxies on core contracts** — `MidasInitializable` disables implementation initializers; worth confirming all implementations initialized once and storage gaps consistent across inheritance (`__gap` present on major contracts).
- **Recent timelock/AC refactor** — `17c33d4`, `4d4f213`, `8ae6f6a` moved delay management into `MidasAccessControl`; upgrade scripts must align new permission role keys.
- **mTokenBase removal** (`9413ad3`) — Storage layout change; verify proxy upgrade path does not shift slots for live mTokens.

### Protocol-Type Concerns

**As a Yield Aggregator / Vault:**
- Strategy hooks (`DepositVaultWithMorpho`, `WithAave`, `WithUSTB`) route collateral off-vault — worth checking share/accounting if strategy reports lag NAV feed.
- `tokensReceiver` holds proceeds — vault `withdrawToken` can move any ERC20 to receiver instantly by admin.

**As a Stablecoin-like mint/burn system:**
- `maxSupplyCap` + per-token `allowance` are independent limits — worth confirming economic intent when both bind differently.
- Request-mode mint delays NAV realization — admin approve rate vs market rate is central trust assumption.

### Temporal Risk Profile

**Deployment & Initialization:**
- `initializeRelationships` wires timelock/pause manager once — front-run risk if proxy left uninitialized on deployment networks.
- Cross-chain composers require matching mToken on both vaults at constructor — misconfiguration bricks compose path.

**Market Stress:**
- Instant redemption depends on local/strategy liquidity — request path becomes critical when instant limits hit.

### Composability & Dependency Risks

> **Chainlink Aggregator** — via `DataFeed.getDataInBase18`
> - Assumes: positive answer, freshness ≤ `healthyDiff`, within min/max bounds
> - Validates: staleness, bounds, positivity
> - Mutability: admin can `changeAggregator` instantly
> - On failure: revert (deposit/redeem blocked)

> **CustomAggregatorV3CompatibleFeed** — via product feeds / manual NAV
> - Assumes: updater behavior bounded by deviation on safe path
> - Validates: min/max answer; safe path adds 1h + deviation
> - Mutability: admin `setRoundData` instant within bounds
> - On failure: revert on out-of-bounds

> **Morpho / Aave / USTB** — via vault extension `_autoInvest` / `_obtainVaultLiquidity`
> - Assumes: ERC4626/pool redeemability, correct `asset()` match
> - Validates: asset address match on setter; shares > 0 on deposit
> - Mutability: external protocol governance
> - On failure: fallback flag on Morpho/MToken deposit paths; redemption may return partial liquidity

> **LayerZero Endpoint** — via `MidasLzVaultComposerSync.lzCompose`
> - Assumes: endpoint authenticity, OFT decimal conversion
> - Validates: `msg.sender == lzEndpoint`, compose caller whitelist
> - Mutability: LZ infrastructure
> - On failure: refund path on compose catch

**Token Assumptions:**
- Standard ERC20 (no fee-on-transfer validation in core transfer helpers) — impact if fee-on-transfer token added as payment token.
- USTB `subscribe`/`redeem` fee assumptions — `DepositVaultWithUSTB` requires `fee == 0` on supported stables.

---

## 3. Invariants

> ### 📋 Full invariant map: **[invariants.md](invariants.md)**
>
> - **28 Enforced Guards** (`G-1` … `G-28`) — per-call preconditions
> - **14 Single-Contract Invariants** (`I-1` … `I-14`) — conservation, bounds, ratios, state machines
> - **6 Cross-Contract Invariants** (`X-1` … `X-6`) — vault↔mToken, vault↔feed, compose paths
> - **5 Economic Invariants** (`E-1` … `E-5`) — mint/redeem backing, oracle staleness, supply cap
>
> High-signal gaps: **I-4** (instant fee band), **X-3** (linked vault mToken alignment), **X-6** (admin oracle fast-path), **E-3** (multi-vault cap aggregation).

---

## 4. Documentation Quality

| Aspect | Status | Notes |
|--------|--------|-------|
| README | Present | `README.md` — architecture, flows, deployment, upgradeability |
| NatSpec | Adequate | Core vaults and AC heavily documented; product wrappers thinner |
| Spec/Whitepaper | Missing | No standalone whitepaper; README serves as protocol spec (per spec) |
| Inline Comments | Adequate | Security-critical paths commented; recent refactor commits added NatSpec |

---

## 5. Test Analysis

| Metric | Value | Source |
|--------|-------|--------|
| Test files | 83 | File scan |
| Test functions | 1812 | `it()` count in `test/` |
| Line coverage | Unavailable — missing `MTBILLTest__factory` typechain artifact | Coverage tool failed at fixture import |
| Branch coverage | Unavailable — same | Coverage tool |

### Test Depth

| Category | Count | Contracts Covered |
|----------|-------|-------------------|
| Unit | 1812 | Broad — deposit/redemption suits, AC, timelock, feeds |
| Integration | present | `test/integration/` |
| Fork | 5 refs | Limited fork usage detected |
| Stateless Fuzz | 0 | none |
| Stateful Fuzz (Foundry) | 0 | none |
| Formal Verification | 0:0 | none |

### Gaps

- No Foundry invariant tests or stateless fuzz despite oracle math and request-state machines — high priority for `ManageableVault`, `DepositVault`, `RedemptionVault`.
- No Certora/Halmos/HEVM specs for timelock manager or access-control permission matrix.
- Coverage metrics unavailable due to typechain/build mismatch on current branch — run `yarn build` before coverage; does not indicate absent tests.
- Cross-chain compose paths (LZ/Axelar) have tester contracts but limited adversarial failure-mode coverage visible from enumeration.

---

## 6. Developer & Git History

> Repo shape: **normal_dev** — 513 source-touching commits over 1116 days (2023-05-22 → 2026-06-11)

### Contributors

| Author | Lines Added | % of Source Changes |
|--------|------------:|--------------------:|
| kostyamospan | 36634 | 71% |
| Dmytro Horbatenko | 9618 | 19% |
| ilya taldykin | 3741 | 7% |
| Others | <2% each | — |

### Review & Process Signals

| Signal | Value | Assessment |
|--------|-------|------------|
| Unique contributors | 8+ | Small team |
| Total commits | 1285 | Active multi-year repo |
| Test co-change rate | 53% | Half of source commits touch tests (co-modification, not coverage) |
| Fix without test rate | 20% | Some fix commits lack test file changes |
| Single-developer dominance | 71% | kostyamospan — concentration risk |

### File Hotspots

| File | Note |
|------|------|
| `ManageableVault.sol` | High churn — shared vault logic |
| `RedemptionVault.sol` | High churn — fund flows + liquidity |
| `MidasAccessControl.sol` | High churn — recent timelock/delay refactor |
| `DepositVault.sol` | Core mint path |
| `MidasTimelockManager.sol` | Governance orchestration |

### Security-Relevant Commits

| SHA | Date | Subject | Score | Key Signal |
|-----|------|---------|------:|------------|
| 6b9a096 | 2026-03-26 | fix: buidl removed | 18 | fund_flows + oracle_price, guard removal |
| 6c4d0cf | 2024-08-12 | fix: _setupRole => _grantRole | 18 | access_control tightening |
| 942ffc9 | 2026-06-05 | fix: remove pause on mtoken | 17 | access_control + fund_flows |
| 08c7b06 | 2026-06-09 | fix: rv avg rate fallback | 15 | redemption accounting |
| 902a66a | 2026-05-13 | fix: contract and tests | 15 | AC/pause/timelock guards |

### Dangerous Area Evolution

| Security Area | Commits | Key Files |
|--------------|--------:|-----------|
| access_control | 277 | MidasAccessControl, ManageableVault, mToken |
| fund_flows | 272 | DepositVault, RedemptionVault, cross-chain composers |
| oracle_price | high | DataFeed, CustomAggregator*, Composite* |
| state_machines | high | Request approve/reject, timelock ops |

### Technical Debt Markers

| File:Line | Type | Text |
|-----------|------|------|
| mocks/LzEndpointV2Mock.sol:155 | TODO | fix (mock only, out of prod scope) |

### Security Observations

- **71% single-author concentration** — kostyamospan authored majority of source lines.
- **Recent AC/timelock refactor burst** — 10+ commits in June 2026 on `MidasAccessControl` / `MidasTimelockManager` — prioritize diff review on delay/permission logic.
- **BUIDL removal (6b9a096)** — large fund-flow deletion; confirm no live deployments still reference removed contracts.
- **Redemption rate fallback fix (08c7b06)** — touches core approve math; verify test coverage for edge cases.
- **20% fix commits without test co-change** — residual unverified fix risk per git co-modification signal.
- **No forked internalized libs detected** — standard npm/OZ dependencies.
- **Products removed on branch (1372338)** — roles now constructor-passed; deployment configs must match new pattern.

### Cross-Reference Synthesis

- **ManageableVault + RedemptionVault churn ∩ oracle surfaces** — top git hotspots align with **I-5/I-6/X-4** rate math → highest leverage review on approve/instant conversion paths.
- **June 2026 AC refactor ∩ admin instant powers** — timelock delays protect role grants, not vault `withdrawToken`/feed swaps → maps to DEFAULT_ADMIN attack surface bullets.
- **Zero fuzz ∩ request state machines** — **I-7/I-8** Pending→Processed transitions lack stateful fuzz despite 1812 unit tests.

---

## X-Ray Verdict

**FRAGILE** — Extensive unit/integration test suite (1812 cases) but no fuzz, invariant, or formal verification on financial/oracle math; documentation and access-control tooling are strong.

**Structural facts:**
1. 4030 nSLOC across 57 in-scope production contracts (excluding interfaces, mocks, testers) in 8 subsystems.
2. 83 test files with 1812 test cases; coverage execution blocked by typechain build error on current branch.
3. Upgradeable proxy pattern on core vaults, mToken, access control, feeds, and cross-chain composers.
4. 71% of source-line changes from one developer over 3-year history.
5. Timelock + security council + function-level pause on privileged operations; most vault admin actions remain instant.
