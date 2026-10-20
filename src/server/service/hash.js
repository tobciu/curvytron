import { createHash } from 'node:crypto';

/**
 * Anonymizing hash used by the inspector
 *
 * @param {*} value
 *
 * @return {String}
 */
export function md5(value) {
    return createHash('md5').update(String(value)).digest('hex');
}
