# ◈ BOOMTOWN

A real-time, multiplayer **property-trading board game** that runs as a responsive
website and an installable **PWA**. Build the city, collect rent, and bankrupt your
rivals. 2–6 players join one session with a short shareable **room code** (e.g. `ZV2SQ`).

> **100% original.** Every district name, card, currency, and the entire visual design
> are invented for Boomtown. There are no references to any existing board-game brand,
> company, or app anywhere in the code, copy, or art.

The **server is authoritative** over all game state and money. Clients render synced
state and send typed action intents; the server validates legality + turn ownership,
applies the change, and broadcasts the new state to everyone. A tampered client cannot
give itself money or act out of turn.

---

## Monorepo layout

```
/packages/shared   # shared TS types, board data, card decks, and the pure rules engine (+ tests)
/apps/server       # authoritative realtime server (Node + Socket.IO room manager)
/apps/web          # React + Vite + Tailwind + Framer Motion PWA client
```

## Quick start

```bash
npm install        # installs all workspaces
npm run dev        # starts the server (:2567) and the web client (:5173) together
```

Open http://localhost:5173. To play across devices on your network, open the
`Network:` URL Vite prints on each device — the client auto-targets the server on
`:2567` of the same host. (Override with `VITE_SERVER_URL` if needed.)

Other scripts:

```bash
npm test           # run the rules-engine unit tests (Vitest)
npm run typecheck  # typecheck every workspace
npm run build      # build shared + server + web (web emits the PWA service worker)
```

## How to play

1. **Create a game** → you get a 5-character room code and land in the lobby.
2. Friends **Join with a code** + a display name. Pick tokens; the host sets house rules.
3. **Start** when 2+ players are ready.
4. Roll → move → buy/decline (declining triggers an **auction** if enabled) → pay rent →
   build, mortgage, trade → end turn. Land in the **Holding Cell**, draw **Fortune** /
   **Civic** cards, dodge taxes. Last solvent player wins.

## Game design (original content)

- **8 color groups** of districts: Tannery Row, Old Kiln Quarter, Founders Crossing,
  Lakeside Mile, Lantern District, Meridian Heights, Glass Tower District, Skyline Crown.
- **4 transit lines** (North Depot, River Ferry, Sky Tram, Freight Yard) and
  **2 civic works** (Reservoir Authority, Spark Co.).
- **Levy Office** / **Luxury Duty** taxes, **GO**, **Holding Cell**, **Off to the Cell**,
  **Free Parking**, and two card decks — **Fortune** and **Civic** — with original text.
- Currency: **Bricks (◈)**. Pricing/rent follow familiar escalating curves; numbers are ours.

## Rules engine

All rules live in `packages/shared/src/rules.ts` as pure functions over `GameState`:
rent (with monopoly doubling, houses/hotels, transit scaling, utility × dice),
even-building with optional building shortage, mortgage/unmortgage (+10% to lift),
jail (fine / Release Writ / roll doubles, 3-turn cap), three-doubles-to-jail, auctions,
trading, and bankruptcy → asset transfer → last-player-standing win.

`npm test` covers rent (incl. monopolies & houses), transit/utility rent, GO bonus,
the charge/debt flow, building rules, mortgaging, jail, auctions, bankruptcy + win, and
card effects — **30 tests**.

## Realtime layer — why Socket.IO

The brief preferred Colyseus with a Node + Socket.IO fallback. This build uses
**Socket.IO + a hand-rolled room manager** (`apps/server/src/index.ts`, `Game.ts`)
because it gives clean control over 5-char room codes (ambiguous chars excluded),
broadcasts the exact plain `GameState` shape from `@boomtown/shared` with no
schema-decorator duplication, and is the most reliable path to a working
cross-network demo. Room state is in-memory (v1); reconnection uses a session token held
in `sessionStorage`, and a disconnected player's turn is auto-skipped after a grace period.

## PWA

`vite-plugin-pwa` generates the service worker and web manifest (name, icons incl.
maskable, theme color, standalone, portrait). The app shell, lobby, and menu are cached
for offline use; live games show a clear "you're offline — reconnecting…" banner. A custom
"Add Boomtown to your home screen" install prompt appears when the browser offers it.

## Acceptance criteria

- ✅ Two browsers on different networks join one room by code and play a full game to a
  single winner.
- ✅ All money and ownership is server-validated; tampered clients can't cheat.
- ✅ Rules engine unit tests cover rent (monopolies/houses), auctions, jail, bankruptcy.
- ✅ Installable PWA with manifest + service worker + maskable icons.
- ✅ Zero references to any existing board-game IP — all names, copy, art, and layout are original.
