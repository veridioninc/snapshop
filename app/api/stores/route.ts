import { NextResponse } from 'next/server';
import { isSameOrigin, requireUser } from '@/src/lib/auth';
import { createStore } from '@/src/lib/repository';
import { normalizeSlug, validateSlug } from '@/src/lib/domain';

export async function POST(request: Request) { const user = await requireUser(); if (!isSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 }); if (!user.isOperator) return NextResponse.redirect(new URL('/admin', request.url)); const form = await request.formData(); const name = String(form.get('name') || '').trim(); const slug = normalizeSlug(String(form.get('slug') || '')); if (!name || name.length > 80) return NextResponse.redirect(new URL('/admin/stores/new?error=invalid_name', request.url)); const error = validateSlug(slug); if (error) return NextResponse.redirect(new URL(`/admin/stores/new?error=${encodeURIComponent(error)}`, request.url)); try { await createStore({ name, slug }); return NextResponse.redirect(new URL('/admin', request.url)); } catch { return NextResponse.redirect(new URL('/admin/stores/new?error=slug_taken', request.url)); } }
