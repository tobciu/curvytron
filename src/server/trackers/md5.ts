import { createHash } from 'node:crypto';

/** Used only to pseudonymise identifiers (IPs, names) before they're sent to the Inspector. */
export function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}
