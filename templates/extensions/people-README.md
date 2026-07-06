# people/ — Contacts & Relationships (Extension Module)

One file per important contact, plus meeting notes and a relationship graph.

## Files
- `firstname-lastname.md` — Contact profile (use person template)
- `meetings/YYYY-MM-DD-description.md` — Meeting notes
- `.connections.json` — Relationship edges between contacts (drawn in the dashboard graph)

## Frontmatter
Every contact file should have: name, relation, tags, last_contact, created

## Two kinds of "relationship" — don't mix them up
- `relation:` (frontmatter) — this person's relationship **to the user** (friend / client / mentor…). One per person; drives the dashboard category.
- `.connections.json` — relationships **between two contacts** ("kk is Asher's friend"). Undirected edges, any number:

```json
{ "edges": [ ["kk", "Asher", "friends"], ["A", "B"] ] }
```

Names must exactly match each person's `name:` field. When the user mentions that two contacts know each other, record the edge too — via the Dashboard API (`POST /api/people/connect` with `{a, b, how}`) when the server is running, or by editing the JSON directly. Both people must already have a `people/<name>.md`; create the missing one first.
