# GE Workshop

A lightweight static Next.js calculator for OSRS Grand Exchange combination and deconstruction flips.

Included methods:

- Masori fortification using Armadylean plates from direct purchases or broken-down Armadyl armour, including the packaged fortified armour set.
- Torva restoration using Bandosian components from direct purchases or broken-down Bandos armour.
- Spirit shield assembly using a direct or player-blessed shield with spectral, arcane, or elysian sigils.
- Cerberus boot upgrades covering eternal, pegasian, and primordial boots on one comparison page.
- Elemental battlestaff market floors showing current, 24-hour, 3-day, and 7-day low-side prices.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Calculation model

- **Patient offers** (default) uses the API's `low` price for inputs and `high` price for outputs.
- **Instant execution** uses `high` for inputs and `low` for outputs.
- Armadyl armour cost is divided by the number of Armadylean plates it yields.
- Final-sale revenue is reduced by the 2% Grand Exchange tax, capped at 5,000,000 gp per item.
- Prices refresh every 15 seconds and can be refreshed manually. Updated values flash briefly on screen.
- The header meter counts down to the next live-price refresh.
- Press `X` to toggle between patient offers and instant execution.
- Press `M` to cycle through the available flipping methods.
- Press `R` to refresh prices immediately.
- Quote dots indicate freshness: green (≤5m), lime (≤15m), yellow (≤30m), orange (≤1h), deep orange (≤4h), and red (>4h).

These prices are recent trades, not guaranteed offers. The calculator does not include opportunity costs or any untradeable material/action costs.

## GitHub Pages

The app uses Next.js static export. Push it to a repository whose default branch is `main`, then in **Settings → Pages** choose **GitHub Actions** as the source. The included workflow builds and deploys `out/`. Repository subpaths are detected automatically during the Actions build.

To force a custom base path in another build environment, set `NEXT_PUBLIC_BASE_PATH`, for example:

```bash
NEXT_PUBLIC_BASE_PATH=/flipper npm run build
```
