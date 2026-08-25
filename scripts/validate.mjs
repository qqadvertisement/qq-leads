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

  // Sending on an unverified gap is the exact failure the repo exists to prevent.
  if (l.outreach?.sent && l.gap?.verification?.status === 'unverified') {
    err(`${at}: marked as sent, but the gap was never verified`);
  }
  if (l.outreach?.sent && l.gap?.verification?.status === 'wrong') {
    err(`${at}: marked as sent, but the gap verdict is "wrong"`);
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

for (const w of warnings) console.log(`\x1b[33mwarn\x1b[0m  ${w}`);
for (const e of errors) console.log(`\x1b[31mERROR\x1b[0m ${e}`);

console.log(
  `\n${leads.length} leads · ${feedback.length} feedback entries · ` +
  `${errors.length} errors · ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
