// Toss-sequence parsing and validation. PURE.
// Case-insensitive H/T; whitespace and commas are ignored.

export const TAB1_MAX = 4;
export const TAB2_MAX = 5000;

/**
 * @returns {{ok: true, tosses: number[]} |
 *           {ok: false, code: 'char', char: string, position: number} |
 *           {ok: false, code: 'empty'} |
 *           {ok: false, code: 'tooLong', length: number, max: number}}
 * `position` is 1-based within the raw text.
 */
export function parseTosses(text, { max = TAB2_MAX } = {}) {
  const tosses = [];
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ',' || /\s/.test(ch)) continue;
    const u = ch.toUpperCase();
    if (u === 'H') tosses.push(0);
    else if (u === 'T') tosses.push(1);
    else return { ok: false, code: 'char', char: ch, position: i + 1 };
  }
  if (tosses.length === 0) return { ok: false, code: 'empty' };
  if (tosses.length > max) return { ok: false, code: 'tooLong', length: tosses.length, max };
  return { ok: true, tosses };
}

export function tossesToString(tosses, sep = '') {
  let out = '';
  for (let i = 0; i < tosses.length; i++) {
    if (i > 0) out += sep;
    out += tosses[i] === 0 ? 'H' : 'T';
  }
  return out;
}
