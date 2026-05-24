# Strava Coach — Claude Code Intelligence

## Project Overview
AI-powered running coach that connects to Strava OAuth, fetches the user's last ~4 months of runs, and lets them chat with Claude about their training. No database — JWT session cookies only.

## Tech Stack
- **Next.js 14** App Router (TypeScript)
- **Tailwind CSS** for styling
- **Anthropic Claude** (`claude-sonnet-4-20250514`) with streaming
- **Strava API v3** (OAuth 2.0, read-only)
- **jose** for JWT session management
- Deployed on **Vercel**

## Project Structure
```
app/
  api/
    auth/callback/route.ts   # Strava OAuth callback
    chat/route.ts            # Claude streaming chat endpoint
    activities/route.ts      # Strava activities fetch
  page.tsx                   # Landing / login page
  chat/page.tsx              # Main chat UI
components/
  ChatWindow.tsx             # Streaming chat interface
  ActivitySidebar.tsx        # Recent runs sidebar
  ActivityCard.tsx           # Individual run display
lib/
  strava.ts                  # Strava API helpers
  session.ts                 # JWT cookie utilities
  formatActivity.ts          # Run data → readable text for Claude
```

## Environment Variables
```
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
ANTHROPIC_API_KEY
NEXTAUTH_SECRET          # JWT signing secret (32+ chars)
NEXT_PUBLIC_BASE_URL     # e.g. https://your-app.vercel.app
NEXT_PUBLIC_STRAVA_CLIENT_ID
```

## Key Patterns & Conventions

### API Routes
- All routes use Next.js App Router `route.ts` pattern
- Auth is checked by reading the JWT cookie using `lib/session.ts`
- Strava access token is stored inside the JWT (no DB)
- Token refresh should happen in `lib/strava.ts` before API calls

### Claude Integration
- Model: `claude-sonnet-4-20250514`
- Always stream responses (`stream: true`)
- System prompt lives in `app/api/chat/route.ts` — keep it focused on running coaching
- Activity data is injected into the system prompt as formatted text, not as user messages
- Max tokens: 1024 for chat responses

### Strava Data
- Fetch activities with `per_page=100`, filter to `type: Run`
- Key fields to use: `distance` (meters), `moving_time` (seconds), `total_elevation_gain`, `average_heartrate`, `suffer_score`, `start_date`
- Convert distance to km in `lib/formatActivity.ts`
- Always handle Strava 401 (token expired) → redirect to re-auth

### Styling
- Tailwind only, no CSS modules
- Strava brand color: `#FC4C02` (orange) — use for CTAs and accents
- Dark sidebar, light main area pattern

## Common Tasks & How to Do Them

### Add a new feature
1. Check `PLANNING.md` first — does this fit the roadmap?
2. Add types to relevant files before writing logic
3. New API routes go in `app/api/[feature]/route.ts`
4. New UI components go in `components/`
5. Run `npm run build` to check for TypeScript errors before marking done

### Modify the Claude system prompt
Edit the `systemPrompt` string in `app/api/chat/route.ts`. Keep it:
- Focused on running/training
- Aware of the user's recent data
- Encouraging but honest about overtraining

### Add a new Strava field
1. Update the fetch in `lib/strava.ts`
2. Update the formatter in `lib/formatActivity.ts`
3. Update TypeScript types if needed

## What NOT to Do
- Don't add a database — keep it stateless with JWT
- Don't store full activity history in cookies (too large) — only store the token
- Don't use `any` types — always define proper interfaces
- Don't call Strava API from client components — always go through `app/api/`
- Don't expose `ANTHROPIC_API_KEY` or `STRAVA_CLIENT_SECRET` to the client

## Running Locally
```bash
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

## Build Check
```bash
npm run build   # Must pass with 0 errors before any PR
```

---

# v2 ARCHITECTURE — Adaptive Daniels Coach
(See PLANNING.md for full detail and /specs for per-feature implementation specs.)

## What changed
The app is evolving from "chat about Strava data" into a STATEFUL, ADAPTIVE coach built
on Dr. Jack Daniels' VDOT methodology. It generates a real plan, persists it, reconciles
planned-vs-actual, adapts to schedule + recovery, and holds the athlete accountable.

## Athlete (seed)
VDOT ~45 (from 1:40:04 half). 3-4 running days/week + 2 optional gym sessions, 25-40 km/wk.
Goals: sub-40 10k = PRIMARY (needs VDOT ~52), sub-1:35 half = STRETCH, sub-1:30 half =
DATA-GATED unlock (needs VDOT ~50+ and proven endurance). Be honest, never cheerlead.

## New core modules
- `lib/vdot.ts` — DETERMINISTIC pace/VDOT/prediction engine + heat adjustment. THE source
  of pace truth. The LLM never computes paces/dates/VDOT — it only interprets numbers it's handed.
- `lib/calendar.ts` — server-side date-fns 14-day block. Fixes the date-drift bug.
- Goal feasibility, plan generator, matcher, readiness — see /specs.

## Hard rules for this codebase
- NEVER let the LLM derive dates, paces, or VDOT. Compute server-side, inject, let it interpret.
- Heat-adjust efforts before judging pace or feeding VDOT (athlete's 1:46 was a 28C run).
- Coach is harsh on execution but defers to recovery data: skip on RED recovery = smart;
  skip on GREEN with no reason = call it out. Pain/injury/overtraining = STOP pushing, force rest.
- Daniels volume distribution: ~70-80% Easy, 10-15% M+T, 10-15% I+R. Enforce as a validator.
- The "no database" line in the README is OBSOLETE — v2 needs persistence (spec 04). Update README.

## Build order
Specs 01 -> 08 in /specs, one per session. See TASKS.md.
