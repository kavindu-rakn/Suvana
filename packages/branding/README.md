# packages/branding

Suvana visual identity — single source of truth for every app in this repo.

To add (kvn has these ready):
- `logos/` — logo files (SVG preferred, plus PNG exports)
- `palette.css` — colour palette as CSS custom properties, consumable by `apps/web` (Vite) and `apps/communicate` (Tailwind v4 `@theme`)
- Typography choices, if standardized
Sinhala = Noto Serif Sinhala
English = Noto Serif 

Rule: no sub-brand names (Sawana, SignSpeak, SoundGuard) anywhere in Suvana UI copy — modules are named descriptively (Learn / Communicate / Alerts).

| Role | Color Name | Hex Code | Visual & Design Rationale |
| --- | --- | --- | --- |
| **Primary UI** | **Clear Teal** | `#00A693` | Represents communication, clarity, and visual intelligence. Teal feels innovative, approachable, and is distinct from common 'corporate blue' while maintaining professional trust. |
| **Technology (Karna AI)** | **Slate Blue** | `#2F4F4F` | Represents the underlying sophisticated technology, stability, and intelligence. A deep, grounded foundation for audio processing. |
| **Accent / Action** | **Warm Gold** | `#DAA520` | Used for highlighting success, intelligence triggers (e.g., a sound is detected), and progress in SSL learning. Suggests value, clarity, and warmth. |
| **Background (Base)** | **Crisp Off-White** | `#FDFDFD` | Ensures high contrast for text and visual sign elements (avatars, sign input), maintaining optimal readability and cleanliness (WCAG AA standard). |
| **Text / Details** | **Rich Graphite** | `#333333` | Sophisticated, easy-to-read text, avoiding absolute black for a softer, more modern interface feel. |

