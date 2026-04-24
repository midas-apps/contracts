#!/usr/bin/env bash
# Resolves the two root-level submodules and nested Foundry deps, then applies
# a small import patch in `lib/save` for Hardhat (HH415).
#
# Why two top-level submodules:
#   - `lib/save` — llama-risk/save; OZ v5, forge-std, and a nested chainlink
#     copy are pulled with `git submodule update --init --recursive`.
#   - `lib/chainlink-evm` — smartcontractkit/chainlink-evm. Required at repo
#     root: `remappings.txt` maps `@chainlink/contracts/` to
#     `lib/chainlink-evm/contracts/` (IReceiver, etc.); that path is *not* the
#     same as `lib/save/lib/chainlink-evm/...` used by save's own build.
# OpenZeppelin for Hardhat: `remappings.txt` points at
#   `lib/save/lib/openzeppelin-contracts/contracts/`
#   so a separate root `lib/openzeppelin-contracts` is not used.
#
# Run:
#   ./scripts/setup-foundry-submodules.sh
#   yarn compile
#
# `forge` on PATH is not required to run this script; it is needed for
# `forge remappings` / @nomicfoundation/hardhat-foundry when you compile.
#
# Ref: docs/superpowers/specs/2026-04-23-save-cre-receiver-proxy-mainnet-deploy-design.md
#
# HH415: `IReceiver.sol` imports `@openzeppelin/contracts@5.0.2/...` while
# upstream save uses plain `@openzeppelin/contracts/...`. If both prefixes
# map to the same on-disk file, Hardhat errors with
# "Two different source names ... resolve to the same file". We unify the
# Save .sol files to the `@5.0.2` import style to match IReceiver.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if ! command -v forge >/dev/null 2>&1; then
  echo "warning: 'forge' not on PATH. Install Foundry for Hardhat compiles: https://getfoundry.sh" >&2
fi

mkdir -p lib

# Register in .gitmodules only if missing. After a normal clone, entries exist
# and we must NOT run `submodule add` again (use update instead).
if ! git config --file .gitmodules --get 'submodule.lib/save.path' &>/dev/null; then
  git submodule add --depth=1 \
    https://github.com/llama-risk/save \
    lib/save
fi
if ! git config --file .gitmodules --get 'submodule.lib/chainlink-evm.path' &>/dev/null; then
  git submodule add --depth=1 \
    https://github.com/smartcontractkit/chainlink-evm \
    lib/chainlink-evm
fi

git submodule update --init --recursive

patch_save_for_hardhat() {
  local proxy="lib/save/contracts/src/save-cre-receiver-proxy/SaveCreReceiverProxy.sol"
  local abs="lib/save/contracts/src/abstracts/AbstractCreReceiver.sol"
  if ! grep -q '@openzeppelin/contracts@5.0.2/access/Ownable2Step' "$proxy" 2>/dev/null; then
    if sed --version 2>&1 | grep -q GNU; then
      sed -i 's|@openzeppelin/contracts/access/|@openzeppelin/contracts@5.0.2/access/|' "$proxy"
      sed -i 's|@openzeppelin/contracts/utils/|@openzeppelin/contracts@5.0.2/utils/|' "$abs"
    else
      sed -i '' 's|@openzeppelin/contracts/access/|@openzeppelin/contracts@5.0.2/access/|' "$proxy"
      sed -i '' 's|@openzeppelin/contracts/utils/|@openzeppelin/contracts@5.0.2/utils/|' "$abs"
    fi
    echo "Applied Hardhat HH415 import unification patch to lib/save/contracts/..."
  else
    echo "Patch already applied (import paths use @5.0.2)."
  fi
}

patch_save_for_hardhat

echo
echo "Done. Verify with: yarn compile"
