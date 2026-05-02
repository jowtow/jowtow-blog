# Admin Shell Modes

## Pattern

Use a route-aware outer main wrapper to let admin routes escape the public site content gutters, then let the admin page decide whether each tab renders in a constrained or wide inner shell.

## Why

This keeps the public site layout untouched while letting workspace-heavy admin views expand to the viewport. It also avoids baking one width policy into the whole admin surface.

## Apply It When

- an admin route needs full-width workspace tabs
- some tabs still read better in a constrained column
- the outer app shell currently owns the page gutters

## Key Files

- `components/RouteAwareMain/RouteAwareMain.tsx`
- `app/layout.tsx`
- `app/admin/page.tsx`
