// One-time migration: rewrite Airtable Link fields to the new canonical form
// (after introducing site-aware HOST_ALIASES in canonical.ts) and merge any
// records that collide on the new canonical URL.
//
// Usage:
//   pnpm dedupe:hosts             # dry-run, prints planned changes
//   pnpm dedupe:hosts --apply     # actually write to Airtable
//
// Loads AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE from project-root .env.local
// (existing process.env wins, matching the convention in extension/vite.config.ts).

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { canonicalize } from '../api/src/canonical';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function loadEnvLocal(): void {
  const envPath = resolve(REPO_ROOT, '.env.local');
  let text: string;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'Units';

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_PAT or AIRTABLE_BASE_ID. Set them in .env.local or your shell.');
  process.exit(1);
}

const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;
const headers = {
  Authorization: `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
};

const APPLY = process.argv.includes('--apply');

interface Record {
  id: string;
  createdTime: string;
  fields: {
    Name?: string;
    Link?: string;
    Tags?: string[];
    Status?: string;
    Type?: string;
    'Done date'?: string;
  };
}

async function listAllRecords(): Promise<Record[]> {
  const all: Record[] = [];
  let offset: string | undefined;
  do {
    const url = offset ? `${BASE_URL}?offset=${encodeURIComponent(offset)}` : BASE_URL;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`List failed: ${res.status} ${res.statusText} - ${await res.text()}`);
    }
    const data = (await res.json()) as { records: Record[]; offset?: string };
    all.push(...data.records);
    offset = data.offset;
  } while (offset);
  return all;
}

async function patchRecord(id: string, fields: Partial<Record['fields']>): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    throw new Error(`PATCH ${id} failed: ${res.status} ${res.statusText} - ${await res.text()}`);
  }
}

async function deleteRecord(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE', headers });
  if (!res.ok) {
    throw new Error(`DELETE ${id} failed: ${res.status} ${res.statusText} - ${await res.text()}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Case-insensitive tag union, preserving the case of the first occurrence
// (matches processTagsForCreation in api/src/airtable.ts).
function mergeTags(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const tag = raw.trim();
      if (!tag || tag.length > 100) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

const STATUS_RANK: Record<string, number> = { Done: 3, Next: 2, 'To do': 1 };

function pickStatus(records: Record[]): string | undefined {
  let best: string | undefined;
  let bestRank = 0;
  for (const r of records) {
    const s = r.fields.Status;
    if (!s) continue;
    const rank = STATUS_RANK[s] ?? 0;
    if (rank > bestRank) {
      best = s;
      bestRank = rank;
    }
  }
  return best;
}

function pickEarliestDoneDate(records: Record[]): string | undefined {
  const dates = records.map((r) => r.fields['Done date']).filter((d): d is string => !!d).sort();
  return dates[0];
}

interface PlannedRewrite {
  kind: 'rewrite';
  recordId: string;
  oldLink: string;
  newLink: string;
}

interface PlannedMerge {
  kind: 'merge';
  primary: Record;
  duplicates: Record[];
  newCanonical: string;
  mergedFields: Partial<Record['fields']>;
}

type Plan = PlannedRewrite | PlannedMerge;

async function main(): Promise<void> {
  console.log(`Mode: ${APPLY ? 'APPLY (writes will happen)' : 'DRY RUN (no writes)'}`);
  console.log(`Table: ${AIRTABLE_TABLE} (base ${AIRTABLE_BASE_ID})`);
  console.log('Fetching all records...');

  const records = await listAllRecords();
  console.log(`Fetched ${records.length} records.`);

  // Compute new canonical for each record (skip records with no Link or invalid URLs).
  const computed: { record: Record; oldLink: string; newCanonical: string }[] = [];
  let skipped = 0;
  for (const r of records) {
    const oldLink = r.fields.Link;
    if (!oldLink) {
      skipped++;
      continue;
    }
    try {
      const { canonical } = await canonicalize(oldLink);
      computed.push({ record: r, oldLink, newCanonical: canonical });
    } catch {
      console.warn(`  skip ${r.id}: invalid Link "${oldLink}"`);
      skipped++;
    }
  }

  // Group by newCanonical.
  const groups = new Map<string, typeof computed>();
  for (const item of computed) {
    const list = groups.get(item.newCanonical) ?? [];
    list.push(item);
    groups.set(item.newCanonical, list);
  }

  // Build plans.
  const plans: Plan[] = [];
  let unchanged = 0;

  for (const [newCanonical, items] of groups) {
    if (items.length === 1) {
      const only = items[0];
      if (only.oldLink === newCanonical) {
        unchanged++;
        continue;
      }
      plans.push({
        kind: 'rewrite',
        recordId: only.record.id,
        oldLink: only.oldLink,
        newLink: newCanonical,
      });
      continue;
    }

    // Collision: pick primary, merge fields.
    const alreadyCanonical = items.filter((i) => i.oldLink === newCanonical);
    let primary: Record;
    if (alreadyCanonical.length > 0) {
      // If multiple are already in canonical form (shouldn't happen, but defensive),
      // pick the earliest-created among them.
      primary = alreadyCanonical
        .map((i) => i.record)
        .sort((a, b) => a.createdTime.localeCompare(b.createdTime))[0];
    } else {
      // Pick the earliest-created record.
      primary = items
        .map((i) => i.record)
        .sort((a, b) => a.createdTime.localeCompare(b.createdTime))[0];
    }
    const duplicates = items.map((i) => i.record).filter((r) => r.id !== primary.id);
    const allRecords = [primary, ...duplicates];

    const mergedTags = mergeTags(...allRecords.map((r) => r.fields.Tags));
    const status = pickStatus(allRecords);
    const doneDate = pickEarliestDoneDate(allRecords);
    const name =
      primary.fields.Name && primary.fields.Name.trim().length > 0
        ? primary.fields.Name
        : duplicates.find((d) => d.fields.Name && d.fields.Name.trim().length > 0)?.fields.Name;

    const mergedFields: Partial<Record['fields']> = { Link: newCanonical };
    if (mergedTags.length > 0) mergedFields.Tags = mergedTags;
    if (status) mergedFields.Status = status;
    if (doneDate) mergedFields['Done date'] = doneDate;
    if (name && name !== primary.fields.Name) mergedFields.Name = name;

    plans.push({
      kind: 'merge',
      primary,
      duplicates,
      newCanonical,
      mergedFields,
    });
  }

  // Print plan.
  let rewriteCount = 0;
  let mergeCount = 0;
  let deleteCount = 0;

  for (const plan of plans) {
    if (plan.kind === 'rewrite') {
      rewriteCount++;
      console.log(`[REWRITE ${plan.recordId}] ${plan.oldLink} -> ${plan.newLink}`);
    } else {
      mergeCount++;
      deleteCount += plan.duplicates.length;
      const dupIds = plan.duplicates.map((d) => d.id).join(', ');
      console.log(`[MERGE  ${plan.primary.id}] keep, delete: ${dupIds}`);
      console.log(`         canonical: ${plan.newCanonical}`);
      if (plan.mergedFields.Tags) {
        console.log(`         tags: ${JSON.stringify(plan.mergedFields.Tags)}`);
      }
      if (plan.mergedFields.Status) {
        console.log(`         status: ${plan.mergedFields.Status}`);
      }
      if (plan.mergedFields['Done date']) {
        console.log(`         done date: ${plan.mergedFields['Done date']}`);
      }
    }
  }

  console.log('---');
  console.log(
    `Summary: ${rewriteCount} rewrites, ${mergeCount} merges (${deleteCount} deletions), ${unchanged} unchanged, ${skipped} skipped`,
  );

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to perform writes.');
    return;
  }

  // Apply: sequential writes with a small delay (Airtable ~5 req/s).
  console.log('Applying changes...');
  let applied = 0;
  let failed = 0;

  for (const plan of plans) {
    try {
      if (plan.kind === 'rewrite') {
        await patchRecord(plan.recordId, { Link: plan.newLink });
        console.log(`  rewrote ${plan.recordId}`);
      } else {
        await patchRecord(plan.primary.id, plan.mergedFields);
        await sleep(250);
        for (const dup of plan.duplicates) {
          await deleteRecord(dup.id);
          console.log(`  deleted ${dup.id}`);
          await sleep(250);
        }
        console.log(`  merged into ${plan.primary.id}`);
      }
      applied++;
      await sleep(250);
    } catch (err) {
      failed++;
      console.error(`  failed: ${(err as Error).message}`);
    }
  }

  console.log(`Applied: ${applied} groups, failed: ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
