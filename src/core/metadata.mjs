/** Freeze JSON-compatible metadata without freezing caller-owned objects. */
export function snapshot(value) {
  const copy = JSON.parse(JSON.stringify(value));
  function freeze(item) {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  }
  return freeze(copy);
}

/** Require an unambiguous, real UTC instant; never infer a date or timezone. */
export function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new TypeError('Expected an ISO UTC timestamp ending in Z');
  }
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== canonical) {
    throw new RangeError('Invalid UTC calendar date or time');
  }
  return canonical;
}

/** Observation age is metadata age, not proof that remote image pixels match. */
export function observationStatus(observedAt, { now, staleAfterMs }) {
  if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) throw new RangeError('Specify a positive staleness threshold');
  const ageMs = Date.parse(utc(now)) - Date.parse(utc(observedAt));
  return snapshot({ ageMs, state: ageMs < 0 ? 'future' : ageMs > staleAfterMs ? 'stale' : 'recent' });
}
