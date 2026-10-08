# Personalization

Put short standing preferences—name, language, tone and workflow—in `me/preferences.md`. This is the source read by both hooks and the startup fallback. Keep it concise; long preferences may be truncated at startup and require an additional read.

Stable facts belong in `me/identity.md`, values in `me/values.md`, and goals in `plan.md`. Actual content is read when relevant. User-specific notes stay in data files; `LOCI.md` and `LOCI-RULES.md` are the maintained product entry and operation manual and may be replaced during upgrades.

Host-specific instructions may live outside Loci’s marked block in the client instruction file. Installation preserves that surrounding text. Avoid conflicting copies of task, scrap or project routing rules; refer to [the manual](../LOCI-RULES.md).

For custom modules, start with a template under `templates/extensions/` and document its data format. The [architecture guide](architecture.md) explains the loading boundaries.
