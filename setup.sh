#!/usr/bin/env bash
# Legacy convenience entry. Node is the only installation implementation.
set -eu
exec node "$(cd "$(dirname "$0")" && pwd)/scripts/loci-install.js" "$@"
