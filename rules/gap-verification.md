# Gap verification rules

Every rule here was bought with a real mistake. The provenance ID points at the
`data/feedback.json` entry that produced it.

---

## Records are safe. Renders are not.

The tiers below sort by risk, but the thing actually predicting risk is simpler than the tier
name. Ask what kind of fact the claim is:

- A claim about a **record** — a listing that has no website field, a domain with no DNS entry,
  a directory pointing at a URL that no longer exists. Records are static data. The crawler and
  the browser read them identically, so there is nothing for a browser check to overturn.
- A claim about a **render** — what a page shows a visitor. A menu that "is an image", a
  placeholder title, a missing viewport, a 404. Rendered output can differ between a crawler
  and a browser, and it routinely does.

Every gap claim overturned in the 2026-08-21 pass was a render claim. Every absence claim, all
of which were record claims, survived. "Static" is not a safety property: a menu served as an
image is a claim about rendered output, and it failed as often as routing did. Classify by
record-vs-render first, then pick the tier.

*Provenance: fb-2026-08-21-105, fb-2026-08-21-107, fb-2026-08-21-110, fb-2026-08-21-115*

---

## The three-tier rule

No message goes out on a gap only a crawler has seen. Tiers in descending risk:

**1. Routing / loading claims** — a 404, a redirect, a failure to load.
This tier has been wrong twice out of three checks. **Never send unchecked.**

> Heuristic: a *rendered* 404 page with its own copy means the server truly has no such
> route. A bare HTTP status code from a site builder usually means client-side routing the
> crawler could not follow. Only the first is safe to lead with.

*Provenance: fb-2026-08-21-001, fb-2026-08-21-002*

**2. Static-content claims** — a PDF menu, an image menu, a placeholder page title, a missing
viewport tag, an address on the page.

These were documented as "low risk, ten seconds to confirm." **The data says otherwise.** As of
the 2026-08-21 verification pass, static claims were overturned in 4 of 8 checks — nearly as
unreliable as routing claims. Two failures were the same shape: the crawler saw a menu as an
image or a PDF, but the live site actually served readable text (Monarch Community Cafe, Sapori
Napoletani). A page can serve different markup to a crawler than to a browser, and "the menu is
an image" is a claim about rendered output, not a static asset after all.

Treat static claims as needing a real browser check too. Run `node scripts/learn.mjs` for the
current overturn rate rather than trusting any fixed ordering written here — the numbers move
as verdicts accumulate, and they beat this paragraph.

**3. Absence claims** — "no website exists." Corroborate across two or more independent
listings that each omit a website field.

This is the tier that has actually held up: **0 of 4 overturned** in the 2026-08-21 pass. The
reason is structural — an absence claim is a statement about listings, and listings are static
records rather than rendered pages, so the crawler-vs-browser gap doesn't apply. Lead with these
when you have them.

---

## An unfinished site and a neglected site look identical from outside

They mean opposite things commercially. A Wix placeholder with demo content might be a
restaurant that gave up, or it might be a site someone is actively building this week —
and pitching the second one is embarrassing at best.

Before leading with a placeholder or template-default gap, check whether the business
recently changed hands, recently opened, or has a visible agency/builder attached. If it
opened in the last ~60 days, assume mid-build unless proven otherwise.

*Provenance: fb-2026-08-21-003*

---

## Withdraw the claim, keep the lead

When a gap claim fails verification, the lead is not necessarily dead — the *opener* is.
Chef Thiago's "too many redirects" was wrong, but "no menu on the site, the only route in is
an Order Online button" was true, better, and still factual. Look for the real gap before
discarding.

Corollary: a design opinion is not a defect. "Menu and photos are on separate screens" is
taste, not breakage, and it makes for a weak opener. Don't dress one up as the other.

*Provenance: fb-2026-08-21-002*

---

## Follow the route the customer actually takes

Check the path most people use, not the tidiest one. That is usually the **link in the
Instagram bio** — not the domain printed in a directory. A dead bio link is far more
customer-visible than a stale entry in a listing nobody reads, and it is the failure most
worth leading with. Check the bio link, the Google listing link, and the link in any press
piece currently sending people their way.

*Provenance: fb-2026-08-21-112*

---

## A placeholder claim is several claims. Verify each one.

"It is an unedited template" and "it shows a San Francisco demo address" are two separate
factual assertions, and the second can be false while the first is true. Every specific
detail you cite — the demo address, the fake phone number, the stock social links, the
copyright year — is independently checkable and independently wrong-able. Cite only the
specifics you actually confirmed, and drop the rest rather than padding the claim.

The same applies in reverse: when a claim comes back `partial`, the usual cause is either a
specific that was off, or a more customer-visible defect sitting next to the one you led with.
Look for the second before rewriting the first.

*Provenance: fb-2026-08-21-102, fb-2026-08-21-111*

---

## Source reliability (updated as we learn it)

- **Reliably fetchable:** TripAdvisor listing pages, chamber-of-commerce and
  neighborhood-association directories, the business's own site, the Chicago open-data
  business-license API.
- **Blocks automated fetching, essentially always:** Yelp `/biz/` pages, Facebook, Instagram,
  Bing, DuckDuckGo, Block Club Chicago, Google Maps (JS-rendered).
- **Auto-generated listing mills** (goto-restaurants.com, weeblyte.com, restaurants-world.net
  and similar) look like a real result in a search list but are not an owner-built site.
  Their presence is evidence *for* a "No website" gap, not against it.

## Instagram recency is a weak signal

Search-indexed IG posts skew years old even for businesses that post weekly. When the only
evidence of activity is an indexed post more than a year old, the status is `unconfirmed` —
not `active-est`. Do not let an old post read as recent activity.

*Provenance: fb-2026-08-24-001*
