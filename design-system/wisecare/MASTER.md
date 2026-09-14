# WiseCare Design System

This file is the visual contract for the Tailwind migration. Page-specific files may refine layout, but they may not replace these tokens or interaction rules without an explicit design decision.

## Product direction

- Product: an RTL clinical workspace for an independent therapist and a focused mobile portal for patients.
- Character: calm clinical confidence, warm but not decorative, information-dense without visual pressure.
- Density: desktop 8/10; patient mobile 5/10.
- Copy lock: preserve current product labels and clinical copy. Do not add marketing claims, fake metrics, or decorative UI text.
- Structure: prefer open tables, lists, rails, and toolbars. Use cards only for a real grouped object or patient-facing content item.

## Tokens

| Role | Value |
|---|---|
| Brand 600 | `#0d9488` |
| Brand 700 | `#0f766e` |
| Sidebar | `#053f3b` |
| Canvas | `#f4f9f8` |
| Surface | `#ffffff` |
| Primary text | `#101c24` |
| Body text | `#1d2a30` |
| Muted text | `#51636b` |
| Border | `#dbe7e6` |
| Success | `#10b981` |
| Warning | `#f59e0b` |
| Danger | `#dc2626` |
| Focus ring | `rgba(13, 148, 136, 0.34)` |

- Fonts: `Assistant` for UI and body; `Rubik` for headings. Use system fallbacks when remote fonts are unavailable.
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48px.
- Control radius: 12px. Surface radius: 16px. Large modal radius: 20px.
- Desktop control height: at least 40px. Mobile touch target: at least 48px.
- Shadows: restrained and cool. Borders establish hierarchy before shadows.
- Icons: Lucide outline only, 1.75–2px stroke, 16/20/24px optical sizes. No emoji as structural icons.

## Component contract

- Primary button: solid Brand 700, white label, no gradient, stable hover with color/elevation only.
- Secondary button: white or transparent surface, one-pixel border, dark label.
- Inputs: visible label, 44px minimum height, cool border, explicit hover/error/focus states.
- Tables: sticky-capable header, 48–56px rows, calm dividers, row hover, clear selected state, actions grouped consistently.
- Cards: white, one-pixel border, 16px radius, low shadow; never make every section a card.
- Modal/drawer: strong scrim, bounded width, sticky action footer when content can scroll, close control with an accessible name.
- Sidebar: 256–272px desktop, deep teal, one selected treatment, no layout-moving hover.
- Patient content: a compact single-column item with media, title, therapist note, metadata, and one primary consumption action.

## Motion and accessibility

- Use 150–220ms transitions for hover/focus/open states; never animate table rows on load.
- Respect `prefers-reduced-motion` and disable non-essential movement.
- Text contrast must be at least 4.5:1; meaningful controls and icons at least 3:1.
- Every icon-only control needs an accessible name. Decorative icons beside visible text are hidden from assistive technology.
- Mobile content must respect safe-area insets and must not be hidden by sticky navigation.

## Reference concepts

- `concepts/admin-dashboard.png`
- `concepts/content-library.png`
- `concepts/patient-portal-mobile.png`

The concept imagery is layout and visual-system guidance. Real application text and controls remain code-native.
