# WiseCare Tailwind Migration Map

## Baseline inventory

- 19 JSX files across the app shell, shared dialogs/navigation, and therapist/admin/patient pages.
- `src/index.css`: 2,633 lines before migration, approximately 386 selectors and six responsive blocks.
- 1,122 inline-style objects and 829 class-name usages before migration.
- `src/App.css` is legacy and is not imported.
- Existing runtime: React 19, Vite 8, Lucide icons, one shared RTL stylesheet.

## Surface map

| Surface | Primary files | Migration responsibility |
|---|---|---|
| App shell | `App.jsx`, `Sidebar.jsx` | responsive rail, mobile topbar, content canvas, focus order |
| Shared controls | `index.css`, modal/toast components | tokens, buttons, inputs, tables, overlays, states |
| Therapist workspace | `ClientsPage.jsx`, `AppointmentsPage.jsx`, `SettingsPage.jsx` | dense tables/forms, responsive actions |
| Therapeutic library | `ContentLibraryPage.jsx` | persistent resource table, filters, assignment drawer/modal |
| Patient portal | `ClientPortalPage.jsx` | compact content feed/detail, safe areas, 48px targets |
| Authentication/onboarding | `TherapistLoginPage.jsx`, `JoinPage.jsx` | readable forms, validation, narrow layouts |
| Platform administration | `SuperAdminPage.jsx` | high-density tables, panels, modal consistency |
| Shared dialogs | `ClientModal.jsx`, `ClientDetailsModal.jsx`, `ConfirmModal.jsx`, `PrivacyPolicyModal.jsx`, `SuperAdminLoginModal.jsx` | modal shell, labels, keyboard/focus behavior |

## Execution order

1. Install Tailwind v4 through the Vite plugin and expose the WiseCare color, font, radius, and shadow tokens.
2. Migrate the app shell and shared primitives first so every route receives the new hierarchy and interaction states.
3. Refine the therapeutic library into a dense table plus an explicit assignment workflow.
4. Reduce and refine patient content cards for phone and deep-link entry.
5. Remove inline styles from shared/chrome components, then page-local inline styles in decreasing usage order.
6. Validate build, lint, keyboard focus, reduced motion, RTL, and responsive layouts at 375, 768, 1024, and 1440px.

## Acceptance matrix

| Check | Desktop | Mobile |
|---|---|---|
| RTL order and alignment | 1440x1024, 1024x768 | 390x844, 375x812 |
| Navigation | sticky rail, selected state | drawer, overlay, safe-area close |
| Tables | no clipped actions, visible row focus | horizontal wrapper or compact row mode |
| Forms/modals | labels, inline errors, focus ring | keyboard-safe scroll, 48px actions |
| Motion | stable hover, no layout shift | pressed feedback, reduced motion |
| Patient deep link | direct item state preserved | content visible without oversized chrome |

## Guardrails

- Do not change API behavior, stored clinical data, URLs, or user-visible copy as part of the style migration.
- Do not trigger outbound WhatsApp messages during visual QA.
- Keep legacy CSS only where it represents a complex state that has not yet been converted; every new or touched shared primitive uses Tailwind tokens/utilities.
- A passing production build, lint, and read-only browser smoke suite are required before handoff.

## Implemented in this pass

- Tailwind CSS v4 and the official Vite plugin are installed and compiling.
- WiseCare semantic tokens are available to utilities and shared CSS.
- All major route pages are lazy-loaded behind a shared accessible loading state.
- The therapist shell, sidebar, summary strips, buttons, tables, modal foundations, PWA banner, and theme palettes were normalized to the new visual system.
- The therapeutic-library editor uses accessible tabs and code-native Lucide icons; the patient-assignment flow is a desktop drawer and mobile bottom sheet.
- A shared-content deep link now prioritizes the selected content above the fold and removes authoring controls for a therapist-managed patient.
- The unused legacy `App.css` file was removed.
- Playwright smoke coverage now includes the library, assignment drawer, clients, appointments, settings, and patient deep-link viewport at desktop, 390px, 375px, and landscape.

## Remaining conversion debt

- 1,070 page-local inline style objects remain, mostly inside the large SuperAdmin, patient portal, settings, onboarding, and appointment screens. They are intentionally left functional and mapped for progressive conversion instead of being mechanically rewritten in a risky bulk change.
- `index.css` remains the compatibility layer for existing semantic classes. New and touched shared primitives use the Tailwind token system; future feature work should continue moving page-local declarations into utilities/components.
- Current lint exits successfully but reports pre-existing unused-code and React-hook warnings in large legacy pages. These are outside the visual migration and should be resolved in a dedicated behavior-safe cleanup pass.
