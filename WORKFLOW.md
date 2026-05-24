# Claude Code — How to Work With This Project

## The Golden Workflow

### 1. Plan First, Code Second
Never say "add X feature." Instead:
```
Read CLAUDE.md and PLANNING.md. I want to add [feature].
Before writing any code, write a plan: what files change, 
what new files are needed, any risks or edge cases. 
Wait for my approval before implementing.
```
This prevents Claude Code from going down the wrong path for 200 lines.

### 2. One Feature Per Session
Keep sessions focused. Mixing "fix the auth bug AND add charts AND improve the UI" leads to tangled diffs. Finish one thing, commit, start fresh.

### 3. Always End With a Build Check
Finish every session with:
```
Run `npm run build` and fix any TypeScript errors. 
Then summarize what changed.
```

---

## High-Leverage Prompts

### Starting a session
```
Read CLAUDE.md, PLANNING.md, and TASKS.md. 
Today I want to work on: [task].
Summarize your understanding of the codebase relevant to this task before starting.
```

### Debugging
```
Here's the error: [paste error + stack trace]
Read the relevant files first, then explain the root cause 
before suggesting a fix.
```

### Code review
```
Review [file]. Check for: TypeScript correctness, 
edge cases, security issues (exposed secrets, unvalidated inputs), 
and consistency with patterns in CLAUDE.md.
```

### Refactoring
```
I want to refactor [area]. Don't change behavior — 
only improve [readability/types/structure]. 
Show me a plan first.
```

### Adding a new API route
```
Add a Next.js App Router route at app/api/[name]/route.ts.
It should [description].
Follow the auth pattern from the existing routes (JWT cookie check).
Add proper TypeScript types. No 'any'.
```

---

## Claude Code Slash Commands to Know

- `/init` — generates a CLAUDE.md from scratch (useful on new repos)
- `/clear` — reset context if a session goes sideways  
- `/compact` — summarize history to save context window

---

## Tips That Save Time

**Give Claude Code the exact file path** instead of describing it:
> ❌ "In the chat component..."
> ✅ "In `components/ChatWindow.tsx`..."

**Paste the error, not a description of it.** Claude Code reads stack traces better than paraphrases.

**Commit frequently.** After each working feature, `git commit`. Claude Code can't undo file changes — git can.

**Use `--dangerously-skip-permissions` only if you trust the task.** For exploratory tasks (reading, planning), the default safe mode is fine. For bulk refactors you've reviewed, skip is faster.

**Agentic tasks to let Claude Code run fully:**
- "Rename all instances of X to Y across the project"
- "Add JSDoc to all functions in lib/"
- "Find all TODO comments and add them to TASKS.md"

**Tasks that need your approval mid-way:**
- Any change to auth logic
- Changes that touch `.env` handling
- New npm dependencies (review before install)

---

## MCP Servers Worth Adding
These would supercharge this specific project:

- **GitHub MCP** — Claude Code can read issues, create PRs, review diffs directly
- **Vercel MCP** — check deployment status, env vars, logs without leaving the terminal
- **Browserbase / Puppeteer MCP** — test the Strava OAuth flow end-to-end automatically
