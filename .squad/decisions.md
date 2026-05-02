# Squad Decisions

## Active Decisions

- 2026-05-02: Admin supports per-tab layout modes. Collections, Series, and Images use a wide workspace layout; Dashboard and Create stay constrained.
- 2026-05-02: Wide admin tabs break out of the site-wide content wrapper to use the full viewport width.
- 2026-05-02: This pass ships the shell width system plus a full Collections redesign. Series and Images adopt the wider shell without internal redesign in this pass.
- 2026-05-02: Collections desktop layout uses three panes: collection navigator rail, persistent collection editor, and dense item browser.
- 2026-05-02: Collections auto-selects the first collection when one exists.
- 2026-05-02: Item browsing stays stable. The item workspace uses a dense table/list, item rows open the editor on double click, and the primary New Item action lives in the item workspace toolbar.
- 2026-05-02: Item editing opens in a fullscreen overlay. On desktop, the overlay uses a split markdown editor/preview layout.
- 2026-05-02: This redesign is layout-first. Search, filter, and sort expansion are deferred unless a minimal addition falls out naturally from the layout work.

- 2026-05-02: Admin redesign review rejected due to create-flow regression. Blocker: auto-select effect tied to selectedCollectionSlug overwrites New state on reload. Required non-Ambrose revision.
- 2026-05-02: Collections bootstrap selection guard — auto-select only on explicit bootstrap paths. Preserve create mode on user-driven deselection until explicit selection/save. Affects `components/CollectionsManager/CollectionsManager.tsx`.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
