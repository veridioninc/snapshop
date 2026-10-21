import { randomUUID } from 'crypto';
import { parseCsv } from './csv';
import { getProducts } from './repository';
import { createServerClient } from './supabase/server';
import type { ImportRow, Json } from './supabase/database';
import type { ImportPreview, User } from './types';

export async function createPreviewImport(storeId: string, user: User, filename: string, text: string) {
  const supabase = createServerClient();
  const existing = await getProducts(storeId, true);
  const preview = parseCsv(text, existing);
  const id = randomUUID();
  const { error } = await supabase.from('imports').insert({
    id,
    store_id: storeId,
    created_by: user.id,
    filename,
    row_count: preview.rowsFound,
    imported_count: 0,
    error_report: preview as unknown as Json,
    status: 'previewed',
  });
  if (error) throw error;
  return { id, preview };
}

function parseReport(value: Json): Partial<ImportPreview> {
  // JSONB comes back as an object. Reading a legacy string is harmless, but new
  // writes always use JSON objects rather than double-encoded JSON strings.
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return {}; }
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Partial<ImportPreview> : {};
}

export async function getImport(storeId: string, importId: string): Promise<(ImportRow & { report: Partial<ImportPreview> }) | null> {
  const { data, error } = await createServerClient().from('imports').select('*')
    .eq('store_id', storeId).eq('id', importId).maybeSingle();
  if (error) throw error;
  return data ? { ...data, report: parseReport(data.error_report) } : null;
}

export async function commitImport(storeId: string, importId: string): Promise<{ count: number; alreadyCommitted: boolean }> {
  // The database function locks the import, checks the caller, upserts products,
  // and marks the import committed in one transaction. Do not emulate it with
  // multiple browser/API inserts; retries must be safe and atomic.
  const { data, error } = await createServerClient().rpc('commit_import', {
    p_store_id: storeId,
    p_import_id: importId,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('commit_import returned an invalid result.');
  const count = data.count;
  const alreadyCommitted = data.alreadyCommitted;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || typeof alreadyCommitted !== 'boolean') {
    throw new Error('commit_import returned an invalid result.');
  }
  return { count, alreadyCommitted };
}
