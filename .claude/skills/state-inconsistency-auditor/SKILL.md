---
name: state-inconsistency-auditor
description: Finds state inconsistency bugs where an operation mutates one piece of coupled state without updating its dependent counterpart, causing silent data corruption or reverts in subsequent operations. Triggers on /state-audit, state inconsistency audit, or coupled state audit.
---

# State Inconsistency Auditor

Finds bugs where an operation mutates one piece of coupled state without updating its dependent counterpart, causing silent data corruption or reverts in subsequent operations.

**Language-agnostic by design.** Coupled state bugs exist in any system that maintains related storage values — Solidity, Move, Rust, Go, C++, or anything else.

This agent performs **structural invariant analysis** — systematically mapping every coupled state pair, every mutation path, and every gap where one side updates without the other. It complements first-principles reasoning (Feynman) and pattern-matching tools by finding structural state desync bugs that other methodologies miss.

## When to Activate

- User says "/state-audit" or "state inconsistency audit" or "coupled state audit"
- User wants to find stale state, broken invariants, or desynchronized storage
- After any other audit methodology to catch what it missed

## When NOT to Use

- Quick pattern-matching scans where you only need known vulnerability patterns
- First-principles logic bugs only (use `/feynman` instead)
- Simple spec compliance checks
- Report generation from existing findings

---

## The Abstract Pattern

Every system has **COUPLED STATE PAIRS** — two or more storage values that must maintain a relationship (an invariant) with each other. When any operation changes one side of the pair without adjusting the other, the invariant breaks. Future operations that read both values produce incorrect results.

Examples of coupled state:
- balance & checkpoint
- position size & accumulated tracker
- collateral & obligation
- voting power & snapshot
- shares & any per-share derived value
- principal & any cumulative index
- totalSupply & sum of all individual balances
- debt & interest accumulator
- liquidity & fee growth trackers
- stake amount & reward debt
- token balance & voting delegation
- position collateral & position health factor cache

**The bug class:** Operation X correctly updates State A, but fails to proportionally adjust the coupled State B. State B is now stale relative to State A.

---

## Language Adaptation

When you start, **detect the language** and adapt terminology:

| Concept | Solidity | Move | Rust | Go | C++ |
|---------|----------|------|------|----|-----|
| Storage | state variables | global storage / resources | struct fields / state | struct fields / DB | member variables |
| Mapping | mapping(k => v) | Table\<K, V\> / SmartTable | HashMap / BTreeMap | map[K]V | std::map / unordered_map |
| Delete | delete mapping[key] | table::remove | map.remove(&key) | delete(map, key) | map.erase(key) |
| Event | emit Event() | event::emit() | emit! / log | EventEmit() | signal / callback |
| Internal call | internal function | friend function | pub(crate) fn | unexported func | private method |

---

## Core Rules

```
RULE 0: MAP BEFORE YOU HUNT
Never start checking functions until you have the complete coupled state
dependency map. You cannot find a missing update if you don't know what
updates are required.

RULE 1: EVERY MUTATION PATH MATTERS
A state variable might be modified by 5 different functions. ALL 5 must
update the coupled state. If 4 do and 1 doesn't — that's the bug.

RULE 2: PARTIAL OPERATIONS ARE THE #1 SOURCE
Full removals (delete everything) usually reset all state correctly.
Partial operations (reduce by X) frequently forget to proportionally
reduce the coupled state.

RULE 3: COMPARE PARALLEL PATHS
If transfer() and burn() both reduce a balance, they MUST both update
the same set of coupled state. If one does and the other doesn't — finding.

RULE 4: DEFENSIVE CODE MASKS BUGS
Code like `x > y ? x - y : 0` or `min(computed, available)` silently
hides broken invariants. These are red flags, not safety nets.

RULE 5: EVIDENCE-BASED FINDINGS ONLY
Every finding must include: the coupled pair, the breaking operation,
a concrete trigger sequence, and the downstream consequence.
```

---

## Audit Process

### Phase 1: Map All Coupled State Pairs

For every storage variable, ask: **"What other storage values must change when this one changes?"**

Build a dependency map:

```
State A changes → State B MUST also change (and vice versa)
State C changes → State D and State E MUST also change
```

Look for:
- Any per-user value paired with any per-user accumulator/tracker
- Any balance paired with any historical snapshot or checkpoint
- Any numerator paired with its denominator
- Any position-describing value paired with any position-derived value
- Anything stored at time T that is later used with a value from time T+1
- Any total/aggregate paired with individual components that sum to it
- Any cached computation paired with the inputs it was derived from
- Any index/accumulator paired with the last-known snapshot of that index

**Output of Phase 1:** A Coupled State Dependency Map.

```
┌─────────────────────────────────────────────────────────────┐
│ COUPLED STATE DEPENDENCY MAP                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ PAIR 1: userBalance[user] ↔ checkpoint[user]                 │
│   Invariant: checkpoint must reflect balance at last update  │
│   Mutation points: deposit(), withdraw(), transfer(), burn() │
│                                                              │
│ PAIR 2: totalStaked ↔ rewardPerTokenStored                   │
│   Invariant: rewardPerToken must be updated before           │
│              totalStaked changes                             │
│   Mutation points: stake(), unstake(), emergencyWithdraw()   │
│                                                              │
│ PAIR 3: position.collateral ↔ position.debtShares            │
│   Invariant: health factor derived from both must stay valid │
│   Mutation points: addCollateral(), borrow(), repay(),       │
│                    liquidate(), withdrawCollateral()          │
│                                                              │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Find Every Operation That Mutates Each State

For EACH state variable identified in Phase 1, list **every** function and code path that modifies it. Include:

- **Direct writes**: `state = newValue`
- **Increments/decrements**: `state += delta`, `state -= delta`
- **Deletions**: `delete state`, `state = 0`, `state = default`
- **Indirect mutations**: calling a function that internally modifies it (e.g., `_mint()`, `_burn()`, `_transfer()`)
- **Implicit changes**: burning reduces balance via internal `_burn`, rebasing changes effective balance without explicit write
- **Batch operations**: loops or multicalls that modify state multiple times
- **External triggers**: callbacks, hooks, or oracle updates that modify state as a side effect

**Output of Phase 2:** A Mutation Matrix.

```
┌──────────────────────────────────────────────────────────────────┐
│ MUTATION MATRIX                                                   │
├──────────────────┬───────────────────┬───────────────────────────┤
│ State Variable   │ Mutating Function │ Type of Mutation           │
├──────────────────┼───────────────────┼───────────────────────────┤
│ userBalance[u]   │ deposit()         │ increment (+= amount)      │
│ userBalance[u]   │ withdraw()        │ decrement (-= amount)      │
│ userBalance[u]   │ transfer()        │ decrement sender, inc recv │
│ userBalance[u]   │ _burn()           │ decrement (-= amount)      │
│ userBalance[u]   │ liquidate()       │ decrement (-= seized)      │
│ checkpoint[u]    │ deposit()         │ full reset                 │
│ checkpoint[u]    │ withdraw()        │ full reset                 │
│ checkpoint[u]    │ transfer()        │ ??? — CHECK THIS           │
│ checkpoint[u]    │ _burn()           │ ??? — CHECK THIS           │
│ checkpoint[u]    │ liquidate()       │ ??? — CHECK THIS           │
└──────────────────┴───────────────────┴───────────────────────────┘
```

The `???` entries are your **primary audit targets** — mutations of State A where you haven't confirmed State B is also updated.

---

### Phase 3: Cross-Check — The Core Audit

For EVERY (operation, state variable) pair from Phase 2:

> "This operation modifies State A.
>  Does it ALSO update every coupled state that depends on A?"

Check specifically:

```
□ Full removal (A → 0): Is every coupled state reset/cleared?
□ Partial removal (A decreases): Is every coupled state proportionally reduced?
□ Increase (A grows): Is every coupled state proportionally increased?
□ Transfer (A moves between entities): Is coupled state moved too?
□ Deletion (mapping entry removed): Is the paired mapping entry also removed?
□ Batch modification: Is coupled state updated per-iteration or only once?
```

**If ANY path updates A without updating its coupled state → FINDING.**

For each potential finding, trace the FULL code path:
1. Read the function that modifies State A
2. Search for any write to State B within the same function
3. Search for any internal call that writes to State B
4. Search for any modifier/hook that writes to State B
5. If none found → confirmed finding

---

### Phase 4: Check Operation Ordering Within Functions

Many functions perform multiple state changes sequentially. Trace the exact order:

```
function doSomething() {
    step1: reads State A and State B → computes result
    step2: modifies State B based on result
    step3: modifies State A
    // State B is now stale relative to new State A
}
```

Ask at each step:
- "After this step, are ALL coupled pairs still consistent?"
- "Does step N use a value that step N-1 already invalidated?"
- "If I read the coupled pair RIGHT HERE, would the invariant hold?"
- "If an external call happens between step N and step N+1, can the callee observe inconsistent state?"

**Common ordering bugs:**
- Claim rewards BEFORE reducing stake → rewards computed on old (higher) stake
- Update index AFTER modifying supply → index uses stale supply
- Read cached price AFTER changing position → health check uses wrong price
- Emit event with old values AFTER state change → off-chain systems desync

---

### Phase 5: Compare Parallel Code Paths

Find operations that achieve similar outcomes through different paths:

- `transfer()` vs `burn()` — both reduce sender balance
- `withdraw()` vs `liquidate()` — both reduce position
- `partial` vs `full` removal — both decrease, different amounts
- Direct call vs routed-through-wrapper call
- Normal path vs emergency/admin path
- Single operation vs batch operation
- User-initiated vs keeper/bot-initiated

For each group, compare: **do ALL paths update the same coupled state?**

```
┌────────────────────────────────────────────────────────────┐
│ PARALLEL PATH COMPARISON                                    │
├─────────────────┬──────────────┬──────────────┬────────────┤
│ Coupled State   │ withdraw()   │ liquidate()  │ emergencyW │
├─────────────────┼──────────────┼──────────────┼────────────┤
│ balance         │ ✓ updated    │ ✓ updated    │ ✓ updated  │
│ checkpoint      │ ✓ updated    │ ✗ MISSING    │ ✗ MISSING  │
│ totalSupply     │ ✓ updated    │ ✓ updated    │ ✗ MISSING  │
│ rewardDebt      │ ✓ updated    │ ✗ MISSING    │ ✗ MISSING  │
└─────────────────┴──────────────┴──────────────┴────────────┘

FINDINGS: liquidate() and emergencyWithdraw() don't update checkpoint
          or rewardDebt when reducing balance.
```

If Path A adjusts the coupled state but Path B doesn't → **FINDING**.

---

### Phase 6: Trace Multi-Step User Journeys

Simulate sequences where a user interacts multiple times:

```
1. User enters a position (state initialized)
2. Time passes / external state evolves (index grows, prices change)
3. User does PARTIAL modification (coupled state may break here)
4. More time passes / external state evolves
5. User does another operation reading the coupled state
```

At step 5, ask:
- "Is the coupled state still valid given the partial change at step 3?"
- "Does the computation use stale State B with current State A?"
- "If State B wasn't updated at step 3, how much error has accumulated by step 5?"

**Key sequences to test:**
- Deposit → partial withdraw → claim rewards (rewards on correct amount?)
- Stake → unstake half → restake → unstake all (reward debt correct?)
- Open position → add collateral → partial close → check health (cached values fresh?)
- Delegate votes → transfer tokens → vote (voting power reflects current balance?)
- Provide liquidity → swap happens → remove liquidity (fee tracking correct?)

---

### Phase 7: Check What Masks the Bug

Look for defensive code that HIDES broken invariants:

```
MASKING PATTERN 1: Ternary clamp
  x > y ? x - y : 0
  → WHY would x ever be less than y? If the invariant held, it wouldn't.
    This silently returns 0 instead of reverting on the broken state.

MASKING PATTERN 2: Try/catch swallowing
  try target.call() {} catch {}
  → The revert from broken state is caught and ignored.

MASKING PATTERN 3: Early exit on zero
  if (value == 0) return;
  → Skips the computation entirely when the broken state produces zero.

MASKING PATTERN 4: Min cap
  min(computed, available)
  → Caps the result when broken state over-counts. The over-counting
    is the bug; the min() just prevents the revert.

MASKING PATTERN 5: SafeMath without root cause fix
  → Prevents underflow revert but doesn't fix WHY the subtraction
    would underflow. The state is still inconsistent.

MASKING PATTERN 6: Fallback to default
  value = mapping[key]  // returns 0 for non-existent key
  → If the key SHOULD exist but was deleted without cleaning its
    coupled entry, the zero default masks the missing data.
```

**These patterns convert what SHOULD be a loud failure into a silent one.** The invariant is still broken — the symptom is just suppressed. Flag every instance and trace whether the defensive code is hiding a real state inconsistency.

---

## Red Flags Checklist

```
- [ ] A function modifies a base value but has no writes to its coupled state
- [ ] Two similar operations (e.g., transfer vs burn) handle coupled state differently
- [ ] A "claim/collect" step runs before a "reduce/remove" step, and
      nothing reconciles afterward
- [ ] Partial operations exist alongside full operations, but only the full
      operation resets/clears the coupled state
- [ ] A defensive ternary or min() exists in a computation involving two
      coupled values (asks: WHY would this ever underflow?)
- [ ] delete or reset of one mapping but not its paired mapping
- [ ] A loop processes multiple sub-positions but accumulates into a
      shared coupled value without per-iteration adjustment
- [ ] An emergency/admin function bypasses the normal state update path
- [ ] A migration or upgrade function copies State A but not State B
- [ ] A callback or hook modifies State A but the caller doesn't know
      to update State B afterward
```

---

## Phase 8: Verification Gate (MANDATORY)

**Every CRITICAL, HIGH, and MEDIUM finding MUST be verified before final report.**

### Verification Methods:

**Method A: Code Trace Verification**
1. Read the exact function that breaks the invariant
2. Trace every internal call — confirm no hidden update to the coupled state
3. Check modifiers, hooks, and base class overrides
4. Confirm no event-driven or callback-based reconciliation exists
5. Verdict: TRUE POSITIVE / FALSE POSITIVE

**Method B: PoC Test Verification**
1. Write a test using the project's native framework
2. Execute the trigger sequence from the finding
3. Assert that the coupled state is inconsistent after the operation
4. Assert that a subsequent operation produces incorrect results
5. If test passes: TRUE POSITIVE. If test fails: FALSE POSITIVE

**Method C: Hybrid (trace + PoC)**
For complex multi-contract findings spanning multiple modules.

### Common False Positive Patterns:

1. **Hidden reconciliation**: The coupled state IS updated, but through an internal call chain you missed (e.g., `_beforeTokenTransfer` hook).
2. **Lazy evaluation**: The coupled state is intentionally stale and reconciled on next read (e.g., `_updateReward()` modifier runs before every function).
3. **Immutable after init**: The coupled state is set once and never needs updating because State A also never changes after init.
4. **Designed asymmetry**: The two states are intentionally NOT coupled in the way you assumed (read the docs/comments).

---

## Severity Classification

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Coupled state desync causes direct value loss (wrong payouts, stolen funds, permanent lock) |
| **HIGH** | Coupled state desync causes conditional value loss or broken core functionality |
| **MEDIUM** | Coupled state desync causes incorrect accounting, griefing, or degraded functionality |
| **LOW** | Coupled state desync causes cosmetic issues, event inaccuracy, or edge-case-only errors |

---

## Output Format

Save raw findings to: `.audit/findings/state-inconsistency-raw.md`
Save verified findings to: `.audit/findings/state-inconsistency-verified.md`

```markdown
# State Inconsistency Audit — Verified Findings

## Coupled State Dependency Map
[The map from Phase 1]

## Mutation Matrix
[The matrix from Phase 2]

## Parallel Path Comparison
[The comparison table from Phase 5]

## Verification Summary
| ID | Coupled Pair | Breaking Op | Original Severity | Verdict | Final Severity |
|----|-------------|-------------|-------------------|---------|----------------|

## Verified Findings

### Finding SI-001: [Title]
**Severity:** CRITICAL | HIGH | MEDIUM | LOW
**Verification:** [Code trace / PoC / Hybrid]

**Coupled Pair:** State A ↔ State B
**Invariant:** [What relationship must hold between them]

**Breaking Operation:** `functionName()` in `Contract.sol:L123`
- Modifies State A: [how]
- Does NOT update State B: [what's missing]

**Trigger Sequence:**
1. [Step-by-step minimal sequence to break the invariant]

**Consequence:**
- [What goes wrong when a later operation reads both A and B]
- [Concrete impact: wrong payout amount, locked funds, etc.]

**Masking Code** (if present):
```[language]
// This defensive code hides the broken invariant:
[the masking pattern]
```

**Fix:**
```[language]
// Add the missing state synchronization:
[minimal fix]
```

---

## False Positives Eliminated
[Findings that failed verification, with explanation]

## Summary
- Coupled state pairs mapped: [N]
- Mutation paths analyzed: [N]
- Raw findings (pre-verification): [N]
- After verification: [N] TRUE POSITIVE | [N] FALSE POSITIVE
- Final: [N] CRITICAL | [N] HIGH | [N] MEDIUM | [N] LOW
```

---

## Post-Audit Actions

| Scenario | Action |
|----------|--------|
| Need deeper context on a function | Re-read the function and its callers line-by-line |
| Finding confirmed as true positive | Write up with severity, trigger sequence, PoC, and fix |
| Need first-principles reasoning on a pair | Run `/feynman` on the specific functions involved |
| Need exploit validation | Write a Foundry/Hardhat PoC test to confirm |
| Uncertain about design intent | Check NatSpec, comments, and project documentation |

---

## Anti-Hallucination Protocol

```
NEVER:
- Assume two states are coupled without verifying they are read together
- Claim a function is missing an update without reading its full call chain
- Report a finding without showing the exact code that breaks the invariant
- Ignore lazy-evaluation patterns (modifiers that reconcile on entry)
- Assume a mapping deletion is a bug without checking if the paired mapping
  is also deleted or intentionally kept

ALWAYS:
- Read the actual storage declarations to understand types and relationships
- Trace internal calls to check for hidden updates
- Check _before/_after hooks and modifiers for reconciliation logic
- Verify the coupled relationship by finding code that reads BOTH values together
- Show exact file paths and line numbers for all references
```

---

## Quick-Start Checklist

- [ ] **Phase 1:** Map all storage variables and their coupled dependencies
- [ ] **Phase 1:** Build the Coupled State Dependency Map
- [ ] **Phase 2:** For each state variable, list every mutating function
- [ ] **Phase 2:** Build the Mutation Matrix (mark `???` for unconfirmed updates)
- [ ] **Phase 3:** Cross-check every mutation — does it update all coupled state?
- [ ] **Phase 4:** Check operation ordering within each function
- [ ] **Phase 5:** Compare parallel code paths (transfer/burn, withdraw/liquidate, etc.)
- [ ] **Phase 6:** Trace multi-step user journeys for stale state accumulation
- [ ] **Phase 7:** Flag all defensive/masking code and trace whether it hides broken invariants
- [ ] **Phase 8:** Verify ALL C/H/M findings (code trace + PoC)
- [ ] **Phase 8:** Eliminate false positives (hidden reconciliation, lazy eval, designed asymmetry)
- [ ] **Phase 8:** Save verified findings to `.audit/findings/state-inconsistency-verified.md`
- [ ] **Phase 8:** Present ONLY verified report to the user
