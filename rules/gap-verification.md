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

Still the best tier, but no longer the safe one it looked like: **3 of 8 overturned** as of
2026-09-06, up from 0 of 4. Every new failure was the same shape — a site did exist, on a
platform, and the claim should have been `Weak / outdated site`. The structural argument still
holds (listings are records, not renders), so what broke was never the tier; it was searching
for an owned domain and concluding nothing existed. See the "if a site loads, it is a website"
rule in `icp.md` for the check that closes this.

---

## Placeholder and template-default gaps are the weakest openers we have

Every one of them has come back short. Two shapes, two separate lessons.

**An unfinished site and a neglected site look identical from outside**, and they mean
opposite things commercially. Before leading with a placeholder, check whether the business
recently changed hands, recently opened, or has an agency attached. If it opened in the last
~60 days, assume mid-build. But do not stop at new openings: Jomon had traded for years and
still came back *"already have a team building on that."* A placeholder says nothing about
whether an owner gave up — it is equally consistent with work in progress at any age of
business, and the age of the business does not tell you which.

**A defect the visitor never consciously reads is not a customer-visible wall.** Paper Tiger's
Squarespace `<title>Your Site Title` was factually correct, unrebutted, and still returned
`wrong`: *"the website exists, it just doesn't land well."* A title tag, an og: property, a
copyright year — nobody standing on the page sees them. Beat 2 wants the most *visible*
defect, so cite these as supporting texture at most, never as the opener.

*Provenance: fb-2026-08-21-003, fb-2026-09-01-vssv, fb-2026-09-01-19wo, fb-2026-09-03-65lg*

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

- **Reliably fetchable:** EatOkra listings, Atly listings, RestaurantGuru, chamber-of-commerce
  and neighborhood-association directories, the business's own site, the Chicago open-data
  business-license API.
- **Blocks automated fetching, essentially always:** Yelp `/biz/` pages, Facebook, Instagram,
  Bing, DuckDuckGo, Block Club Chicago, Google Maps (JS-rendered), **TripAdvisor** (moved here
  2026-09-06 — every `/Restaurant_Review-` fetch returned HTTP 403), restaurant.com, Zmenu.
- **Chamber directories go stale.** The belmontcragin.org listing showed "Facebook only" for
  businesses that in fact had live sites, and published dead `orderX.com` domains for two
  others. Treat a directory's website field as a lead to check, never as proof of absence.
- **The city business-license API is the sharpest tool here.** It settles open/closed, change
  of hands, and — via sibling legal names at different addresses — franchise and group
  structure, which is the ICP question hardest to answer from listings.
  `data.cityofchicago.org/resource/r5kz-chrr.json`, filter on `address` or
  `doing_business_as_name`; `license_status` `AAC` means cancelled.
- **Auto-generated listing mills** (goto-restaurants.com, weeblyte.com, restaurants-world.net
  and similar) look like a real result in a search list but are not an owner-built site.
  Their presence is evidence *for* a "No website" gap, not against it.

## Instagram recency is a weak signal

Search-indexed IG posts skew years old even for businesses that post weekly. When the only
evidence of activity is an indexed post more than a year old, the status is `unconfirmed` —
not `active-est`. Do not let an old post read as recent activity.

*Provenance: fb-2026-08-24-001*
