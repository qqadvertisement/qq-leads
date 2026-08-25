# CLAUDE.md — working contract for this repo

Read this before doing anything. It applies to Claude and to any other LLM working here.

**Changing the software rather than doing research?** Read
[`docs/context.md`](docs/context.md) instead — design system, architectural decisions,
and what not to undo. This file is about running the lead research itself.

This repo runs a **lead research loop with a human verifier in the middle**. The machine is
fast and wrong often enough to matter. Angela is slow and right. The whole design exists to
route around that asymmetry — never to hide it.

---

## The one rule that matters

**You research. Angela verifies. Only Angela's verdict is truth.**

You may write `gap.verification.status` as `"unverified"` and nothing else. Ever.
You may write `outreach.draft`. You may never write `outreach.sent`.
Those two fields are Angela's signature on the work. Forging them destroys the training
signal the entire repo is built to collect.

If you believe a gap claim is certainly correct, it is still `"unverified"` until a human
opens a browser and says otherwise. This has already been tested three times and the machine
lost all three — see `rules/gap-verification.md`.

---

## Start every session by loading the current state of learning

```bash
node scripts/learn.mjs        # calibration + any rules awaiting approval
```

Then read, in this order:

1. `rules/icp.md` — who qualifies as a lead
2. `rules/gap-verification.md` — how to make a gap claim that survives a human check
3. `rules/outreach-voice.md` — how the drafts must sound

These three files are the accumulated memory of every mistake made so far. They are not
background reading; they are the spec. If a rule there contradicts your instinct, the rule
wins — it was written because your instinct already failed once.

---

## Data model

| File | What it is | Who writes it |
|---|---|---|
| `data/leads.json` | Every lead ever researched | Claude appends; Angela edits verification + sent |
| `data/feedback.json` | Append-only ledger of every human correction + the reason | Angela (via dashboard or by hand) |
| `data/excluded.json` | Dedupe list — checked and rejected, don't re-research | Claude appends |
| `rules/*.md` | Distilled, human-approved lessons | Proposed by Claude, **approved by Angela via PR** |

`data/` is state. `rules/` is what was learned from that state. Never write a rule directly
into `rules/` without a corresponding approved entry in `data/feedback.json` — a rule with no
provenance is just your opinion, and future sessions can't tell the difference.

---

## Adding leads (the weekly research run)

1. Load `data/leads.json` and `data/excluded.json`. **Skip anything already there within 60
   days**, matched on name, domain, or IG handle.
2. Research. Every gap claim needs a real `sourceUrl` that proves it. No source, no lead.
3. Set `gap.evidenceTier` honestly — this drives how hard Angela has to check it:
   - `routing` — a 404, redirect, or load failure. **Highest risk.** The crawler does not run
     JavaScript and cannot follow client-side routes.
   - `static` — a placeholder title, a missing viewport tag, a PDF menu. Low risk.
   - `absence` — "no website exists." Needs 2+ independent listings that each omit the field.
     You cannot fetch your way to proving a negative.
4. Write the outreach draft per `rules/outreach-voice.md`.
5. `node scripts/validate.mjs` must pass before you commit.
6. Open a PR. Never push to `main` directly.

## Never fabricate

No owner name has ever been confirmed for any lead across every run to date. Do not invent
one. `null` is a correct answer. "Could not verify" is a correct answer. A plausible guess
presented as a finding is the single most expensive thing you can do here, because it costs
Angela a real relationship with a real restaurant owner.

---

## Proposing a rule (how learning actually happens)

When `scripts/learn.mjs` shows feedback entries with `"ruleStatus": "proposed"`, your job is
to turn them into a candidate rule — **not** to append raw feedback to the rules files.

A good rule generalizes past the one lead that produced it:

> ✗ "Craft & Carvery's menu isn't actually broken."
> ✓ "A bare HTTP status code from a site builder usually means client-side routing the
>    crawler couldn't follow. A *rendered* 404 page with its own copy means the route is
>    genuinely missing. Only the second is safe to lead with."

Propose it in a PR that edits the relevant `rules/*.md` **and** flips that feedback entry's
`ruleStatus` to `"adopted"`. Angela merges or rejects. You do not self-merge, and you do not
adopt your own rules — a loop that grades its own homework drifts within a month.

## Running as a GitHub Action

`weekly-research.yml` runs this same job on a schedule and `claude.yml` responds to
`@claude` mentions. Same contract applies — you research, Angela verifies. Open ONE
pull request per run, never push to `main`, and say plainly in the PR description
what you could not verify. A PR that reports only successes is not trustworthy.

## Don't let the rules files rot

They are load-bearing context, read in full at the start of every run. Every line costs
tokens forever. When a new rule subsumes an old one, replace it — don't stack both.
If a rule hasn't changed a decision in months of runs, propose deleting it.
Prefer one sharp rule to three hedged ones.
