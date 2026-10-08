#!/usr/bin/env bash
# Compatibility bootstrap; primary entry: docs/AI-INSTALL.md.
set -eu
if [ -f "$HOME/.loci/brain-path" ]; then
  IFS= read -r brain_root < "$HOME/.loci/brain-path" || true
  if [ -n "${brain_root:-}" ] && [ -f "$brain_root/scripts/loci-context.js" ]; then
    printf '%s\n' "Existing brain: $brain_root. Ask your agent to follow https://github.com/codesstar/loci/blob/main/docs/AI-INSTALL.md to upgrade it."
    exit 0
  fi
fi
command -v node >/dev/null || { printf '%s\n' 'Node.js 18+ required.' >&2; exit 1; }
brain_root="${1:-$HOME/loci}"
git clone --depth 1 https://github.com/codesstar/loci.git "$brain_root"
exec node "$brain_root/scripts/loci-install.js" --brain "$brain_root" --connect auto
