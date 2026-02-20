/**
 * Seed and backfill lead source contexts.
 *
 * What this script does:
 * 1) Reads distinct processed_leads.source_detail values.
 * 2) Upserts 1:1 scaffold mappings into lead_source_contexts.
 * 3) Backfills processed_leads.source_context_summary for rows where it is null.
 *
 * Run:
 *   node scripts/backfill-source-contexts.js
 */

require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: './.env.local', override: true });
const { createClient } = require('@supabase/supabase-js');
const curatedSourceContexts = require('../api/config/source-contexts.json');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAGE_SIZE = 1000;
const UPSERT_CHUNK_SIZE = 200;

async function fetchAllSourceDetails() {
  const values = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('processed_leads')
      .select('source_detail')
      .not('source_detail', 'is', null)
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row.source_detail) continue;
      const trimmed = String(row.source_detail).trim();
      if (trimmed) values.push(trimmed);
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return values;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function upsertContextMappings(sourceValues) {
  const curatedValues = Object.keys(curatedSourceContexts || {});
  const uniqueValues = Array.from(new Set([
    ...sourceValues,
    ...curatedValues
  ]));
  const chunks = chunkArray(uniqueValues, UPSERT_CHUNK_SIZE);
  let upserted = 0;

  for (const chunk of chunks) {
    const rows = chunk.map(sourceValue => ({
      source_value: sourceValue,
      context_summary: curatedSourceContexts[sourceValue.toLowerCase()] || sourceValue,
      is_active: true
    }));

    const { error } = await supabase
      .from('lead_source_contexts')
      .upsert(rows, { onConflict: 'source_value' });

    if (error) throw error;
    upserted += rows.length;
  }

  return {
    uniqueCount: uniqueValues.length,
    attemptedUpserts: upserted
  };
}

async function backfillProcessedLeadContexts(sourceValues) {
  const uniqueValues = Array.from(new Set(sourceValues));
  let updatedBatches = 0;

  for (const sourceValue of uniqueValues) {
    const { error } = await supabase
      .from('processed_leads')
      .update({ source_context_summary: sourceValue })
      .eq('source_detail', sourceValue)
      .is('source_context_summary', null);

    if (error) throw error;
    updatedBatches++;
  }

  return { updatedBatches };
}

async function run() {
  console.log('Starting source context scaffold + backfill...\n');

  const sourceValues = await fetchAllSourceDetails();
  if (sourceValues.length === 0) {
    console.log('No source_detail values found in processed_leads. Nothing to do.');
    return;
  }

  const { uniqueCount, attemptedUpserts } = await upsertContextMappings(sourceValues);
  const { updatedBatches } = await backfillProcessedLeadContexts(sourceValues);

  console.log('Done.');
  console.log(`- Distinct source values: ${uniqueCount}`);
  console.log(`- Upsert attempts into lead_source_contexts: ${attemptedUpserts}`);
  console.log(`- processed_leads update batches: ${updatedBatches}`);
}

run().catch(error => {
  console.error('Backfill failed:', error.message);
  process.exit(1);
});
