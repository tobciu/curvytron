import { createHash } from 'node:crypto';

/** What an identity code looks like: letters, digits, dashes (a UUID is one), long enough to be a secret */
export const identityCode = /^[\w-]{16,64}$/;

/**
 * What the server keeps of an identity code: its SHA-256. The code itself is never stored, so that whoever reads the
 * database can not be anybody.
 */
export function hashIdentity(code: string): string {
    return createHash('sha256').update(code).digest('hex');
}

/** The hash of a code, null when it is not a code */
export function hashIdentityCode(code: unknown): string | null {
    return typeof code === 'string' && identityCode.test(code) ? hashIdentity(code) : null;
}
