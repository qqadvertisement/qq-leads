#!/usr/bin/env node
/**
 * validate.mjs — schema + integrity checks. CI runs this on every PR.
 *
 * The point is not to be strict for its own sake. Each check below corresponds to a way
 * this dataset has actually gone wrong or would silently corrupt the learning signal.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const GAP_TYPES = ['No website', 'Broken links', 'No menu online', 'Weak / outdated site', 'Not mobile-friendly'];
const TIERS = ['routing', 'static', 'absence'];
const VERDICTS = ['unverified', 'confirmed', 'wrong', 'partial'];
const IG_STATUS = ['active-est', 'handle-found', 'unconfirmed', 'personal-account-only', 'not-found'];
const CHANNELS = ['email', 'instagram', 'phone'];
const REPLY = ['replied', 'none'];
const PRIORITIES = ['high', 'medium', 'low', 'skip'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BANNED = [
  'i hope this finds you well', 'i wanted to reach out', 'leverage', 'solutions',
  'elevate', "in today's digital landscape", 'unlock', 'seamless',
];

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const leads = read('data/leads.json');
const feedback = read('data/feedback.json');
read('data/excluded.json');
let diagnoses = [];
try { diagnoses = read('data/diagnoses.json'); } catch { /* optional file */ }

const seen = new Set();
for (const l of leads) {
  const at = `${l.id ?? '(no id)'}`;

  if (!l.id) err(`lead "${l.name}" has no id`);
  if (seen.has(l.id)) err(`duplicate lead id: ${l.id}`);
  seen.add(l.id);

  if (!l.name) err(`${at}: missing name`);
  if (typeof l.score !== 'number' || l.score < 1 || l.score > 5) err(`${at}: score must be 1-5, got ${l.score}`);

  if (!GAP_TYPES.includes(l.gap?.type)) err(`${at}: gap.type "${l.gap?.type}" is not one of the five categories`);
  if (!TIERS.includes(l.gap?.evidenceTier)) err(`${at}: gap.evidenceTier must be one of ${TIERS.join('|')}`);

  // A lead may carry several gaps. gap.types (optional) is the full set Angela curated;
  // each entry must be a real category, and it must include the primary gap.type.
  if (l.gap?.types !== undefined) {
    if (!Array.isArray(l.gap.types) || l.gap.types.length === 0) {
      err(`${at}: gap.types must be a non-empty array when present`);
    } else {
      for (const t of l.gap.types) {
        if (!GAP_TYPES.includes(t)) err(`${at}: gap.types contains "${t}", not one of the five categories`);
      }
      if (!l.gap.types.includes(l.gap.type)) err(`${at}: gap.types must include the primary gap.type "${l.gap.type}"`);
    }
  }
  // Angela's personal outreach priority (optional): high/medium/low, or skip = "no reach".
  if (l.priority != null && !PRIORITIES.includes(l.priority)) {
    err(`${at}: priority "${l.priority}" must be one of ${PRIORITIES.join('|')}`);
  }
  if (!VERDICTS.includes(l.gap?.verification?.status)) err(`${at}: gap.verification.status invalid`);
  if (!IG_STATUS.includes(l.instagram?.status)) err(`${at}: instagram.status "${l.instagram?.status}" invalid`);

  // Every gap claim needs proof. This is the rule that keeps research honest.
  if (l.gap?.claim && !l.gap?.sourceUrl && l.run >= '2026-08-24') {
    warn(`${at}: gap claim has no sourceUrl`);
  }

  // A verified verdict must say who checked it and when, or it isn't a human verdict.
  const v = l.gap?.verification;
  if (v?.status !== 'unverified') {
    if (!v.checkedBy) err(`${at}: verification is "${v.status}" but checkedBy is empty — verdicts need an owner`);
    if (!v.checkedOn) err(`${at}: verification is "${v.status}" but checkedOn is empty`);
    if (v.status === 'wrong' && !v.note) {
      err(`${at}: a "wrong" verdict must carry a note explaining what was actually true`);
    }
  }

  // Outreach constraints from rules/outreach-voice.md.
  for (const field of ['draft', 'sent']) {
    const text = l.outreach?.[field];
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const phrase of BANNED) {
      if (lower.includes(phrase)) err(`${at}: outreach.${field} contains banned phrase "${phrase}"`);
    }
    if (/\$\s?\d|\d+\s?(?:\/mo|per month|dollars)/i.test(text)) {
      err(`${at}: outreach.${field} appears to mention pricing — never allowed in a draft`);
    }
  }

  // Outreach tracking fields — the record of what actually went out and what came back.
  const o = l.outreach ?? {};
  if (o.channel != null && !CHANNELS.includes(o.channel)) err(`${at}: outreach.channel "${o.channel}" must be ${CHANNELS.join('|')}`);
  if (o.reply != null && !REPLY.includes(o.reply)) err(`${at}: outreach.reply "${o.reply}" must be ${REPLY.join('|')}`);
  if (o.sentOn != null && !ISO_DATE.test(o.sentOn)) err(`${at}: outreach.sentOn "${o.sentOn}" must be YYYY-MM-DD`);
  if (o.repliedOn != null && !ISO_DATE.test(o.repliedOn)) err(`${at}: outreach.repliedOn "${o.repliedOn}" must be YYYY-MM-DD`);
  // A send has to carry its date and channel, or the 2-week reply clock can't be computed.
  if (o.sent) {
    if (!o.sentOn) err(`${at}: outreach.sent is set but sentOn is missing — the 2-week reply clock needs the send date`);
    if (!o.channel) err(`${at}: outreach.sent is set but channel is missing — record email or instagram`);
  }
  // A reply can't exist before the message that prompted it.
  if ((o.reply != null || o.repliedOn != null) && !o.sent) {
    err(`${at}: outreach records a reply but nothing was sent`);
  }

  // Sending on an unverified gap is the exact failure the repo exists to prevent.
  if (l.outreach?.sent && l.gap?.verification?.status === 'unverified') {
    err(`${at}: marked as sent, but the gap was never verified`);
  }
  // A "wrong" verdict doesn't always kill the lead — sometimes the claim was false but a
  // real gap sits underneath it. That replacement has to be written down, because it's
  // what the message is actually built on. Without it, "sent on a wrong verdict" means
  // a message went out repeating a claim we know to be false.
  if (l.outreach?.sent && l.gap?.verification?.status === 'wrong' && !l.gap?.supersededBy) {
    err(`${at}: sent on a "wrong" verdict with no gap.supersededBy — record the corrected gap the message is built on`);
  }
}

const leadIds = new Set(leads.map((l) => l.id));
const fbIds = new Set();
for (const f of feedback) {
  if (fbIds.has(f.id)) err(`duplicate feedback id: ${f.id}`);
  fbIds.add(f.id);
  if (f.leadId && !leadIds.has(f.leadId)) warn(`${f.id}: references unknown leadId ${f.leadId}`);
  if (!['proposed', 'adopted', 'rejected'].includes(f.ruleStatus)) err(`${f.id}: bad ruleStatus "${f.ruleStatus}"`);
  if (!f.reason) err(`${f.id}: every feedback entry needs a reason — the reason IS the lesson`);
  if (f.ruleStatus === 'adopted' && !f.adoptedInto) err(`${f.id}: adopted but no adoptedInto path`);
}

// On-demand diagnoses (data/diagnoses.json) — a separate scratch view fed by diagnose.yml.
// The page only ever writes a "requested" stub; the Action fills the result. A finished
// diagnosis is held to the same honesty bar as a lead: a real gap category, an honest
// evidence tier, and a draft with no pricing and none of the banned phrases.
const DX_STATUS = ['requested', 'researching', 'done', 'failed'];
if (!Array.isArray(diagnoses)) {
  err('data/diagnoses.json must be an array');
} else {
  const dxSeen = new Set();
  for (const d of diagnoses) {
    const at = `diagnosis ${d.id ?? '(no id)'}`;
    if (!d.id) err(`${at}: missing id`);
    if (dxSeen.has(d.id)) err(`duplicate diagnosis id: ${d.id}`);
    dxSeen.add(d.id);
    if (!DX_STATUS.includes(d.status)) err(`${at}: status "${d.status}" must be one of ${DX_STATUS.join('|')}`);
    if (!d.input?.name) err(`${at}: input.name is required`);
    if (d.status === 'failed' && !d.error) err(`${at}: a "failed" diagnosis must carry an "error" saying why`);
    if (d.status === 'done') {
      const r = d.result;
      if (!r) { err(`${at}: status is "done" but result is empty`); continue; }
      if (!GAP_TYPES.includes(r.gap?.type)) err(`${at}: result.gap.type "${r.gap?.type}" is not one of the five categories`);
      if (!TIERS.includes(r.gap?.evidenceTier)) err(`${at}: result.gap.evidenceTier must be one of ${TIERS.join('|')}`);
      if (r.gap?.claim && !r.gap?.sourceUrl) warn(`${at}: result gap claim has no sourceUrl`);
      if (typeof r.score !== 'number' || r.score < 1 || r.score > 5) err(`${at}: result.score must be 1-5, got ${r.score}`);
      const draft = r.outreach?.draft;
      if (draft) {
        const lower = draft.toLowerCase();
        for (const phrase of BANNED) {
          if (lower.includes(phrase)) err(`${at}: result outreach draft contains banned phrase "${phrase}"`);
        }
        if (/\$\s?\d|\d+\s?(?:\/mo|per month|dollars)/i.test(draft)) {
          err(`${at}: result outreach draft appears to mention pricing — never allowed`);
        }
      }
    }
  }
}

for (const w of warnings) console.log(`\x1b[33mwarn\x1b[0m  ${w}`);
for (const e of errors) console.log(`\x1b[31mERROR\x1b[0m ${e}`);

console.log(
  `\n${leads.length} leads · ${feedback.length} feedback entries · ` +
  `${Array.isArray(diagnoses) ? diagnoses.length : 0} diagnoses · ` +
  `${errors.length} errors · ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
