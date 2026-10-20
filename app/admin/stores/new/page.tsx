import { redirect } from 'next/navigation';
import { requireUser } from '@/src/lib/auth';
import { createStore } from '@/src/lib/repository';
import { validateSlug, normalizeSlug } from '@/src/lib/domain';

export default async function NewStorePage() { const user = await requireUser(); if (!user.isOperator) redirect('/admin'); return <div className="stack" style={{ maxWidth: 700 }}><h1>Create store</h1><form className="card stack" action="/api/stores" method="post"><label>Store name<input name="name" required maxLength={80} /></label><label>Slug<input name="slug" required minLength={3} maxLength={40} pattern="[a-z0-9-]+" placeholder="my-store" /></label><p className="muted small">Use lowercase letters, numbers, and hyphens. The URL will be /s/your-slug.</p><button type="submit">Create store</button></form></div>; }
