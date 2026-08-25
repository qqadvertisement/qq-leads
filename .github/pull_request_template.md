## What this changes

<!-- New leads? A verification verdict? A proposed rule? -->

## Checklist

- [ ] `node scripts/validate.mjs` passes
- [ ] Every new gap claim has a `sourceUrl` that actually proves it
- [ ] Every new lead's `gap.verification.status` is `"unverified"`
- [ ] No pricing, no invented owner names in any draft

## If this proposes a rule

- [ ] There's a matching entry in `data/feedback.json` with a real `reason`
- [ ] That entry's `ruleStatus` is flipped to `"adopted"` with an `adoptedInto` path
- [ ] The rule generalizes past the single lead that produced it
- [ ] It replaces an older rule rather than stacking on top of one, where they overlap

> Claude does not merge its own rule PRs.
