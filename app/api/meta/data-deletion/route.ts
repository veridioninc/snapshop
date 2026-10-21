import { randomBytes, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { deleteMetaData, verifyMetaSignedRequest } from '@/src/lib/meta';
import { createAdminClient } from '@/src/lib/supabase/server';

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const signed = String(form?.get('signed_request') || '');
  const payload = verifyMetaSignedRequest(signed);
  if (!payload?.user_id) return NextResponse.json({ error: 'Invalid signed request.' }, { status: 400 });
  const confirmationCode = randomBytes(8).toString('hex');
  const id = randomUUID();
  const admin = createAdminClient();
  const { error: insertError } = await admin.from('instagram_deletion_requests').insert({
    id, meta_user_id: payload.user_id, confirmation_code: confirmationCode, status: 'received',
  });
  if (insertError) throw insertError;
  try {
    await deleteMetaData(payload.user_id);
    const { error } = await admin.from('instagram_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  } catch {
    const { error } = await admin.from('instagram_deletion_requests').update({ status: 'error' }).eq('id', id);
    if (error) console.error('Meta deletion request status could not be updated.', { code: error.code });
    return NextResponse.json({ error: 'Deletion cleanup failed; please retry.' }, { status: 500 });
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
  return NextResponse.json({ url: `${base}/meta/deletion-status?code=${confirmationCode}`, confirmation_code: confirmationCode });
}
