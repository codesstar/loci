#!/usr/bin/env bash
# Compatibility wrapper; pwd -W keeps native Node paths valid in Git Bash.
set -eu
script_dir="$(cd "$(dirname "$0")" && (pwd -W 2>/dev/null || pwd))"
exec node "$script_dir/scripts/loci-update.js" "$@"
