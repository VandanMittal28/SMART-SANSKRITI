# Yatrik master art and motion direction

Status: character design approved externally and handed to Pulkit. This document defines how the approved character behaves inside Sanskriti AI; it does not replace or redraw the approved character.

## Personality

- Warm travel companion, never a lecturer or mascot advertisement.
- Curious and quietly magical; celebrates discovery without blocking the user.
- Heritage-aware through materials and colour, not through costume stereotypes.
- Captions remain the source of truth whenever narration is unavailable or muted.

## Product palette

| Role | Colour | Usage |
| --- | --- | --- |
| Heritage gold | `#EFC566` | Target rings, rewards, important borders |
| Yatrik teal | `#55C7B6` | Guidance, captions, live status |
| Midnight | `#07101C` | Speech bubbles and HUD surfaces |
| Parchment | `#F7EAD1` | Primary readable text |
| Ember | `#D99B44` | Celebration gradients and landing warmth |

The approved character art keeps its own authored colours. The interface palette surrounds it and must not recolour exported frames at runtime.

## State and pose contract

| State | Intent | Required readable silhouette |
| --- | --- | --- |
| `idle` | Available, calm | Floating neutral pose, eyes toward content |
| `fly-in` | First arrival | Directional movement from upper-right toward landing point |
| `landing` | Settle into product | Compressed anticipation followed by soft float |
| `talking` | Narration/caption active | Open gesture and visible mouth/face variation |
| `listening` | Chat input active | Attentive forward lean, hands quiet |
| `pointing` | Route or scan guidance | One unambiguous directional arm/gesture |
| `celebrating` | XP, badge, completion | Upward energy without leaving safe bounds |
| `muted` | Audio disabled | Calm pose with a readable mute cue; never appears sad |

Front and three-quarter variants should use the same canvas, registration point, and character scale.

## Fly-in and landing storyboard

1. `0-250ms`: Yatrik enters from the upper-right at 35% scale with a short teal/gold trail.
2. `250-850ms`: curved deceleration toward the centre landing point; face becomes readable before the caption appears.
3. `850-1,150ms`: landing squash limited to 6% so the character remains premium rather than rubbery.
4. `1,150-1,550ms`: settle into a two-pixel-equivalent float; Continue becomes enabled.
5. After Continue: transition to `talking`, play narration when available, and keep the exact caption visible.

Reduced-motion mode skips travel and shows the settled landing pose immediately.

## Speech bubble

- Midnight translucent surface, 16-24px corner radius, one-pixel gold border at 25% opacity.
- Yatrik teal eyebrow label; parchment body copy.
- Maximum two lines on the movable companion and two to three lines inside Explore.
- Bubble flips left or right according to the character position and never crosses a 16px screen gutter.
- Caption remains visible even when muted or audio playback fails.

## Mobile placement

- Global companion: 104px default canvas, above bottom navigation, draggable within an 8px horizontal and safe-area-aware vertical boundary.
- Welcome: 220px canvas centred above the welcome card; no separate floating companion during the scene.
- Explore: companion remains above the live camera layer; caption is repeated inside the mission HUD for accessibility.
- Chat: floating companion is hidden because the conversation owns the full screen.
- Login/authentication: companion is hidden until profile creation succeeds.

## Pulkit export handoff

- Transparent WebP preferred; PNG is acceptable when WebP introduces edge artefacts.
- Use a consistent 512x512 canvas unless the approved source sheet requires a larger square canvas.
- Do not crop glow, turban, pointing hand, or celebration particles between frames.
- Name frames sequentially inside versioned state folders and list public paths in `public/yatrik/manifest.v1.json`.
- Keep the anchor point visually stable at the centre-bottom of the canvas.
- Validate every frame against dark midnight and light neutral backgrounds before delivery.
