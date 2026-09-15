/** Escape a measurement/tag-key/tag-value/field-key component (commas, spaces, equals signs). */
function escapePart(value: string): string {
  return value.replaceAll(/[,= ]/g, (m) => `\\${m}`);
}

/** Measurement names only need commas and spaces escaped (`=` is fine unescaped). */
function escapeMeasurement(value: string): string {
  return value.replaceAll(/[, ]/g, (m) => `\\${m}`);
}

const escapedQuote = String.raw`\"`;

function formatFieldValue(value: unknown): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return `"${String(value).replaceAll('"', escapedQuote)}"`;
}

/**
 * Format one InfluxDB (1.x) line-protocol point:
 * `measurement,tag=value field=value`. Field/tag order follows object
 * insertion order (stable, but Influx doesn't care either way).
 */
export function toLineProtocol(
  measurement: string,
  tags: Record<string, string | number>,
  fields: Record<string, unknown>,
): string {
  const tagStr = Object.entries(tags)
    .map(([k, v]) => `${escapePart(k)}=${escapePart(String(v))}`)
    .join(',');
  const fieldStr = Object.entries(fields)
    .map(([k, v]) => `${escapePart(k)}=${formatFieldValue(v)}`)
    .join(',');

  return `${escapeMeasurement(measurement)}${tagStr ? ',' + tagStr : ''} ${fieldStr}`;
}
