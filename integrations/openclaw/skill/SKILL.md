---
name: loci
description: Use a shared local Loci brain for personal memory, tasks, notes and project context.
version: 0.6.0
---

# Loci entry adapter

Read the existing brain path from `~/.loci/brain-path`, verify it, then read its `LOCI.md`. Resolve `<brain-path>` to that actual directory. Follow its startup preference reader and first-use trigger for `LOCI-RULES.md`; do not maintain another copy of the operation rules here.

If the user asks to install Loci and no brain exists, follow the official `docs/AI-INSTALL.md` from https://github.com/codesstar/loci. Use its Node installer, preserve existing data, and verify access with the current client. Do not initialize personal files by hand or assume that installing this skill connects a client without local tools.
