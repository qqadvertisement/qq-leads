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

Pick one. Both go in the same place: **repo → Settings → Secrets and variables →
Actions → New repository secret**.

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
