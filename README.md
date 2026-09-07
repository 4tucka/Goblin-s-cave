# 🔥 Goblin's Cave — D&D Virtual Tabletop & Room Manager

A multi-page web application and lightweight Virtual Tabletop (VTT) tailored for D&D fans.
Dungeon Masters host, configure, and manage custom campaign rooms; players upload characters
and join turn-based session gameplay. Supports **Guest Mode** (instant play) and
**Authenticated Accounts** (persistent vault, profile, room history).

## Run it

Any static file server works (ES modules + BroadcastChannel require `http://`, not `file://`):

```bash
cd Goblin-s-cave
python3 -m http.server 8080
# open http://localhost:8080
```

> 💡 Open the same room in **two browser tabs** to see the real-time sync (lobby rosters,
> token movement, fog reveals, chat and dice) in action.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | Landing: dark-fantasy hero, quick actions (Create / Join / Auth), guest-vs-account banner |
| `account.html` | Profile dashboard, **My Vault** (characters, maps, playlists), campaign stats, **Room History** |
| `create.html` | DM wizard: ① room details → ② map builder (square/hex grid, terrain, fog of war, tokens, scaling) → ③ NPC/monster spawner (incl. JSON import) → ④ atmosphere & audio → ⑤ staging lobby with ready-up roster |
| `join.html` | Join via code or invite link, password gate, vault/quick-card/JSON character selection, player lobby with chat + Ready toggle |
| `play.html` | Live VTT: zoom/pan map viewport, token movement with turn rules, DM fog brushes, initiative bar, chat, dice tray (`/roll 1d20+5`, advantage/disadvantage, `4d6kh3`), audio widget |

## The Goblin Guide 👺

Floating companion on every page:
- **Site guides** — "how do I create a room?", "explain fog of war"
- **5e rules** — grappling, Counterspell, death saves, cover, conditions, concentration…
- **DM Helper Mode** — "generate an NPC", "random encounter", "loot ideas"

## Design decisions

- **Real-time**: `BroadcastChannel` + `storage` events sync rooms across tabs instantly —
  no backend or external service required. The room store in `localStorage` is the single source of truth.
- **Fog of war**: supported — DM paints fog in the builder and reveals live in-session; players see only revealed cells.
- **Character sheets**: streamlined *Character Cards* (Name, Class, Level, HP, AC, Speed, Attacks, token portrait). JSON sheet import supported.
- **Audio**: five procedurally synthesized ambient loops (Dungeon Rain, Tavern Noise, Cave Drips, Night Forest, Battle Drums) via Web Audio, plus MP3 upload / external URL.
- **Goblin Guide**: fully local expert system with SRD-based 5e knowledge — no API key needed.

## Storage & privacy

Accounts, characters, maps and rooms persist in `localStorage` of the browser only (demo storage;
passwords are obfuscated, not encrypted). Uploaded images are downscaled client-side to keep the
store light. Ended rooms are pruned after 48 hours.

## Tech

Zero-build vanilla HTML/CSS/ES-modules. No dependencies.
