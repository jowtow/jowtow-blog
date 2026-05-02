# Auto-select Workspaces

## Pattern

If a workspace auto-selects the first record after loading, keep that bootstrap behavior separate from user-driven "new" or "clear selection" states.

## Apply it when

- a sidebar auto-selects the first project, collection, or document
- the UI also supports a blank "create new" editor state
- selection changes can trigger refetches or effect reruns

## Why

- It prevents "New" from being overwritten by a follow-up auto-selection pass
- It keeps create flows stable even when list data refreshes
- It reduces accidental state churn from effect dependencies on the current selection

## Preferred implementation

- Use an explicit bootstrap flag or reload option for first-load auto-selection.
- Do not make the fetch effect depend on the current selected slug when the UI also supports a blank create state.

## Example here

- `components/CollectionsManager/CollectionsManager.tsx`
