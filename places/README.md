# places/ — Locations That Matter

Your home, offices, campuses, favorite spots, client addresses — one `.md` per place.
They show up on the people-page map, right next to your contacts, and in the
「位置」board of the people page.

## Format

```markdown
---
name: Sydney Uni
type: study          # home | work | study | spot | client | other
address: Camperdown NSW 2006
city: Sydney
lat: -33.888         # optional — map falls back to address/city geocoding
lng: 151.187
people: ["Ada"]      # contact names, must match people/<name>.md `name:` exactly
tags: [campus]
frequency: weekly    # optional, free text
---

Free-form note: what happens here, what to remember.
```

## Rules

- Prefer the Dashboard API (`POST /api/places/add` / `update` / `remove`) over hand-editing.
- Removing a place archives it to `archive/places/` — nothing is deleted.
- Tell your AI "记一下 XX 的地址在 YY" / "remember where X is" and it creates the card for you.
