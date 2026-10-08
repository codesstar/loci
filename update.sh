#!/usr/bin/env bash
set -eu
exec node "$(cd "$(dirname "$0")" && pwd)/scripts/loci-update.js" "$@"
