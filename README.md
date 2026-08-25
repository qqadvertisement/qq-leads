# QQ Studio — Restaurant Lead Research

Weekly lead research for QQ Studio's restaurant website outreach, built so **a human verifies
before anything ships** and **every correction becomes a rule the next run follows**.

Dashboard: `https://<your-username>.github.io/qq-leads/`

---

## Why this is a repo and not an artifact

The old dashboard kept the leads *inside* the HTML. Recording one verdict meant editing a
JavaScript array inside a web page — so in practice, verdicts never got recorded, and every
lesson learned lived only in someone's memory.

Here the data is separate from the view:

```
data/leads.json      ← the leads
data/feedback.json   ← every correction you made, and why
rules/*.md           ← what was learned from those corrections
index.html           ← a dumb renderer; you never need to touch it
```

A verdict is now a one-line data change with a commit message attached. Git gives you the
history for free, and the rules files give the next LLM run the accumulated lessons.

---

## The loop

```
  1. RESEARCH        Claude appends leads to data/leads.json          (a PR)
        ↓            every gap is "unverified" — no exceptions
  2. VERIFY          You open the gap in a browser and rule on it
        ↓            confirmed / wrong / partial + a note
  3. REFINE          You edit the outreach draft before sending
        ↓            and record why you changed it
  4. DISTILL         Corrections that generalize become rules/*.md    (a PR you approve)
        ↓
  5. NEXT RUN        Claude loads rules/*.md first, and doesn't repeat the mistake
```

Step 4 is the part that makes this a learning system rather than a filing cabinet. Raw
corrections don't teach anything on their own — the *reason* is the lesson, and a lesson only
counts once it's been generalized past the lead that produced it.

---

## Your weekly pass (about 15 minutes)

1. Open the dashboard. Filter **Verification → unverified**.
2. For each lead: open the source link, look at the gap with your own eyes.
   - The card tells you how risky the claim is. `Routing` claims are the ones that have burned
     us — the crawler can't run JavaScript, so a 404 may just be client-side routing.
3. Hit **Confirmed / Wrong / Partial**, add a note, hit **Copy JSON**.
4. Hit **Edit on GitHub**, paste into the right lead's `gap.verification` block, commit.
   - A `wrong` verdict also gives you a `feedback.json` entry to paste. Fill in the `reason`
     and the `proposedRule` — those two fields are what the next run actually learns from.
5. To refine a draft: open **Outreach draft — click to read and edit** on the card, edit the
   text, say why you changed it, hit **Copy JSON**, and paste it the same way. The dashboard
   won't let you copy an edit with no reason — the reason is the only part that generalises.

You never need to run anything locally. GitHub's web editor works from a phone.

---

## Teaching it something new

The dashboard's **What the system has learned** panel is the visible version of this: rules in
effect, and corrections still waiting to become one.

Anything you correct with a reason ends up in `data/feedback.json` as `"ruleStatus": "proposed"`.
Then either you or Claude opens a PR that:

- edits the relevant file in `rules/` with the generalized version of the lesson, and
- flips that feedback entry to `"ruleStatus": "adopted"` with an `adoptedInto` path.

You merge it. **Claude never merges its own rules** — a loop that grades its own homework
drifts within a month.

Rules already learned this way (all from real overturned findings):

| Rule | Came from |
|---|---|
| A bare HTTP status from a site builder ≠ a broken page | Craft & Carvery's phantom 404 |
| Look for the real gap before discarding an overturned lead | Chef Thiago's phantom redirect |
| A mid-build site and a neglected site look identical | Jomon Sushi |
| Five-beat outreach structure, one defect only | v1 drafts read as surveillance |
| Old indexed IG posts prove nothing either way | Two leads with years-old indexed posts |

---

## Letting Claude do the work inside GitHub

Two workflows ship switched off in `.github/workflows/`:

- **`claude.yml`** — write `@claude <what you want>` in an issue or PR comment, get a PR back.
  This is how you change the dashboard without writing code.
- **`weekly-research.yml`** — Monday cron; Claude researches and opens a PR you review.

Both need one secret before they do anything. Setup and the billing trade-off:
[`docs/automation.md`](docs/automation.md).

---

## Commands

```bash
node scripts/learn.mjs      # calibration + rules awaiting review — run this FIRST
node scripts/validate.mjs   # schema + integrity checks (CI runs this on every PR)
npx serve .                 # preview the dashboard locally
```

`validate.mjs` fails the build on things that would corrupt the signal: a lead marked sent
without a verified gap, a `wrong` verdict with no note, pricing in a draft, a banned phrase,
a gap type outside the five categories.

---

## Setup

1. Push this repo to GitHub.
2. **Settings → Pages → Source: Deploy from a branch → `main` → `/ (root)`.**
3. Add collaborators. Turn on branch protection for `main` if you want PRs enforced.

The dashboard works out your GitHub username from the Pages URL, so there's nothing to
configure for the "Edit on GitHub" buttons.

## Layout

```
├── CLAUDE.md              contract for Claude / any LLM working here — read first
├── README.md              this file
├── index.html             dashboard (reads data/, never contains data)
├── data/
│   ├── leads.json         every lead ever researched
│   ├── feedback.json      append-only ledger of corrections + reasons
│   └── excluded.json      dedupe list — checked and rejected
├── rules/
│   ├── icp.md             who qualifies
│   ├── gap-verification.md  how to make a claim that survives a human check
│   └── outreach-voice.md  how drafts must sound
└── scripts/
    ├── learn.mjs          calibration + rules backlog
    └── validate.mjs       schema + integrity checks
```

## Ground rules

- **Claude may never write `gap.verification.status` as anything but `unverified`,** and may
  never write `outreach.sent`. Those two fields are your signature.
- No pricing in any draft, ever.
- No invented owner names. No owner name has been confirmed for any lead to date.
- Every gap claim needs a `sourceUrl` that proves it.
