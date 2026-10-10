#!/usr/bin/env sh
#
# Optional, advisory AI code review run at pre-push time.
#
# Behaviour:
#   - Reviews the diff of the current branch against origin/main.
#   - Routes by file type: Solidity changes use a Solidity auditor skill,
#     everything else gets a generic correctness review.
#   - Advisory only: it prints findings and always exits 0. It never blocks
#     a push and never fails the hook, whatever goes wrong.
#   - Interactive terminals get a [y/N] prompt (default No). GUI git clients
#     (no controlling tty) are skipped silently, unless AI_REVIEW=1 forces it.
#
# Escape hatches:
#   AI_REVIEW=0  -> always skip
#   AI_REVIEW=1  -> always run, no prompt (works in GUI clients too)
#   AI_REVIEW_SKILL=<name> -> override the Solidity auditor skill
#                             (default: feynman-auditor; nemesis-auditor for deeper)

# Anything unexpected -> skip quietly. This hook must never break a push.
set +e

BASE_REF="origin/main"

log() { printf '%s\n' "$*" >&2; }

# --- hard skips ------------------------------------------------------------

# Explicit opt-out.
[ "$AI_REVIEW" = "0" ] && exit 0

# No CLI, nothing to do.
command -v claude >/dev/null 2>&1 || exit 0

# Need a base to diff against.
git rev-parse --verify "$BASE_REF" >/dev/null 2>&1 || exit 0

# What this branch changes relative to origin/main.
CHANGED_FILES=$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null)
[ -z "$CHANGED_FILES" ] && exit 0

# --- consent ---------------------------------------------------------------

if [ "$AI_REVIEW" = "1" ]; then
  : # forced, no prompt
elif [ -e /dev/tty ] && [ -r /dev/tty ] && [ -w /dev/tty ]; then
  printf 'Run AI review on this branch before pushing? [y/N] ' > /dev/tty
  read ans < /dev/tty 2>/dev/null || exit 0
  case "$ans" in
    y | Y | yes | YES) ;;
    *) exit 0 ;;
  esac
else
  # No usable tty (e.g. GUI client) and not forced -> skip silently.
  exit 0
fi

# --- routing ---------------------------------------------------------------

SKILL="${AI_REVIEW_SKILL:-feynman-auditor}"

# Capture the branch diff to a temp file so the reviewer never needs to run
# git (or any Bash) itself — see the read-only guarantee note below.
DIFF_FILE=$(mktemp "${TMPDIR:-/tmp}/ai-review.XXXXXX") || exit 0
trap 'rm -f "$DIFF_FILE"' EXIT INT TERM
git diff "$BASE_REF"...HEAD > "$DIFF_FILE" 2>/dev/null
[ -s "$DIFF_FILE" ] || exit 0

if printf '%s\n' "$CHANGED_FILES" | grep -q '\.sol$'; then
  PROMPT="You are performing an ADVISORY pre-push review of a Solidity change.
The full branch diff (vs $BASE_REF) is in this file: $DIFF_FILE — read it first.
Use the ${SKILL} skill to review ONLY the changed Solidity code; read the
surrounding files and callers in the repo for context as needed.
Report concrete, high-confidence issues only, each with file:line and a
severity. Skip style/formatting nits (linters cover those). Be concise.
If you find nothing significant, reply exactly: No significant issues."
else
  PROMPT="You are performing an ADVISORY pre-push code review.
The full branch diff (vs $BASE_REF) is in this file: $DIFF_FILE — read it first.
Review the changed code for correctness bugs and clearly wrong logic; read
surrounding files in the repo for context as needed. Report high-confidence
issues only, each with file:line. Skip style/formatting nits. Be concise.
If you find nothing significant, reply exactly: No significant issues."
fi

# --- run (read-only, sandboxed; never blocks) ------------------------------
#
# Read-only guarantee:
#   allow list    -> only non-mutating tools are auto-approved.
#   deny list     -> mutation/exfiltration tools are HARD-blocked. Deny rules
#                    override any allow rule inherited from settings.json, so
#                    the review cannot write, edit, run Bash, or hit the net,
#                    regardless of local permission config.
# The diff is provided as a file, so no Bash/git is needed to read it.

log ""
log "  AI review (advisory, based on $SKILL) — diff vs $BASE_REF ..."
log ""

claude -p "$PROMPT" \
  --allowedTools "Read" "Grep" "Glob" "Skill" \
  --disallowedTools "Bash" "Write" "Edit" "NotebookEdit" "WebFetch" "WebSearch" \
  2>/dev/null

log ""
log "  ── advisory only; push proceeds regardless. (AI_REVIEW=0 to disable) ──"
log ""

exit 0
