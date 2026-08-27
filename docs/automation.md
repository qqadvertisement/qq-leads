# Letting Claude work inside this repo

Two workflows are already in `.github/workflows/`, both switched off until you add
a token. Once it's there:

- **`claude.yml`** — write `@claude` in any issue or pull-request comment and Claude
  reads the repo, makes the change, and opens a PR. This is how you tweak the
  dashboard without touching code: *"@claude the lead cards are too narrow on my
  phone"* is a complete instruction.
- **`weekly-research.yml`** — every Monday, Claude does the lead research and opens
  a PR. You review it like any other PR. New leads arrive marked `unverified`.

Neither runs until a token exists. Until then they exit immediately and cost nothing,
so there's nothing to break by leaving them in place.

---

## Adding the token

Pick one. Both go in the same place: **the org repo → Settings → Secrets and variables
→ Actions → New repository secret** — that's
`github.com/qqadvertisement/qq-leads/settings`, and you need **admin** on the repo to
add a secret.

> Two things about the org move: GitHub Actions secrets **do not transfer** with a
> repository, so anything set on the old personal repo has to be re-added here. And on a
> private org repo an owner may need to have **Actions enabled** for it. If you aren't an
> org owner, that's a one-time ask to someone who is.

### Option A — use your Claude subscription (no extra billing)

Secret name: `CLAUDE_CODE_OAUTH_TOKEN`

Getting the value needs a terminal once. On a Mac, open **Terminal** (⌘-Space, type
"terminal") and run:

```bash
npm install -g @anthropic-ai/claude-code
claude setup-token
```

It opens a browser to log in, then prints a token. Copy it into the secret.

This is the only terminal step in the whole system, and it's one-time. The token is
tied to your account, so if someone else needs to run it later, use Option B instead.

### Option B — use an API key (no terminal, separate billing)

Secret name: `ANTHROPIC_API_KEY`

Create one at [platform.claude.com](https://platform.claude.com) → API keys. Entirely
web-based.

This bills separately from your Claude subscription, per use. A weekly research run
is a small amount of usage, but it is not zero — check current rates before you
enable the schedule, and set a spend limit on the key while you're in there.

---

## What each costs you in time

| | Setup | Ongoing |
|---|---|---|
| **No automation** (today) | none | Claude hands you a file each week; you drop it in with GitHub Desktop |
| **`@claude` in issues** | add the token | none — ask in plain English, review the PR |
| **Weekly research** | add the token | none — review a PR each Monday |

You can add the token and enable only `@claude` first, and leave the weekly run for
later. Delete `weekly-research.yml` if you'd rather not have it there at all.

---

## Trying it

**The `@claude` workflow:** open an issue in your repo, title it anything, and write:

> @claude the neighbourhood text on each card is too faint to read in dark mode —
> can you make it more legible?

Claude comments on the issue and opens a PR. Read the diff, click **Merge** if you
like it, or comment again with corrections.

**The weekly run, on demand:** repo → **Actions** tab → **Weekly lead research** →
**Run workflow**. It takes 10–30 minutes and opens a PR when it's done.

---

## Two things worth knowing

**Scheduled workflows only run from `main`.** If you change
`weekly-research.yml` on a branch, the new schedule doesn't take effect until it's
merged.

**GitHub pauses schedules on public repos after 60 days of no activity.** Merging
anything wakes it back up. Your weekly PRs count, so in practice this only bites if
you stop using it for two months.

---

## Reviewing what Claude opens

The research PR is where your judgment goes in. Worth checking:

- Does each new lead have a `sourceUrl` that actually proves the gap?
- Is every `gap.verification.status` set to `"unverified"`? It should always be —
  `scripts/validate.mjs` fails the build otherwise, but read it anyway.
- Does the PR description say honestly what it *couldn't* verify? A run that claims
  everything went perfectly is a run to look at harder.
- If it proposed a rule, does that rule generalise past the one lead that produced
  it? A rule that only ever applies to one restaurant is a note, not a rule.

You can always comment `@claude` on the PR to ask for changes rather than merging or
closing it.

---

## Connecting the dashboard so it saves for you (one-time)

This is separate from the Claude token above, and optional. Without it, saving a
verdict or logging an outreach still works — the dashboard copies a block of JSON and
you paste it into GitHub's web editor. Connect the dashboard once and that copy-paste
step disappears: **Save verdict**, **Log send**, and **Mark replied** commit straight
to `data/leads.json` from the page.

It's entirely web-based — no terminal.

1. Go to **GitHub → your photo (top-right) → Settings → Developer settings → Personal
   access tokens → Fine-grained tokens → Generate new token**. (The dashboard's
   **Connect GitHub** button links straight here.)
2. Give it a name like "qq-leads dashboard", set **Resource owner** to your account,
   and under **Repository access** pick **Only select repositories → `qq-leads`**.
3. Under **Permissions → Repository permissions**, set **Contents** to **Read and
   write**. Leave everything else alone.
4. Generate it, copy the token (starts with `github_pat_…`), open the dashboard, click
   **Connect GitHub**, paste it, and hit **Save**.

The token is stored **only in your browser** (nothing is uploaded, no server sees it),
and it only ever talks to your own `qq-leads` repo. Click **Disconnect** any time to
remove it. If you clear your browser data, just paste it again — or make a fresh one
and delete the old token on GitHub.

Saved verdicts and outreach go **straight to `main`**, so they're live on the
dashboard immediately. Because the site is deployed on Vercel from that same `main`
branch, each save also triggers a fresh Vercel deploy — the public page updates on its
own a moment later. The same validator that guards every PR (`scripts/validate.mjs`)
also runs on each save via the **Validate** workflow, so a bad write still gets
flagged.

> **The repo now lives in the `qqadvertisement` organization.** If it's private, the
> org may need to *allow* fine-grained tokens, and an org owner may have to approve
> yours once before it can write. In the token screen, set **Resource owner** to
> `qqadvertisement` (not your personal account). The connect bar tells you where you
> stand: after you paste a token it shows **"waiting for approval"** (amber) until an
> org owner approves it, then flips to **"Connected"** (green) — click **Re-check** the
> moment they approve to switch it on without reloading. While it's amber, saving still
> works via copy-paste, so you're never blocked. An org owner approves pending tokens at
> **Organization → Settings → Personal access tokens**.

> Fine-grained tokens can be given an expiry date. If yours expires, the dashboard
> quietly falls back to the copy-paste flow and tells you the save didn't go through —
> nothing is lost, you just make a new token.

---

## Reading a failed research run (without asking Claude)

When a **Weekly lead research** run fails, open the run's page and download the
**`claude-execution-output`** artifact (bottom of the page, under "Artifacts"). Unzip
it and open `claude-execution-output.json` in any text editor or browser — it's big
JSON, so use Find (Cmd+F). Read these three things, in order.

**1. Jump to the very end → the last `"result"` object.**

- `"subtype"` — often names the failure by itself (`error_max_turns`, `error_during_execution`, `success`).
- `"result"` — a text field with the actual error message or Claude's last words. The single most useful line.
- `"num_turns"` — if it's at the cap, it just ran long (see the max-turns note below).

**2. Cmd+F for these — first match tells you the cause:**

| Search for | Means | What to do |
|---|---|---|
| `usage limit` | The Claude subscription hit its cap mid-run | Wait for reset, cut scope, or move research to an API key |
| `overloaded` · `529` | Transient Anthropic hiccup | Just re-run — nothing to fix |
| `rate_limit` · `429` | Too many requests too fast | Re-run; if it repeats, cut scope |
| `Bad credentials` · `401` | The `CLAUDE_CODE_OAUTH_TOKEN` secret is bad/expired | Regenerate it, update the secret |
| `403` · `create pull request` · `not permitted` | Org blocks Actions from opening PRs | Turn on that org setting (Settings → Actions → General) |
| `prompt is too long` · `context` | Too much loaded into one call | Cut scope |
| `exceeding the configured maximum` | Ran more turns than the cap — **the work usually still finished** | Raise `--max-turns` in `weekly-research.yml` |

**3. If none hit,** search `"is_error":true` — every match *except* the final result is
a **failed tool call** (a Bash/WebFetch/Edit that broke). Read the `"content"` right
after it: a `validate.mjs` failure, a `git` error, a web fetch that 403'd. That's the
concrete thing that stopped it — the one worth sending to Claude to fix.

**Rule of thumb:** `overloaded`/`rate_limit` → re-run. `usage limit` → it's cost/plan,
change scope or billing. `401`/`403` → a token or org setting. A failed tool with real
output → a genuine bug.

> **"Failed" but a PR still appeared?** A run can finish the work, open the PR, and
> *then* be marked failed only because it used more turns than the cap
> (`exceeding the configured maximum of N`). The PR is real — check its data. And a
> green-data PR can still show a red **Validate** check if only the *calibration
> comment* step failed; the "Validate data files" line (`… 0 errors`) is the part that
> actually matters.
