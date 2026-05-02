# Admin Shell Layout Modes

## Pattern

When one route family needs fundamentally different width/chrome rules from the public site, keep the root layout provider-only and move chrome plus width constraints into route-group layouts. Let the admin shell choose a `layoutMode` (`constrained` or `wide`) from a single tab/route config map.

## Use when

- Public pages share a centered content wrapper
- Admin or workspace pages need full-width panes or overlays
- Different admin tabs need different content widths without duplicating navigation

## Why it works

- It keeps public layout concerns out of admin feature code
- Width changes become declarative shell behavior instead of per-panel CSS hacks
- Feature components can focus on their workspace state instead of fighting ancestor layout constraints

## Trade-off

- Route-group refactors touch file placement and shared chrome setup
- A single-page tab shell is lower churn now, but route-per-tab is better later for deep linking and browser history
