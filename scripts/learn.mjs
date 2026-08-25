#!/usr/bin/env node
/**
 * learn.mjs — what the loop has actually taught us so far.
 *
 * Run this at the START of every research session. It answers two questions:
 *   1. How often is the machine wrong, and about what? (calibration)
 *   2. What has Angela corrected that hasn't been turned into a rule yet? (backlog)
 *
 * No LLM call, no network. Just arithmetic over the human verdicts already recorded.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const leads = read('data/leads.json');
const feedback = read('data/feedback.json');

const b = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const pct = (n, d) => (d === 0 ? '  —  ' : `${String(Math.round((n / d) * 100)).padStart(3)}%`);

console.log(`\n${b('Lead verification calibration')}\n`);

const verified = leads.filter((l) => l.gap.verification.status !== 'unverified');
const unverified = leads.length - verified.length;

if (verified.length === 0) {
  console.log(dim('  No leads verified yet. Every gap claim below is still a machine guess.\n'));
} else {
  // Overturn rate by evidence tier — the single most useful number here.
  // A tier that gets overturned often should not be led with, no matter how convincing it looks.
  const tiers = ['routing', 'static', 'absence'];
  console.log(`  ${'tier'.padEnd(10)} ${'checked'.padStart(8)} ${'confirmed'.padStart(10)} ${'wrong'.padStart(7)} ${'overturn'.padStart(9)}`);
  console.log(dim(`  ${'-'.repeat(48)}`));
  for (const t of tiers) {
    const inTier = verified.filter((l) => l.gap.evidenceTier === t);
    const ok = inTier.filter((l) => l.gap.verification.status === 'confirmed').length;
    const bad = inTier.filter((l) => l.gap.verification.status === 'wrong').length;
    const partial = inTier.filter((l) => l.gap.verification.status === 'partial').length;
    console.log(
      `  ${t.padEnd(10)} ${String(inTier.length).padStart(8)} ${String(ok).padStart(10)} ${String(bad + partial).padStart(7)} ${pct(bad + partial, inTier.length).padStart(9)}`,
    );
  }
  console.log();

  // Same cut by gap type — tells you which openers to stop using.
  const byGap = {};
  for (const l of verified) {
    const g = (byGap[l.gap.type] ??= { n: 0, bad: 0 });
    g.n++;
    if (l.gap.verification.status !== 'confirmed') g.bad++;
  }
  const rows = Object.entries(byGap).sort((a, x) => x[1].bad / x[1].n - a[1].bad / a[1].n);
  if (rows.length) {
    console.log(`  ${b('By gap type')}`);
    for (const [gap, s] of rows) {
      const flag = s.n >= 3 && s.bad / s.n > 0.4 ? '  ← stop leading with this' : '';
      console.log(`  ${gap.padEnd(22)} ${pct(s.bad, s.n)} overturned  ${dim(`(${s.bad}/${s.n})`)}${flag}`);
    }
    console.log();
  }
}

console.log(`  ${verified.length} verified · ${b(String(unverified))} awaiting a human check\n`);

// ---- Outreach edits -------------------------------------------------------
const sentAny = leads.filter((l) => l.outreach.sent);
const edited = sentAny.filter((l) => l.outreach.draft && l.outreach.sent !== l.outreach.draft);
const sentUnchanged = sentAny.filter((l) => l.outreach.draft && l.outreach.sent === l.outreach.draft);
console.log(`${b('Outreach drafts')}\n`);
console.log(`  sent as-drafted: ${sentUnchanged.length}   edited before sending: ${edited.length}`);
if (edited.length) {
  const grew = edited.filter((l) => l.outreach.sent.length > l.outreach.draft.length).length;
  const avgDelta = Math.round(
    edited.reduce((s, l) => s + (l.outreach.sent.length - l.outreach.draft.length), 0) / edited.length,
  );
  console.log(
    dim(`  average length change: ${avgDelta > 0 ? '+' : ''}${avgDelta} characters (${grew} of ${edited.length} got longer)`),
  );
  // If nothing ever ships unedited, the drafts are raw material rather than a product.
  // Worth stating plainly instead of leaving it buried in the numbers.
  if (sentUnchanged.length === 0 && edited.length >= 3) {
    console.log(dim('  nothing has ever been sent unedited — drafts are raw material, not output'));
  }
}
console.log();

// ---- Rules backlog --------------------------------------------------------
const proposed = feedback.filter((f) => f.ruleStatus === 'proposed');
const adopted = feedback.filter((f) => f.ruleStatus === 'adopted');

console.log(`${b('Rules')}\n`);
console.log(`  ${adopted.length} adopted · ${proposed.length} awaiting review\n`);

if (proposed.length) {
  console.log(`  ${b('These corrections have not become rules yet:')}\n`);
  for (const f of proposed) {
    console.log(`  ${b(f.id)}  ${dim(f.kind)}${f.leadId ? dim(`  ${f.leadId}`) : ''}`);
    console.log(`    claimed: ${f.claimed}`);
    console.log(`    actual:  ${f.actual}`);
    console.log(`    reason:  ${f.reason}`);
    if (f.proposedRule) console.log(`    → rule:  ${f.proposedRule}`);
    console.log();
  }
  console.log(dim('  Turn these into rules/*.md edits in a PR, and flip ruleStatus to "adopted".\n'));
} else {
  console.log(dim('  Nothing awaiting review. rules/*.md is current.\n'));
}
