# Project context — read this before changing anything

`CLAUDE.md` is the contract for *doing lead research*. This file is the context for
*changing the software*. If you're here to edit the dashboard, fix a bug, or add a
feature, start here.

---

## Who you're working for

Angela runs lead research for QQ Studio, a small agency building websites for
independent Chicago restaurants. **She is not an engineer.** That shapes how you work:

- Explain what you changed in plain language. "Made the cards wider on phones" —
  not "adjusted the grid-template-columns minmax."
- Never leave her a step that requires a terminal. She has one already (getting a
  Claude token) and that's the budget.
- If a change needs a decision from her, ask it as a real-world question, not a
  technical one. "Should a lead you've already sent still show in the main list?"
  beats "should `status: sent` be filtered from the default view?"
- She will catch things you get wrong. That's the point of the whole system — don't
  paper over uncertainty to sound confident.

---

## The one architectural decision — don't undo it

**Data lives in `data/*.json`. The dashboard is a renderer that contains no data.**

This system replaced a single HTML file that had the leads embedded in a JavaScript
array. That version failed for a specific reason: recording a verification verdict
meant editing code inside a web page, so verdicts never got recorded, and the lessons
from wrong findings survived only in someone's memory.

If you find yourself about to put lead content into `index.html`, or add a build step
that bakes data into the page, stop. The whole value is that a non-engineer can change
a verdict by editing one JSON field through GitHub's web editor.

Corollary: `index.html` fetches `./data/*.json` at runtime. That means it does **not**
work when opened as a `file://` URL — the page shows an explanatory error instead.
That's expected. Test with `npx serve .` or on GitHub Pages.

---

## Design system

Don't restyle by instinct. The palette is deliberate and validated.

**Colors** are CSS custom properties on `:root`, redefined in two dark blocks. The
categorical hues (`--cat-1` … `--cat-5`, used for gap types) come from a
contrast-and-colorblindness-validated palette — their *order* is the accessibility
mechanism, not decoration. Don't reassign which gap type gets which hue, and don't
add a sixth without checking contrast on both surfaces.

Two of them carry a `-fill` variant (`--cat-4` / `--cat-4-fill`, `--cat-5` /
`--cat-5-fill`). The base value is darkened so it passes contrast **as text**; the
`-fill` value is the original, used only for chart bars and background washes. Using
the fill value for text is a real accessibility regression.

| Role | Token |
|---|---|
| Page background | `--page` |
| Card / panel surface | `--surface`, `--surface-2` |
| Text | `--ink`, `--ink-2`, `--ink-muted` |
| Brand accent (terracotta) | `--brand`, `--brand-soft` |
| Verdict states | `--good`, `--warn`, `--serious`, `--critical` |
| Gap types | `--cat-1` … `--cat-5` (+ `-fill` on 4 and 5) |

**Theme handling has three states, not two.** A bare `:root` block defines light. A
`@media (prefers-color-scheme: dark)` block guarded with `:root:not([data-theme="light"])`
handles OS dark. A `:root[data-theme="dark"]` block handles an explicit toggle. Never
declare a color only inside a media or `[data-theme]` block — it won't apply in the
default un-stamped state and you'll get one theme's text on the other's background.

**Type:** Archivo (headings, 600–800), Public Sans (body), IBM Plex Mono (IDs, code).
Loaded from Google Fonts, which is the only external host the page can reach.

**Everything is inline.** One HTML file, no build step, no dependencies, no CDN
scripts. Keep it that way — it's what makes the whole thing survivable by someone who
can't debug a toolchain.

---

## What's deliberately constrained

These aren't arbitrary; each one exists because something went wrong.

- **`gap.verification.status` may only ever be written as `"unverified"` by a machine.**
  Only Angela sets confirmed / wrong / partial.
- **`outreach.sent` is never written by a machine.** It's her signature on a message
  that went to a real person. The dashboard's **Log send** button *does* write it — but
  that's Angela clicking it in her own browser with her own token, which is her
  signature, not a research run forging one. A weekly-research run still may never touch
  it.
- **A `wrong` verdict requires a note.** `scripts/validate.mjs` fails the build without
  one. The note is the only part that can become a rule.
- **A draft edit requires a reason.** The dashboard blocks Copy JSON otherwise.
- **No pricing, no invented owner names, no banned phrases** in any draft — enforced by
  the validator, not just documented.

If a change would relax any of these, that's a conversation with Angela, not a
refactor.

---

## How the pieces fit

```
data/leads.json ──► index.html renders it
       ▲                  │
       │                  ▼
       │          Angela verifies / edits a draft
       │                  │
       │                  ▼
       │          data/feedback.json  (the correction + WHY)
       │                  │
       │                  ▼
       │          rules/*.md  (generalized, approved by PR)
       │                  │
       └──────────────────┘  next research run reads rules first
```

`scripts/learn.mjs` reports overturn rate by evidence tier — the number that says which
gap claims the machine is actually unreliable about. `scripts/validate.mjs` runs in CI
on every PR.

---

## History worth knowing

- The dashboard began as a Claude artifact with embedded data. Moved to this repo
  2026-08-25 for the reason in the architecture section above.
- Three gap findings were overturned by Angela opening a browser (Craft & Carvery,
  Chef Thiago, Jomon Sushi). Two were phantom 404s caused by client-side routing the
  crawler couldn't follow. Those three failures produced most of
  `rules/gap-verification.md`.
- The first outreach drafts read as surveillance — they listed multiple defects and
  never said how the sender found the page. That produced the five-beat structure in
  `rules/outreach-voice.md`.
- 28 leads across two research runs are in `data/leads.json`. As of the migration,
  **none had been human-verified yet** — every card was still a machine guess.

## Outreach tracking (the send → reply lifecycle)

Each lead's `outreach` block records what actually went out and what came back:

| Field | Meaning |
|---|---|
| `draft` | Claude's message. Never overwritten — it's the baseline for the edit delta. |
| `sent` | The exact text Angela sent. Her signature (see constraints above). |
| `channel` | `"email"` or `"instagram"` — how it went out. |
| `sentOn` | `YYYY-MM-DD` — anchors the two-week reply clock. |
| `reply` | `"replied"` or `"none"` — set explicitly by Angela. |
| `repliedOn` | `YYYY-MM-DD` when she marked it replied. |
| `revisions` | How many times the draft was edited before sending. |

**Reply state is derived from the date, not stored.** A message with `sent` set, no
`reply`, and a `sentOn` more than 14 days ago renders as "No reply after 2 weeks"
automatically — nobody has to mark it. `reply: "none"` is only for closing one out
early. The validator requires `sentOn` + `channel` whenever `sent` is set, so the clock
can always be computed.

## The dashboard write-path (how the copy-paste went away)

The dashboard can commit `data/leads.json` and `data/feedback.json` directly through
the GitHub Contents API, using a fine-grained token Angela pastes once (stored only in
her browser — see `docs/automation.md`). Saves go straight to `main`; the Validate
workflow still runs on the push.

This does **not** violate the "dumb renderer, data in JSON" decision above. The data
still lives only in `data/*.json`; the page holds none of it. The token path just
automates the exact commit Angela used to make by hand in GitHub's web editor. When no
token is connected, every save falls back to the original copy-JSON + "Edit on GitHub"
flow, so nothing regresses and the page still works as a pure static file.

## Known gaps / open items

- `data/excluded.json` has entries marked `recheck` (Rogers Park Social, Staropolska)
  that have real gaps but couldn't clear the Instagram-reachable test. If outreach ever
  adds a Facebook channel, they qualify immediately.
- The dashboard has no search — fine at 28 leads, will bite around 100.
- The browser-stored token is an accepted tradeoff for staying serverless: it's a
  fine-grained token scoped to this one repo's contents, on Angela's own origin, on a
  page with no third-party scripts. A GitHub App or serverless proxy would avoid
  storing it at all, at the cost of the "no server" simplicity.

---

## Making a change safely

1. Work on a branch. Never push to `main`.
2. `node scripts/validate.mjs` must pass.
3. If you touched `index.html`, load it (`npx serve .`) and check **both themes** and a
   narrow window. Theme bugs are the most common regression here.
4. In the PR description, say what changed in language Angela can act on, and flag
   anything you were unsure about.
