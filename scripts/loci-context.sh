#!/usr/bin/env bash
# Compatibility wrapper. One context implementation on every platform.
set -eu
brain_root="${1:-$(cd "$(dirname "$0")/.." && (pwd -W 2>/dev/null || pwd))}"
if command -v cygpath >/dev/null 2>&1; then brain_root="$(cygpath -m "$brain_root")"; fi
exec node "$brain_root/scripts/loci-context.js" "$brain_root" "${2:-${LOCI_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}}"
