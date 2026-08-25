---
name: validate-deployment
description: Validate a product's deployment contracts and deploy config against its deployment ticket. Use when the user runs /validate-deployment with a ticket, or asks to check that new product contracts/config match a deployment spec (token, oracle, datafeed, dv/rv params, roles, pause init, payment tokens). Read-only — reports mismatches, does not edit.
---

# Validate a deployment against its ticket

You are given a full deployment ticket (markdown) as the argument. Cross-check the
committed contracts and deploy config against every value in the ticket and produce
a ✓/✗ report. **This is read-only** — never edit files; only report findings.

> **NEVER compare addresses (or any hex string) by eye.** Visual, character-by-character
> comparison of 40-hex-digit addresses is unreliable and has produced false mismatches.
> For every address/hex comparison, run a programmatic check: strip `0x`, lowercase both
> sides, and test string equality (and length) in a single script. Only report an address
> as ✗ when such a check says they differ. Batch all the deployment's address comparisons
> into one script, e.g.:
>
> ```bash
> python3 - <<'PY'
> pairs = {
>   "requestRedeemer": ("<ticket>", "<config>"),
>   "feeReceiver":     ("<ticket>", "<config>"),
>   # ...one entry per address in the ticket
> }
> for k,(t,c) in pairs.items():
>     eq = t.lower().removeprefix("0x") == c.lower().removeprefix("0x")
>     print(("OK  " if eq else "DIFF"), k, "" if eq else f"{t} != {c}")
> PY
> ```
>
> If the two strings are equal under this check, the row is ✓ — do not second-guess it
> with a manual "looks truncated" narrative.

## 0. Parse the ticket

Extract into a checklist:

- **Token**: ticker (symbol), name, denomination.
- **Oracle**: tolerance %, datafeed Max/MinExpectedAnswer (raw 8-dp integers).
- **dv**: type, fee recipient, tokens receiver, instantFee, sanctions list addr,
  greenlist on/off, variationTolerance, maxSupplyCap, instantDailyLimit, minAmount.
- **rv**: variant (swapper/regular/buidl/…), swapped token & LP, fee recipient,
  tokens receiver, request redeemer, instantRedeemFee, sanctions list, greenlist,
  variationTolerance, instantDailyLimit, fiatFlatFee, fiatAdditionalFee, minAmount,
  minFiatRedeemAmount.
- **Roles**: token manager, vaults manager, oracle admin; MINT/BURN operator wiring.
- **Init / pause**: which functions to pause on dv and rv (ticket lists selectors).
- **Payment tokens**: per vault — name, address, fee, stable?, allowance, datafeed
  (reused address).
- **Network**: which chain (maps to `chainIds.*`).

Derive the internal token key (e.g. `Re7BTC`) and the `contractNamesPrefixes` value
(e.g. `Re7BTC`, `MArbBTC`). If the ticket ticker doesn't obviously map, grep
`helpers/contracts.ts` and `config/types/tokens.ts` to find it.

## 1. Locate the artifacts

- Contracts: `contracts/products/<Prefix>/` — expect `<Token>.sol`,
  `<Prefix>CustomAggregatorFeed.sol`, `<Prefix>DataFeed.sol`, `<Prefix>DepositVault.sol`,
  `<Prefix>RedemptionVaultWithSwapper.sol` (or the ticket's rv variant),
  `<Prefix>MidasAccessControlRoles.sol`.
- Config: `scripts/deploy/configs/<Token>.ts`.
- Registrations: `config/types/tokens.ts` (enum), `helpers/contracts.ts`
  (`contractNamesPrefixes`), `helpers/roles.ts` (`prefixes`, greenlist lists),
  `helpers/mtokens-metadata.ts` (name/symbol), `scripts/deploy/configs/index.ts`
  (`configsPerToken`).
- Payment tokens & sanctions list: `config/constants/addresses.ts`.

If any file is missing, that's a ✗.

## 2. Unit conversions (the tricky part — get these exact)

Config uses `parseUnits(value, decimals)` from `ethers/lib/utils`.

| Ticket field | On-chain meaning | Config expression | Check |
|---|---|---|---|
| Oracle tolerance `P%` | deviation is % at 8 dp (`10**decimals`) | `maxAnswerDeviation: parseUnits('P', 8)` | tolerance 0.07% → `parseUnits('0.07', 8)` |
| Max/MinExpectedAnswer `N` (raw 8-dp int) | 8-dp price bound | `parseUnits('(N/1e8)', 8)` | 104000000 → `parseUnits('1.04', 8)` |
| Fees & tolerances (`variationTolerance`, `instantFee`, `fiatAdditionalFee`) | `ONE_HUNDRED_PERCENT = 10000` (100%); raw int == bps | `parseUnits('(raw/100)', 2)` | `80` → `parseUnits('0.8', 2)=80`; `30 BPS` → `parseUnits('0.3', 2)=30`; `10` → `parseUnits('0.1', 2)=10` |
| Token amounts (`minAmount`, `fiatFlatFee`, `minFiatRedeemAmount`, `instantDailyLimit`, `allowance`) | 18-dp | `parseUnits('X', 18)` | `30000000000000000000` → `parseUnits('30', 18)`; `0.000015 mToken` → `parseUnits('0.000015', 18)` |
| infinite / uncapped | `type(uint256).max` | `constants.MaxUint256` | maxSupplyCap / instantDailyLimit "infinite" |
| InstantFee 0 | 0 | `parseUnits('0', 2)` | — |

Reminders:
- `maxAnswerDeviation` must be `<= 100 * 10**8` (contract asserts). Flag if exceeded.
- Datafeed `healthyDiff` (e.g. `2592000` = 30d) is usually **not** in the ticket — it's
  a standard default. Don't flag as a mismatch; note it as "not specified, default".
- Payment token `isStable` defaults to **true** when omitted. Ticket "Stable: true" →
  omit `isStable`. Ticket "Stable: false" → must have `isStable: false`.

## 3. Contract checks

- `<Token>.sol` `_getNameSymbol()` returns exactly (ticket name, ticket ticker).
- Role constants use the token's role prefix (matches `helpers/roles.ts` `prefixes`,
  e.g. `RE7_BTC_...`). Feed contracts point `feedAdminRole()`/`vaultRole()` at the
  right role from `<Prefix>MidasAccessControlRoles.sol`.
- rv contract is the variant the ticket asks for (swapper → extends
  `RedemptionVaultWithSwapper`).

## 4. Config checks (`scripts/deploy/configs/<Token>.ts`)

- `genericConfigs.customAggregator`: `maxAnswerDeviation` (tolerance), `description`
  should be `<Ticker>/<Denomination>` (e.g. `Re7BTC/BTC`).
- `genericConfigs.dataFeed`: `minAnswer`/`maxAnswer` per table above.
- Correct network key (`chainIds.<network>` matching the ticket chain).
- `dv`: every field per §2, addresses byte-for-byte, `enableSanctionsList: true` iff
  ticket has a sanctions list, no greenlist config when greenlist is "no".
- `rvSwapper` (or variant): every field per §2; `liquidityProvider`/`swapperVault`
  `'dummy'` if the ticket says dummy; `requestRedeemer` matches.
- **Attribute each config value to the vault the ticket actually names.** Tickets
  often list a field (e.g. "Set Min Amount") under **only one** vault, while the
  config sets it on **both** dv and rv. Do **not** silently match the config's dv
  value against an rv-only ticket line (or vice-versa) — that masks an unspecified
  value as ✓. When a config field has no counterpart under that vault in the ticket,
  mark the row **"not in ticket"** (⚠️, non-blocking) rather than ✓, even if the
  value happens to equal the other vault's. "Same as dv" in a payment-token line is
  the one explicit cross-reference — there the values *should* be identical, so a
  divergence is a ✗.
- `postDeploy.addPaymentTokens`: for each vault, tokens/allowances/fees/stable match
  the ticket. dv and rv payment-token sets may differ — check each list.
- `postDeploy.grantRoles`: token/vaults/oracle manager addresses match.
- `postDeploy.pauseFunctions`: map ticket selectors to names via
  `VAULT_FUNCTION_SELECTORS` in `scripts/deploy/common/types.ts`, e.g.
  `0x6e26b9f8`→`depositRequest`, `0xe50e3dbb`→`depositRequestWithCustomRecipient`,
  `0xd5f73f5c`→`redeemFiatRequest`. Verify the config lists exactly those.
- `postDeploy.setRoundData` present (`parseUnits('1', 8)` is the usual init price).

## 5. Registration checks

Confirm the token key is added consistently in **all** of: `tokens.ts` enum,
`contracts.ts` `contractNamesPrefixes`, `roles.ts` `prefixes`, `mtokens-metadata.ts`
(name/symbol match ticket), `configs/index.ts` `configsPerToken`. A `Record<MTokenName, …>`
that misses the key won't type-check — call it out.

Greenlist: if ticket says greenlist **off**, the token must **not** be in
`tokenLevelGreenlistTokens` (and no `greenlist` block in `postDeploy`). If **on**, it must be.

## 6. Address-book checks (`config/constants/addresses.ts`)

For each payment token: under the ticket's network, the entry's `token` matches the
ticket address **and** `dataFeed` matches the ticket's "reuse" datafeed address
(byte-for-byte, case-insensitive — use the **programmatic** check from the top of this
skill, never a by-eye comparison). Confirm `sanctionListContracts[chainIds.<network>]`
equals the ticket's sanctions list address the same way.

## 7. Report

Report in this order — **tables first, all prose last**:

1. **Per-section ✓/✗ tables** (Token, Oracle/Datafeed, dv, rv, Roles/Pause, Payment
   tokens, Registrations). For each row show: ticket value → config value → ✓/✗.
2. **Non-blocking notes** — "not in ticket but standard default" items, listed
   separately after the tables.
3. **Verdict (at the very bottom)** — a one-line verdict: matches, or the exact fixes
   needed. Any blockers/mismatches also belong in this closing section, not above the
   tables. Do **not** put a summary verdict or blocker callout before the tables — the
   tables come first, then the notes, then the verdict.

A row's status is driven by what the ticket says about **that vault**:
- ticket value present and equal → ✓
- ticket value present and different → ✗ (blocker)
- **no ticket value for that vault** → ⚠️ "not in ticket" (non-blocking), never ✓ —
  state what the config uses and where the value likely came from (sibling default,
  or the other vault's value). Applies to dv/rv fields and to standard defaults
  (`healthyDiff`, `minFiatRedeemAmount`, `minMTokenAmountForFirstDeposit`, etc.).
