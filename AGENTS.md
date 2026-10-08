# Loci repository / brain entry

Read `LOCI.md` in this directory; resolve `<brain-path>` to this directory when it is the user's installed brain. Before Loci memory operations, read `LOCI-RULES.md` in full once and use its current rules.

When the user is developing Loci itself, treat the personal-data files shipped here as templates. Do not initialize this checkout as their personal brain, run onboarding, or connect global agent settings unless asked. Use temporary brains and an explicit `--home` for installation tests. Preserve unrelated changes and test changed behavior with `node --test tests/*.test.js`.
