# Task Pack — Generate default avatars for the "People" page

> Hand this entire file to an image-generation agent. It is self-contained: it explains the
> goal, the exact specs, every prompt, the file-naming convention, and the deliverables.
> The agent does NOT need any other context.

---

## 1. Goal

We need a set of **default / fallback avatar images** for a contacts ("People") page in a clean,
minimal productivity dashboard. When a contact has no uploaded photo, the app should show a tasteful
default avatar chosen by the contact's **category** and **gender**.

We want to compare **4 visual styles**. Generate **all of them**, then we'll pick the best style.

The app's UI is **Clean / minimal, single emerald-green accent** (think Linear / Things / Notion).
So the avatars must be **on-brand: restrained, premium, green-accented — NOT loud, NOT photo-realistic stock photos.**

---

## 2. Contact categories (4)

Contacts are grouped into 4 categories. Each needs a male and a female default → **8 personas**.

| # | Category (zh / en) | Meaning | Persona vibe |
|---|---|---|---|
| 1 | 核心 / Shield · male   | investor / partner   | calm professional businessman, shirt or light suit, confident, approachable |
| 2 | 核心 / Shield · female | investor / partner   | sharp female founder/investor, simple business-casual, composed, confident |
| 3 | 协作 / Neural · male   | tech / developer     | engineer vibe, casual shirt or hoodie, optional glasses, friendly, smart |
| 4 | 协作 / Neural · female | tech / developer     | female developer/designer, simple casual, clever, easy-going |
| 5 | 朋友 / Crew · male     | friend / family      | relaxed casual guy, warm genuine smile, approachable |
| 6 | 朋友 / Crew · female   | friend / family      | warm friendly woman, casual, natural, kind |
| 7 | 关注 / Signal · male   | social / new contact | young energetic man, neutral-casual, polite, slight reserve |
| 8 | 关注 / Signal · female | social / new contact | young woman, fresh neutral-casual, tidy, polite first-impression |

---

## 3. Global constraints (apply to EVERY image, every style)

- **Square 1:1**, centered **head-and-shoulders** portrait.
- **Clean minimal background**: solid off-white `#f6f6f4` (or very light green `#d9f5e9`), generous negative space, croppable to a circle.
- **Color: emerald green accent palette** — `#10b981` and `#34d399` greens + neutral greys. **Single accent color, restrained, NOT colorful/busy.**
- **Consistent across the whole set** — same lighting, same framing, same line weight / rendering, so the 8 read as one coherent family.
- Expression: **friendly, professional, calm** — not exaggerated.
- **No text, no logo, no watermark, no border frames.** Transparent or the specified solid background.

**Reusable English suffix — append to every prompt:**
```
centered head-and-shoulders portrait, square 1:1, clean minimal solid off-white background (#f6f6f4),
emerald green accent palette (#10b981, #34d399) with neutral greys, single restrained accent color,
soft even lighting, generous negative space, consistent cohesive style across the set,
no text, no logo, no watermark, high quality
```

---

## 4. The 4 styles

Generate the 8 personas in **each** of styles A, B, C. Style D is abstract (no face) so it only needs the **4 category images** (no gender split) = 4 images.

Total: 8 + 8 + 8 + 4 = **28 images**.

### Style A · Flat vector illustration  (primary candidate)
Per-image prompt = this stem + the persona + the global suffix:
```
Flat vector illustration avatar of {PERSONA}, modern corporate-memphis / Notion-style flat illustration,
simple geometric shapes, soft rounded forms, minimal facial detail, emerald green + cream palette,
flat colors no gradients, clean and friendly,
```

### Style B · Line-art (monoline)
```
Single-color line-art avatar of {PERSONA}, continuous thin clean strokes, monoline portrait,
emerald green lines on off-white background, very minimal, elegant, no shading, lots of whitespace,
```

### Style C · 3D render / blind-box
```
Cute 3D render avatar of {PERSONA}, soft clay / blind-box toy style, smooth matte materials,
gentle studio lighting, soft shadows, rounded friendly proportions, emerald green accents on neutral,
Pixar-ish but minimal and tasteful, not childish,
```

### Style D · Abstract geometric (NO face)  — 4 images only, one per category
```
Abstract geometric avatar with NO realistic face, minimal symbolic mark for the "{CATEGORY}" relationship type,
composed of simple shapes, dots and arcs, emerald green + greys, like a refined identicon,
calm and professional, single accent color,
```
For D, `{CATEGORY}` = `core / 核心 (investor-partner)`, `collaborator / 协作 (tech)`, `friend / 朋友 (friend-family)`, `watch / 关注 (social)`.

---

## 5. {PERSONA} values to substitute (for styles A, B, C)

1. `a calm professional businessman in a shirt, confident and approachable`
2. `a sharp female founder in simple business-casual, composed and confident`
3. `a friendly male software engineer in a casual shirt or hoodie, optional glasses, smart and warm`
4. `a clever female developer/designer in simple casual wear, easy-going`
5. `a relaxed casual man with a warm genuine smile, approachable`
6. `a warm friendly woman in casual wear, natural and kind`
7. `a young energetic man in neutral-casual wear, polite with slight reserve`
8. `a young woman in fresh neutral-casual wear, tidy and polite`

---

## 6. Deliverable — file naming

Save each image with this exact name so the app can map them. Square PNG, ideally with transparent or `#f6f6f4` background, ~512×512.

```
avatar-{style}-{category}-{gender}.png
  {style}    = a | b | c        (d for the abstract set)
  {category} = core | collab | friend | watch
  {gender}   = m | f            (omit for style d)
```

Examples:
- `avatar-a-core-m.png`   (flat vector, core/investor, male)
- `avatar-b-collab-f.png` (line-art, collaborator/tech, female)
- `avatar-c-friend-m.png` (3D, friend, male)
- `avatar-d-watch.png`    (abstract, watch/social, no gender)

Mapping of persona # → category/gender:
`1→core-m  2→core-f  3→collab-m  4→collab-f  5→friend-m  6→friend-f  7→watch-m  8→watch-f`

---

## 7. Output

Deliver all 28 PNGs named as above. Keep the style internally consistent within each style group.
We will review the 4 style groups and choose one to ship as the People-page default avatars.
```
