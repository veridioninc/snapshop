import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { safeJsonLd } from '@/src/lib/domain';
import { decryptToken, encryptToken, verifyMetaSignedRequest } from '@/src/lib/meta';

beforeEach(() => { process.env.META_TOKEN_ENCRYPTION_KEY = 'phase2-test-key'; process.env.META_APP_SECRET = 'phase2-app-secret'; });

describe('Meta security helpers', () => {
  it('encrypts and decrypts tokens without storing plaintext', () => { const encrypted = encryptToken('long-lived-token'); expect(encrypted).not.toContain('long-lived-token'); expect(decryptToken(encrypted)).toBe('long-lived-token'); });
  it('accepts a valid signed deletion request and rejects tampering', () => { const payload = Buffer.from(JSON.stringify({ user_id: 'meta-user-1', algorithm: 'HMAC-SHA256' })).toString('base64url'); const signature = createHmac('sha256', process.env.META_APP_SECRET!).update(payload).digest().toString('base64url'); const signed = `${signature}.${payload}`; expect(verifyMetaSignedRequest(signed)?.user_id).toBe('meta-user-1'); expect(verifyMetaSignedRequest(`${signature}.${payload}tampered`)).toBeNull(); });
  it('escapes script-breaking JSON-LD characters', () => { const json = safeJsonLd({ caption: '</script><script>alert(1)</script>' }); expect(json).not.toContain('</script>'); expect(json).toContain('\\u003c/script\\u003e'); });
});
