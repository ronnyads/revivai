# Design System: RevivAI Premium Client Surfaces

## 1. Visual Theme & Atmosphere
A cinematic tech-noir language with editorial scale, disciplined spacing, and a single cyan signal accent. The product should feel like a luxury restoration lab and a creative operating system at the same time, not a generic SaaS template. Depth comes from tonal layering, soft glow fields, and sharply controlled typography.

## 2. Color Palette & Roles
- **Obsidian Base** (`#0E0E0E`) - main page canvas
- **Deep Surface** (`#131313`) - section background and large panels
- **Raised Surface** (`#1B1B1B`) - cards, trays, and utility panels
- **Bright Surface** (`#2A2A2A`) - hover state and elevated controls
- **Signal Cyan** (`#00ADCC`) - primary CTA, progress, active nav, focus state
- **Cyan Glow** (`#54D6F6`) - gradients, highlights, and luminous accents
- **Mist Ink** (`#E2E2E2`) - main text
- **Muted Steel** (`#BCC9CD`) - supporting text
- **Ghost Line** (`#3D494D`) - subtle separators and structural edges

## 3. Typography Rules
- **Display:** Space Grotesk - bold, tight, confident, editorial
- **Body:** Manrope - calm, clear, high-readability
- **Label:** IBM Plex Mono - all technical chips, tabs, counters, and system status
- **Behavior:** Use mono labels for instrumentation, keep display tightly tracked, avoid playful weights

## 4. Component Stylings
- **Buttons:** cyan fill or cyan gradient for primary, dark ghost pills for secondary
- **Navigation:** translucent obsidian bars with mono labels and a cyan underline for the active state
- **Cards:** dark tonal panels with low-contrast edges; no thick bright borders
- **Portfolio blocks:** image-forward, asymmetric, sharp or minimally rounded
- **Status chips:** small mono capsules with restrained glow

## 5. Layout Principles
- Landing pages use a cinematic hero, image mosaics, and editorial split sections
- Client dashboards keep an obsidian shell with precise cyan instrumentation
- Flow-builder routes may keep a lighter working canvas for legibility, but the surrounding shell stays dark
- Avoid equal-looking generic marketing rows when an asymmetric composition can tell the story better

## 6. Motion & Interaction
- Use 300ms-500ms eased transitions
- Favor transform, opacity, blur, and tonal transitions
- Hover states should feel luminous and precise, never bouncy or noisy
- Dot grids, glow fields, and progress bars can animate subtly

## 7. Anti-Patterns
- No purple primary accents
- No pure black `#000000`
- No generic 3-column equal marketing layout as default
- No thick hard borders around every block
- No fabricated stats or fake operational numbers
- No system-font look on premium customer-facing surfaces
