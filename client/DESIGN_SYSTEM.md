## Terrene OS Design System

This document captures the cloned visual language from the Terrene reference project (`CGMWTAUGUST2025`) and how it now powers the HelpDesk Mini interface. Every primitive mirrors the original build so the product feels authored by the same studio.

### Core palette

| Token | Value | Purpose |
|-------|-------|---------|
| `--base-100` | `rgb(242, 237, 230)` | Primary text, button labels, highlight strokes |
| `--base-200` | `rgb(204, 200, 194)` | Secondary text, muted links |
| `--base-250` | `rgb(179, 167, 152)` | Icons, tertiary text |
| `--base-300` | `rgb(153, 143, 130)` | Divider accents, quiet labels |
| `--base-350` | `rgb(128, 119, 108)` | Ghost surfaces, subtle pills |
| `--base-400` | `rgb(102, 95, 86)` | Elevated borders |
| `--base-450` | `rgb(31, 29, 29)` | Glass panel base tone |
| `--base-500` | `rgb(20, 19, 19)` | Global canvas |

Accent gradients:

* `--accent-rose` → spotlight and destructive cues.
* `--accent-amber` → trend highlights, workload alerts.
* `--accent-emerald` → positive status, SLA health.
* `--accent-blue` → neutral info, queues, meta badges.

Surface stack (lifted from the reference hero/cards):

* `--surface-glass` (8% opacity) — nav, trays, floating menus.
* `--surface-raised` (14% opacity) — application cards, modals.
* `--surface-muted` (6% opacity) — inline chips, table headers.

### Typography

* Sans: **Manrope** (`--font-sans`) for headings and body copy, letter-spacing tightened to match the portfolio site.
* Mono: **DM Mono** (`--font-mono`) for eyebrows, stats, and system metadata.
* Font sizing uses `clamp()` breakpoints identical to the reference hero and section headers.

### Spatial rhythm

* Eight-point grid: `--space-1` (0.25rem) through `--space-8` (4rem).
* Container width: `min(1120px, 92vw)` maintains the reference grid balance.
* Section padding: `clamp(3rem, 10vw, 6rem)` to preserve rhythm on every breakpoint.

### Form and depth

* Radii: `0.75rem` core, `1.5rem` cards, pill buttons for CTAs.
* Shadow stack copies the reference: `var(--shadow-soft)` for cards, `var(--shadow-ambient)` for lifted states, luminous focus halo (`var(--shadow-focus)`).

### Motion grammar

* Timing curves mirror the original Next.js build (`--transition-fast`, `--transition-smooth`, `--transition-airy`).
* Keyframes ported: `fadeIn`, `pulse`, `slideInRight`, `drift`, and `shimmer` for skeletons.
* Hover and focus interactions apply gentle translateY shifts with glow overlays—identical to the `AnimatedButton` and card animations from the reference.

### Component patterns

* **Navigation bar** – Sticky glass header, pill tabs, mono brand mark.
* **Buttons** – `.primary` (glass gradient), `.ghost` (outlined blur), `.secondary` (tinted fill). All share pill geometry and animated glows.
* **Cards** – Gradient overlays with dual-border treatment, matching `FeaturedProjects` and `Gallery` modules.
* **Badges** – Transparent accent fills mapped to SLA status colors.
* **Forms** – Dark glass with inlay focus and luminous halo for accessibility.
* **Toasts** – Glass-backed notifications sliding from the edge with icon prefixes.

### Layout principles

* Auto-fit grids at 280–320px sustain equilibrium, just like the reference blueprint sections.
* Alignment pairs: leading text left-aligned, supporting metrics right-aligned (hero stats, testimonials).
* Breakpoints at `960px` and `720px` reposition nav, CTAs, and stats as in the reference site.

### Accessibility

* Contrast between text and canvas ≥ 8:1.
* Focus states are non-suppressible and luminous.
* Skip link styled per reference, visible on focus.
* Animations rely on CSS transitions—no motion traps.

### Implementation checklist

1. Import `src/styles.css` (already wired in `main.tsx`).
2. Compose layouts with `.container`, `.landing-section`, `.card`, `.hero-stat`, `.badge`, etc.
3. Reuse spacing tokens and button variants to keep every new surface consistent with the Terrene look and feel.

This design system now drives the authenticated interface and the new landing page, delivering a cohesive Terrene OS experience across the product.
