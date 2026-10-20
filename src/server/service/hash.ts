import { createHash } from 'node:crypto';

/**
 * Anonymizing hash used by the inspector
 */
export function md5(value: any) {
    return createHash('md5').update(String(value)).digest('hex');
}
