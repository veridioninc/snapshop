import { ensureSchema } from '../src/lib/db';

await ensureSchema();
console.log('Snap Shop schema is ready.');
process.exit(0);
