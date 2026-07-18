# Daily reading — location resolution contract (T-011)

The universal panchanga base needs **date + location + timezone** but **not** birth
data. The graph is never gated: the reading renders instantly against a resolved
default, labels what it used, and lets the user change it. Resolution logic lands in
Phase 1 Wave C (T-039); this contract is frozen in Phase 0-B.

## Precedence (first match wins)

| Tier | Source | `LocationSource` |
|---|---|---|
| 1 | Birth `normalized_location`, if birth data is present | `birth` |
| 2 | Last chosen location in `localStorage['urania.daily.location']` | `remembered` |
| 3 | A clearly-labeled neutral canonical default (never blank) | `default` |

## Invariants

- **Timezone is always carried** — tithi/nakshatra boundaries shift by locale (proven
  live in T-003: NYC and BLR differ on the same date). Never dropped.
- **Coordinates never touch the URL/hash** (privacy rule). They live only in
  `localStorage` under `DAILY_LOCATION_STORAGE_KEY`. The URL-write guard is asserted
  by T-040.
- **Date defaults to today *in the location's timezone***, not the browser's.
- **Geolocation is opt-in** — `navigator.geolocation` fires only after an explicit
  user action, never on load.
- The change affordance **reuses the existing geocode path** in
  `src/components/forms/WitnessForm.tsx` (place → `{lat, long, timezone}`).

## Frozen surface (src/lib/daily/location.ts)

- `DAILY_LOCATION_STORAGE_KEY = 'urania.daily.location'`
- `LocationSource = 'birth' | 'remembered' | 'default'`
- `ResolvedLocation = { location: DailyLocation; source: LocationSource }`
- `ResolveDefaultLocation` — the frozen resolution signature (implemented in T-039).
