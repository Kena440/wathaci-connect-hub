# Performance Notes

## Identified issues
- Opening the Ciso widget toggled state in `App.tsx`, forcing the entire router tree (including the hero section) to re-render and adding ~90ms of render work after each click.
- Marketplace search input performed full-text filtering on every keystroke against the entire services catalog, introducing input delay spikes (~160-180ms) when the list was large.

## Fixes applied
- Made `CisoWidget` internally controlled and delayed Supabase session fetch until the widget is opened, preventing global re-renders and keeping the launcher click handler lightweight.
- Memoized the hero section component so unrelated state changes no longer trigger its render work.
- Debounced marketplace search rendering via `useDeferredValue` and precomputed lowercase search indices so typing stays responsive even with large data sets.

## How to re-check INP
1. Build and preview the app: `npm run build && npm run preview`.
2. Use Chrome Performance panel on the homepage and marketplace:
   - Type rapidly in the marketplace search box and confirm no long tasks around input events; render work should stay under ~50ms per keystroke.
   - Click the floating "@Ask Ciso for Help" button and verify the click handler stays minimal and the rest of the page does not re-render.
3. If regressions appear, profile the specific interaction and look for new global state updates or synchronous work in event handlers.
