# Nardy Blitz

> Not just a board. A training loop.

Nardy Blitz is a modern backgammon training platform built for nFactorial Incubator 2026. It is a Next.js app with an optional Supabase Realtime backend for real friend-link multiplayer and a city leaderboard, and an optional FastAPI AI Coach backend for post-game move analysis. Players can compete against a bot, play locally with a friend, challenge anyone by link across devices, review their performance with an AI Coach, track progress on a stats dashboard, and climb a city leaderboard — all without creating an account.

| | |
|---|---|
| Live Demo | `[TODO: add Vercel link](https://nardy-blitz.vercel.app)` |
| GitHub | https://github.com/L4RBIX/nardy-blitz |
| [Features](#features) | Game, Multiplayer, AI Coach, Stats, Leaderboard, Pro |
| [How to Run](#how-to-run-locally) | Frontend + optional backend |
| [Supabase Setup](#supabase-setup) | Multiplayer + leaderboard |

---

## Why This Exists

Most online backgammon apps stop at the board. They are either cluttered casino portals from the early web era or minimal implementations with no learning layer. Nardy Blitz is built around a different premise: the game itself is only the starting point.

The platform adds:

- **Post-game coaching.** Every completed game generates a coach score, a letter grade, and specific feedback on mistakes and strong plays.
- **Measurable progress.** A stats dashboard tracks win rate, average coach score, dice efficiency, streaks, and recent game history over time.
- **Social competition.** A city leaderboard lets players compare scores across Almaty, Astana, Shymkent, and other cities.
- **Real multiplayer.** Friend-link rooms powered by Supabase Realtime allow cross-device play with no account required.
- **A monetization path.** Premium board skins, a Pro waitlist, and a Kazakhstan payment roadmap demonstrate serious product thinking beyond the MVP.

---

## Product Loop

```
Play (vs Bot, local 2-player, or friend link)
     |
     v
AI Coach modal (score, grade, mistakes, best plays, recommendations)
     |
     v
Stats dashboard (trends, streaks, efficiency, recent history)
     |
     v
Submit score to Leaderboard
     |
     v
Compete / Share / Improve
```

**Play** — full backgammon engine with validated rules, bot opponent, and friend-link multiplayer.
**AI Coach** — post-game heuristic analysis that scores move quality and explains what went wrong.
**Stats** — localStorage dashboard showing improvement over time across all metrics.
**Leaderboard** — Supabase-backed city rankings that make progress visible and competitive.
**Improve** — the loop restarts; each game feeds back into measurable skill growth.

---

## How Nardy Blitz Matches the Great Level

| Requirement | Nardy Blitz Implementation |
|---|---|
| Modern web platform for backgammon | Next.js 14, TypeScript, Tailwind CSS, fully responsive UI |
| Not just another board | Training loop: Play → Analyze → Improve → Track → Compete |
| Correct game rules | Tested rules engine: 38 checks passed, 0 failed, 100-game simulation |
| Bot / AI opponent | Bot mode with Easy / Balanced / Hard difficulty |
| Multiplayer by link | Supabase Realtime friend-link rooms, cross-device, no account |
| AI Coach | Post-game move analysis: coach score 0–100, grade, mistakes, best plays, recommendations |
| Social layer | City leaderboard with Almaty / Astana / Shymkent / Other filters |
| Unique niche | Fast backgammon training loop for beginners and casual players |
| Business thinking | Pro skins, waitlist, 990 KZT/month planned price, Kazakhstan payment roadmap |
| Startup prototype | Multiplayer, leaderboard, analytics, Pro roadmap, deploy-ready on Vercel |

Nardy Blitz was built to satisfy the spirit of the task: not only to create a playable game, but to show how the game can become a real service. The core loop focuses on retention and learning, while multiplayer, leaderboard, and Pro skins demonstrate a concrete path toward community and monetization.

---

## Features

### Core Game

- Full rules engine: bar entry priority, blocked-point validation, hit/blot, bearing off, doubles (4 moves)
- Bear-off correctness: oversized die is legal only from the farthest occupied point in the home board
- No-legal-move handling: turn is skipped automatically with a notification
- Winner detection: first player to bear off all 15 checkers
- Surrender with confirmation dialog

### Game Modes

- **vs Bot** — heuristic AI with three difficulty levels: Easy, Balanced, Hard
- **Local 2-player** — pass-and-play on one screen, side randomly assigned
- **Friend-link multiplayer** — create a room, share the invite link, play in real time across any browser or device

### AI Coach

The AI Coach runs after every completed game and produces:

- Coach score: 0–100
- Letter grade: A / B / C / D
- Key mistakes with explanations
- Best plays identified during the game
- Up to 4 strategic recommendations
- Dice efficiency metric
- Move quality breakdown

The coach is implemented as a **deterministic heuristic position evaluator**. It scores 8–18 board-control features using a weighted linear model. It is accurate, fast, and fully auditable.

**What it is not:** it is not a language model, not GPT, not a trained neural network. The current evaluator is heuristic; the architecture is designed so a trained move-quality model can replace it later without changing the API contract.

The FastAPI backend (`/api/analyze-game`) is optional. If it is unreachable or not deployed, the frontend runs the same scoring logic locally as a JavaScript fallback. Both paths produce the same output format.

### Stats

All stats are stored in `localStorage` — no account required.

- Games played, wins, losses, win rate
- Current streak, longest streak
- Average coach score, best coach score
- Average dice efficiency
- Total hits made, points made, blots left, bar entries
- Per-difficulty breakdown: Easy / Balanced / Hard
- Recent game history: result, mode, color, difficulty, duration, coach score, grade
- Submit score to city leaderboard from the stats page

### Multiplayer

- Rooms backed by Supabase Postgres (`multiplayer_rooms` table)
- Invite link encodes the room ID and works across any browser, device, or network
- Host creates the room; color (white/black) is assigned randomly at creation
- Guest joins via the invite link; role and name are stored in `localStorage` per room ID
- Game state is updated in Supabase on every move; both clients re-render from the shared state
- Supabase Realtime `postgres_changes` subscription provides ~50ms sync when active
- 1.5-second polling fallback activates automatically if Realtime drops
- Connection badge: `Realtime` (live subscription) or `Polling` (fallback)
- A third browser opening the same room sees a spectator view rather than crashing
- No authentication: this is a prototype with public RLS policies

### City Leaderboard

- Score formula: `round(avgCoachScore × 10 + wins × 25 + bestCoachScore × 5 + winRate × 2)`
- City filter chips: All · Almaty · Astana · Shymkent · Other
- Desktop table layout with gold / silver / bronze rank markers
- Mobile stacked card layout
- When Supabase is not configured, a demo preview with 8 sample entries is shown

### Pro Monetization Prototype

- **Free tier:** Classic board skin (forest green felt)
- **Pro tier (planned):** Obsidian (deep navy), Emerald (dark green), Walnut (warm wood)
- "Preview Pro Skins" unlocks all skins locally via a `localStorage` flag for demo purposes — no payment
- "Join Pro Waitlist" form collects name, email, city, and a note; stored in the `pro_waitlist` Supabase table
- Planned price: 990 KZT / month
- Kazakhstan payment roadmap: Kaspi Pay, Freedom Pay, CloudPayments, or a local acquiring bank
- No real payment gateway is wired in the current prototype

---

## Architecture

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| State | Zustand |
| Animation | Framer Motion |
| Storage | localStorage (stats, skin, Pro preview, room roles) |

### Backend / Services

| Layer | Technology |
|---|---|
| Realtime + Database | Supabase (Postgres + `postgres_changes` subscription) |
| AI Coach backend | FastAPI (Python) — optional |
| AI Coach fallback | Local JavaScript heuristic evaluator |

---

## AI Coach Architecture

```
Game finishes
     |
     v
move_history
(every move: from, to, dice used, player, outcome)
     |
     v
Feature Extraction
18 board-control features:
  blots_left, hits_made, protected_points, bar_entries,
  pip_count_delta, home_board_anchors, dice_efficiency, ...
     |
     v
Heuristic Evaluator
weighted linear scoring across features
     |
     v
Coach Report
{
  score:           0–100
  grade:           A / B / C / D
  mistakes:        [ { move, explanation } ]
  highlights:      [ { move, explanation } ]
  recommendations: [ string × 1–4 ]
}
```

The FastAPI backend and the local JavaScript fallback share the same API contract. Switching between them requires no frontend changes. The architecture is designed so a trained move-quality model can replace the heuristic evaluator in the future without touching the UI.

**What the AI Coach is:** a deterministic, auditable, heuristic position evaluator. Every score is explainable and reproducible.

**What it is not:** it is not GPT, not a language model, not a neural network in the current build.

---

## Multiplayer Architecture

```
Host creates room
     |
     v
Supabase: INSERT into multiplayer_rooms
  status="waiting", white_player/black_player randomly assigned
     |
     v
Host shares invite link (encodes roomId)
     |
     v
Guest opens link in any browser or device
     |
     v
Supabase: UPDATE status="live", guest_name set
     |
     v
Each move:
  UPDATE game_state + current_turn in multiplayer_rooms
     |
     +---> Supabase Realtime fires postgres_changes event
     |         both clients receive update within ~50ms
     |
     +---> 1.5s polling fallback (runs in parallel, deduplicated)
     |
     v
Both clients re-render from shared game_state
     |
     v
Game ends: winner + status="finished" written to Supabase
Both screens show result simultaneously
```

Role identity (host or guest) is stored in `localStorage` keyed by room ID via `src/lib/multiplayerIdentity.ts`. There is no authentication. Prototype-level public RLS policies are used intentionally for the incubator demo.

---

## Quality Verification

```bash
npm run sanity
```

| Metric | Result |
|---|---|
| Total checks | 38 |
| Passed | 38 |
| Failed | 0 |
| Simulated games completed | 100 |
| Games with invariant violations | 0 |

**Test groups covered:**

- Initial board setup and piece counts
- Dice roll expansion and doubles (4 moves)
- Blocked-point validation
- Hit and blot mechanics
- Bar entry priority enforcement
- Blocked bar entry
- Bearing-off rules
- Oversized die correctness (White and Black regression tests)
- Winner detection
- No-legal-move turn skipping
- 100-game simulation with per-turn invariant checks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + CSS custom properties |
| State | Zustand |
| Animation | Framer Motion |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Database | Supabase (PostgreSQL) |
| Optional AI Coach backend | FastAPI (Python) |
| Storage | localStorage (stats, skin, Pro preview, room roles) |
| Fonts | DM Sans (UI) + JetBrains Mono (metrics) |
| Deployment | Vercel-ready |

---

## How to Run Locally

### Frontend

```bash
# Install dependencies
npm install

# Copy the environment template (Supabase and Coach API are optional)
cp .env.example .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars, the app runs fully in local mode. The `/multiplayer` page shows a setup screen. The `/leaderboard` page shows a demo preview. All other features work normally.

### AI Coach Backend (optional)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

If the backend is offline or not deployed, the frontend automatically uses the local JavaScript fallback evaluator. The coach still runs; no manual configuration is needed.

---

## Supabase Setup

Supabase is required for real cross-device multiplayer and the live leaderboard. Without it, both features fall back to demo/local modes.

### Step 1 — Create a project

Go to [supabase.com](https://supabase.com) and create a free project. Wait for it to finish provisioning.

### Step 2 — Run the schema

Open **SQL Editor** in the Supabase dashboard. Paste the full contents of `supabase/schema.sql` and click **Run**. The script creates three tables (`multiplayer_rooms`, `leaderboard_entries`, `pro_waitlist`), CHECK constraints, the `updated_at` trigger, RLS policies, and enables Realtime on `multiplayer_rooms`. The script is idempotent and safe to re-run.

### Step 3 — Verify Realtime

In the dashboard: **Database → Replication → Supabase Realtime**. Confirm that `multiplayer_rooms` is toggled on. The schema script enables this automatically, but it is worth checking.

### Step 4 — Get your credentials

Go to **Project Settings → API** and copy:
- **Project URL** — looks like `https://xxxx.supabase.co`
- **anon / public key** — safe to use client-side

### Step 5 — Create `.env.local`

Create `.env.local` in the project root. Do not commit this file.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_COACH_API_URL=http://localhost:8000/api/analyze-game
```

### Step 6 — Restart the frontend

```bash
npm run dev
```

### Step 7 — Test multiplayer end-to-end

**Local test (two browser windows):**

1. Open `http://localhost:3000/multiplayer` in Browser A
2. Enter your name and click **Create Room**
3. Copy the invite link from the waiting screen
4. Open the invite link in a new Incognito window (Browser B)
5. Enter a guest name and click **Join Game**
6. Both windows should show the board with the `Realtime` connection badge
7. Browser A rolls and moves — Browser B updates within ~200ms
8. Browser B rolls and moves on their turn — Browser A updates
9. Click **Surrender** on either side — the game ends on both screens simultaneously

**Cross-device test:**

Use the Vercel URL instead of localhost. The invite link encodes the room ID and works across any device or network.

### Step 8 — Test the leaderboard

1. Play at least one game at `/play`
2. Go to `/stats` and click **Submit my score**
3. Enter a name and city and submit
4. Open `/leaderboard` — your entry should appear

---

## Vercel Deployment

Add the following in **Vercel Project Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Enables multiplayer and leaderboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon/public key |
| `NEXT_PUBLIC_COACH_API_URL` | Optional | AI Coach backend URL. If unset, local fallback runs in-browser. |

Redeploy after adding variables. The invite link uses `window.location.origin` and automatically picks up the Vercel domain.

If the FastAPI AI Coach backend is not deployed, the local fallback evaluator activates automatically. No configuration is needed.

---

## Without Supabase

| Feature | Without Supabase env vars |
|---|---|
| Local game vs Bot | Works |
| Local 2-player mode | Works |
| AI Coach modal | Works (local fallback evaluator) |
| Game stats dashboard | Works (localStorage) |
| Board skins / Pro preview | Works |
| Share game via URL | Works |
| `/multiplayer` | Shows setup screen |
| `/leaderboard` | Shows demo preview (8 sample entries) |
| Score submit from `/stats` | Shows setup instructions |

---

## Known Limitations

- **No authentication.** Any client that knows a room ID can read and write its game state. This is intentional for the prototype but not production-safe.
- **Prototype RLS.** The Supabase schema uses public allow-all policies. A production deployment would require authentication and ownership-scoped policies.
- **No real payments.** The Pro tier is a local preview only. No payment gateway is wired. The waitlist collects interest but does not charge.
- **AI Coach is heuristic, not trained.** The evaluator is a deterministic weighted linear model. It is not a neural network. A trained model is on the roadmap.
- **No ELO system.** The leaderboard uses a formula-based score, not a full rating system.
- **Supabase required for real multiplayer.** Cross-device play requires the Supabase env vars to be set. Without them, the multiplayer page shows a setup prompt.
- **No persistent game history.** Stats are stored in `localStorage` and are lost if the browser storage is cleared.

---

## Roadmap

- [ ] Authentication (email / Kaspi OAuth)
- [ ] Secure room ownership (host-only writes)
- [ ] ELO rating system and player profiles
- [ ] Cloud-backed game history
- [ ] Trained move-quality model replacing the heuristic evaluator
- [ ] Kaspi Pay / Freedom Pay / CloudPayments integration for Pro subscriptions
- [ ] Tournament mode with bracket management
- [ ] Mobile app (React Native / Expo)
- [ ] Extended AI Coach (20+ features, opening theory database)

---

## Engine Sanity Tests

```bash
npm run sanity
```

38 checks, 0 failures, 100-game simulation. See [Quality Verification](#quality-verification) for the full breakdown.

---

## Built for nFactorial Incubator 2026

> "Not just a board, but a training loop."
