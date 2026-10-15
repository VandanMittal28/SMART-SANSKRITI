# Sanskriti AI — project context for logo design

A self-contained brief. Paste the whole thing into Gemini (or any design tool)
before asking for logo concepts.

---

## 1. What this is

**Sanskriti AI** is a mobile app for visiting India's heritage monuments.
*Sanskriti* (संस्कृति) is Sanskrit/Hindi for **culture** — the inherited,
still-living kind, not the museum kind.

Tagline in use: **"Discover India's Living Heritage."**

It ships as a native **iOS and Android** app. A visitor opens it while
physically standing at a monument: it identifies what they are looking at,
guides them around it, narrates its history in their language, and lets them
support the craftspeople who live around it.

There is also a second, separate product for the people who *look after* the
site — a **Monument Management System** used by site admins and ground staff.

## 2. Who uses it

| | |
|---|---|
| **Visitors** | Indian and international tourists, on foot, outdoors, often in bright sun and with patchy signal |
| **Students** | There is a dedicated "Student mode"; the app teaches through quizzes and hunts |
| **Site staff** | Admins and ground officers handling incidents through the management console |
| **Artisans** | Local craftspeople listing work in the in-app marketplace |

## 3. What the app actually does

**Identify and understand**
- Point the camera at a monument and an AI model names it and explains it
- An AI companion called **Yatrik** answers questions about what you are seeing
- Audio guides narrate monuments aloud, with native text-to-speech
- "Time travel" imagery shows each monument across four eras: construction,
  peak glory, colonial, modern

**Navigate and explore**
- Augmented-reality walking guidance around a monument's grounds: a compass
  arrow over the live camera leads you from zone to zone
- The Taj Mahal route alone has 19 waypoints, each with its own story
- Maps, geofenced arrival, and XP awarded for reaching each zone

**Play and learn**
- Quizzes, a location-based heritage hunt, badges, XP, levels, a leaderboard

**Plan and transact**
- Official ticket prices for 25 monuments, itinerary planning, festival calendar
- A marketplace for local crafts and artisan workshops, with real payments
- Sustainability guidance for low-impact visiting

**Protect the site**
- **Heritage Watch**: with the visitor's explicit permission, the camera they
  already have open for AR watches for damage to the monument — someone
  marking a wall, climbing on carvings, a fire. It detects on-device, confirms
  with a vision model, and sends it to site staff for a human to verify.
  It identifies no one, and never triggers a penalty by itself.

**Reach**
- **23 languages**, including Hindi, Arabic, Japanese, French, German, Hebrew
- Works **fully offline** — the entire app is packaged inside the phone,
  because connectivity at a monument is unreliable

## 4. What makes it distinct

It is not a travel-booking app and not an encyclopedia. It is a **companion for
the moment you are standing in front of something old and significant** — it
answers "what am I looking at, why does it matter, and where do I go next."

The tone we have built is **warm, confident and quietly premium** — it respects
the monuments without being solemn or dusty about them. It is modern software
pointed at ancient things.

## 5. The visual system the logo must live inside

We recently rebuilt the entire interface. The logo has to belong to it.

**Colour** — one bright accent, everything else neutral:

| Role | Hex |
|---|---|
| Accent (the brand colour) | `#F6C00A` — a saturated marigold amber |
| Ink / primary text | `#181A13` — near-black, slightly warm |
| Secondary | `#494B45` — warm slate |
| Canvas | `#F2F2F4` — off-white |
| Card | `#FFFFFF` |
| Dark canvas | `#121410` |

Amber is used sparingly: one action per screen. It is the only saturated colour
in the product.

**Type** — **Clash Display** for headings (a geometric grotesque: tight,
confident, slightly condensed) and **Manrope** for body text.

**Form language** — very rounded. Cards use a 28px radius, buttons and chips
are full pills. Shadows are wide and soft, never hard. Lots of white space.
Photography is used large and edge-to-edge.

**Themes** — full light and dark. The amber is identical in both.

## 6. Where the logo appears

1. **iOS/Android app icon** — the primary use. A rounded square, seen at
   60×60pt on a home screen among other apps.
2. **In-app top bar** — rendered at 40×40px inside a white rounded square,
   next to the wordmark "Sanskriti AI"
3. **Login screen** — at 42px over a photograph of monuments, on a
   translucent white tile
4. Favicon, splash, and eventually store listings

### Hard constraints

- Must read at **24px** — no fine linework, no thin strokes
- Must work on **white, on near-black, and over a photograph**
- Must work in **flat single colour** (ink on light, white on dark) as well as
  in amber
- Square-safe: no part of it can rely on the canvas edges
- No text inside the mark — the wordmark sits beside it

## 7. Direction

**Evoke**: a guide, a landmark, a doorway, a flame, a compass, a threshold,
Indian architectural geometry (the jali lattice, the arch, the dome, the
chhatri), a point of light at a place worth standing.

**Feel**: warm, assured, contemporary, unfussy. Geometric rather than
illustrative. It should look at home next to Clash Display.

**Avoid**:
- Literal Taj Mahal silhouettes — the app covers many monuments, and it is the
  obvious cliché
- Tourist-brochure saffron/green/white nationalism
- Gradients, bevels, glows, or anything skeuomorphic
- Ornate filigree that collapses at small sizes
- Generic "AI" tropes: neural-net nodes, circuit traces, glowing orbs, sparkles
- Camera/lens iconography — too literal, and it reads as a photo app

**Note on what exists now**: the current mark is a gold gradient circle with a
flame/diya motif and animated spinning rings. It is being replaced because it
is detailed, gradient-dependent, and belongs to the old dark-and-gold theme.
The new one should be flatter, bolder and legible at a glance.

---

## Prompt to paste into Gemini

> You are an expert brand identity designer. Read the brief above about
> Sanskriti AI.
>
> Design an **app icon / logo mark** for it. Give me **five distinct concepts**.
> For each, describe: the core idea in one sentence, the geometry in enough
> detail that a designer could draw it, why it suits this product, and how it
> behaves at 24px.
>
> Constraints: flat vector, no gradients, no text in the mark, legible at 24px,
> works in a single flat colour as well as in amber `#F6C00A` on `#181A13`,
> square-safe for a rounded-square app icon, and visually at home with the
> geometric typeface Clash Display.
>
> Do not use a Taj Mahal silhouette, a camera lens, or generic AI motifs.
>
> Then recommend one concept and explain the trade-off against the runner-up.
