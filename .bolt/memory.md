# Project memory

## Product intent & audience

- **SmartStock**: inventory management workspace app for warehouse stock tracking.
- Users manage inventory via receive/dispatch actions, search, alerts, activity feeds, and dashboard metrics.
- Intentionally shared workspace with pre-seeded starter warehouse records; row-level access configured in Supabase.

## Brand personality & voice

- Professional, polished, production-grade feel — not generic or cookie-cutter.
- Dashboard-oriented workspace UX with clear data hierarchy and actionable controls.

## Visual design & UX direction

- Responsive single-page workspace layout matching provided HTML files and screenshots.
- Primary screens: Overview, Inventory, Copilot, Products, More — with working navigation between them.
- Interactive actions (receive/dispatch) update live warehouse data.
- Dashboard includes metrics, inventory search, alerts, and activity feeds.
- Icons from `lucide-react`; styling via Tailwind CSS classes.
- Modules imported via `@/` path alias (`src/`).

## Decisions, constraints & rationale

- Stack: vite-react + JSX + Tailwind + Lucide React (no extra UI/theme packages).
- Backend: Supabase stores inventory records and warehouse activity data.
- Started from blank starter; full app built from provided HTML/screenshots as primary reference.
- Hotlinking allowed for images referenced in the provided HTML.
- Build checks passed successfully after implementation.

## Open questions & assumptions

- Exact Supabase table schema and field names for inventory/activity not fully documented — inferred from screen features.
- Long-term plan for shared-workspace multi-user isolation beyond current row-level access is undefined.
- Copilot screen functionality scope (AI features vs. static guidance) not yet clarified.