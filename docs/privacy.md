# Privacy and local data

Loci stores Markdown, JSON and attachments locally. It does not require a cloud memory database. The selected agent may send retrieved content to a model provider; local storage does not mean offline inference.

The installer disables pushing to the original public `codesstar/loci` remote for a newly cloned personal brain. This is an accidental-push guard, not encryption or an access-control boundary. Review files and remote configuration before any backup or publication; use a destination whose access you have checked.

Installation/update backups under `.loci/backups/` can contain private instructions and configuration. Keep them private. Upgrades manage only engine files; user data is excluded. See [installation and rollback](AI-INSTALL.md).

Sensitive or ambiguous memory changes need confirmation under [the operation manual](../LOCI-RULES.md). These are agent instructions, not a technical privacy sandbox. Use the agent’s own permissions and the operating system’s file protections for enforced boundaries.
