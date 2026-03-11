# Privacy & Data Protection

## Philosophy

**Default: convenient. Optional: secure.**

Loci stores your entire life context — identity, goals, finances, contacts, decisions. This data is sensitive. But forcing encryption on every user would kill adoption. So Loci takes a layered approach: basic protection is automatic, advanced protection is opt-in.

> The trade-off is explicit: more privacy = more friction. You choose where on the spectrum you want to be.

---

## Layer 0: Structural Safety (Default, Zero Config)

Every Loci user gets this automatically. No setup needed.

### .gitignore

Pre-configured to exclude personal content directories (`me/`, `finance/`, `people/`, daily plans, journals). Only structure files (README.md, templates, CLAUDE.md) are tracked by default. After onboarding, your real data stays local.

> **Important**: Clone, don't fork. If you fork, your fork is public. Set it to private immediately.

### Data Classification Tags

Every file can have sensitivity metadata in its frontmatter:

```yaml
---
sensitivity: high    # high / medium / low / public
ai-context: deny     # allow / summary-only / deny
---
```

Default sensitivity by directory:

| Directory | Default Sensitivity | Default AI Context |
|-----------|--------------------|--------------------|
| `me/` | medium | allow |
| `finance/` | high | deny |
| `tasks/` | low | allow |
| `people/` | high | summary-only |
| `content/` | low | allow |
| `decisions/` | medium | allow |
| `references/` | low | allow |

---

## Layer 1: AI Context Control (Opt-in)

The biggest privacy concern: **when the AI reads your files, the content is sent to the API provider** (e.g., Anthropic for Claude Code).

### Option A: File-Level Deny (Zero Dependency)

Use Claude Code's built-in `permissions.deny` to block the AI from reading sensitive files:

```json
// .claude/settings.json
{
  "permissions": {
    "deny": [
      "Read(./finance/**)",
      "Read(./people/**)",
      "Read(./.env*)",
      "Read(./.loci-secrets/**)"
    ]
  }
}
```

The AI physically cannot read these files. Simple, effective, zero dependency.

### Option B: Tool-Gated Access (Recommended for Power Users)

The AI can't read sensitive files directly, but it CAN call a local tool that processes the data and returns only what's needed.

```
Cloud LLM (Claude)
  → "What's my budget situation?"
  → Calls local tool: query_finance()
  ↓
Local MCP Server (on your machine)
  → Reads finance/budget.md (locally, never sent to API)
  → Processes: "Monthly budget: 80% used, 20% remaining"
  → Returns ONLY the summary
  ↓
Cloud LLM receives: "You've used 80% of your monthly budget"
  (Never sees: account numbers, balances, transaction details)
```

How it works:
1. `permissions.deny` blocks direct file access
2. A local MCP server has read access to sensitive files
3. The server processes queries locally and returns only sanitized results
4. The LLM gets useful answers without seeing raw sensitive data

### Option C: Local LLM Security Proxy (Maximum Privacy)

Route all sensitive data operations through a local LLM. Cloud LLM never touches sensitive content.

```
Cloud LLM (Claude)
  → Detects sensitive query
  → Calls tool: secure_query()
  ↓
Local LLM (Ollama on your Mac Mini / local machine)
  → Reads encrypted files locally
  → Processes with full context
  → Returns sanitized result
  ↓
Cloud LLM receives: processed, safe result
```

This gives you the intelligence of a cloud LLM with the privacy of a local one. Your Mac Mini (or any local machine) acts as the "secure enclave" for your memory.

Requirements:
- A machine that can run local LLMs (e.g., Mac Mini with 48GB RAM)
- Ollama or similar local LLM runtime
- Loci's security proxy MCP server (planned for v2)

---

## Layer 2: Encryption at Rest (Opt-in)

Protects against device theft/loss.

### Option A: Encrypted Disk Image (Recommended — Simplest)

```bash
# macOS
hdiutil create -size 2g -encryption AES-256 -fs APFS \
  -volname "LociVault" ~/loci-vault.dmg

# Mount when using Loci
hdiutil attach ~/loci-vault.dmg
# Your Loci data lives inside the encrypted volume

# Auto-locks when you close the lid or shut down
```

- Zero dependency (macOS native)
- Transparent to AI tools (mounted = normal files)
- Locked when laptop is off or stolen

### Option B: File-Level Encryption (Advanced)

Using `age` (single binary, no dependencies):

```bash
# Encrypt sensitive files
age -p finance/assets.md > finance/assets.md.age

# Decrypt temporarily when needed (pipe to stdout, never written to disk)
age -d finance/assets.md.age
```

Git tracks `.age` files only — encrypted at rest, decrypted on demand.

---

## Layer 3: High-Threat Mode (Journalists, Activists)

For users who cannot risk any data leaving their machine:

```yaml
# .loci/config.yml
paranoid_mode: true
ai:
  provider: local
  model: llama3.3:70b
  remote_api: disabled
sync:
  method: local_only    # or Syncthing P2P
  cloud: disabled
encryption:
  method: vault
  auto_lock: 5m
```

- All AI processing happens locally (Ollama)
- No data ever leaves your machine
- Full disk encryption + encrypted vault
- Documented but not the default path

---

## Comparison with Other Tools

| Feature | Loci | ChatGPT Memory | Mem0 | Cursor |
|---------|------|----------------|------|--------|
| Data stays local | Yes (default) | No (OpenAI servers) | No (their API) | Partial |
| Encryption at rest | Optional (vault) | No control | No control | No |
| AI context filtering | Yes (deny + tools) | No | No | No |
| Sensitivity tags | Yes (frontmatter) | No | No | No |
| Local LLM option | Yes (Ollama) | No | No | No |
| Portable/migratable | Yes (copy folder) | No | No | No |
| Open source | Yes | No | Partial | No |

---

## What Loci Does NOT Do

- **Does not encrypt by default** — convenience first, security opt-in
- **Does not prevent AI API transmission** unless you configure `permissions.deny` or use local LLM
- **Does not guarantee zero data retention** — that depends on your AI provider's policies
- **Does not replace full-disk encryption** — use FileVault / LUKS as your baseline

---

## Quick Setup Guide

### "I just want basic protection" (2 minutes)

1. `.gitignore` is already configured to exclude personal data directories
2. Done. Your personal data won't accidentally leak via Git.

### "I want AI context control" (5 minutes)

1. Add `permissions.deny` rules to `.claude/settings.json`
2. Tag sensitive files with `sensitivity: high` and `ai-context: deny` in frontmatter
3. Done. The AI can't read your sensitive files.

### "I want encryption" (10 minutes)

1. Create an encrypted disk image
2. Move your Loci data directory into it
3. Done. Device theft = encrypted blob, not your life story.

### "I need maximum privacy" (30 minutes)

1. Install Ollama + a local model
2. Set `paranoid_mode: true` in config
3. Disable all remote API access
4. See Layer 3 documentation above
