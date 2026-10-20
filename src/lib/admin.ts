import { requireStoreAccess } from './auth';
export async function getAuthorizedStore(storeId: string) { const result = await requireStoreAccess(storeId); return result.store; }
