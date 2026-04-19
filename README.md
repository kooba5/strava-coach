# Strava Coach — AI Running Coach

Your personal AI running coach powered by real Strava data and Claude AI.

## Features
- 🔐 Strava OAuth login (read-only access)
- 📊 Fetches last ~4 months of your runs automatically
- 💬 Chat with Claude AI about your training
- 📋 Sidebar with your recent activities
- 🏃 Streaming responses for a smooth chat experience

---

## Deploy to Vercel (step by step)

### 1. Get the code on GitHub

1. Create a new repo at [github.com/new](https://github.com/new)
2. Upload this project folder, or run:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/strava-coach.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** → import your `strava-coach` repo
3. Leave all build settings as defaults (Vercel detects Next.js automatically)
4. Before clicking Deploy, click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `STRAVA_CLIENT_ID` | your Strava app Client ID |
| `STRAVA_CLIENT_SECRET` | your Strava app Client Secret |
| `ANTHROPIC_API_KEY` | your Anthropic API key |
| `NEXTAUTH_SECRET` | any random 32-char string (e.g. generate at [generate-secret.vercel.app](https://generate-secret.vercel.app/32)) |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app-name.vercel.app` |
| `NEXT_PUBLIC_STRAVA_CLIENT_ID` | same as `STRAVA_CLIENT_ID` |

5. Click **Deploy** — it'll be live in ~1 minute!

### 3. Update Strava callback URL

After deploying, go back to [strava.com/settings/api](https://www.strava.com/settings/api) and update:
- **Authorization Callback Domain**: `your-app-name.vercel.app` (no https://)

---

## Local Development

```bash
npm install
```

Create a `.env.local` file:
```
STRAVA_CLIENT_ID=your_id
STRAVA_CLIENT_SECRET=your_secret
ANTHROPIC_API_KEY=your_key
NEXTAUTH_SECRET=any-random-string
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_STRAVA_CLIENT_ID=your_id
```

For local dev, set the Strava callback domain to `localhost`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Anthropic Claude** (claude-sonnet-4, streaming)
- **Strava API v3**
- **jose** for JWT session cookies
- No database required
