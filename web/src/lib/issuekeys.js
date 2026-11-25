// Ticket keys (DW-12) in text. Only the active workspace's prefix counts: the
// issue page opens a key in the active workspace, so a key of another
// workspace would lead to "not found". Strings such as UTF-8 or SHA-256 never
// look like keys, and matching is case-sensitive.
//
// The rule runs once over each piece of text and never scans a run of
// characters twice, so a long token or a line of underscores stays fast.

// usablePrefix returns the prefix when it can name keys (letters and digits
// only), or '' when it cannot.
export function usablePrefix(prefix) {
	return typeof prefix === 'string' && /^[A-Za-z0-9]+$/.test(prefix) ? prefix : '';
}

// keyPattern matches either a URL (left as text) or a key candidate. A key:
// - is not glued to letters, digits or hyphens before it (XDW-12, a-DW-12);
// - follows a slash only when a key ends right before it, so DW-1/DW-2 is two
//   keys while docs/DW-12 is a path (splitIssueKeys checks the slash);
// - is not glued to letters, digits or hyphens after it, nor followed by a
//   file extension (DW-12a, DW-12-2, DW-12.md);
// - has no leading zero (DW-01), since no issue has that number.
// "Letters" here are ASCII letters, so a key right after Thai text, which has
// no spaces between words, is still a key. A URL starts only where a scheme
// or www. starts a word, so a long run of letters is read once.
function keyPattern(prefix) {
	return new RegExp(
		`((?<![\\w+.-])(?:[A-Za-z][\\w+.-]*:\\/\\/|www\\.)\\S*)` +
			`|(?<![\\w\\\\-])${prefix}-[1-9]\\d*(?![\\w-]|\\.\\w)`,
		'g'
	);
}

// The pattern for the last prefix asked for: the app shows one workspace's
// keys at a time. matchAll works on a copy, so sharing it is safe.
let cached = { prefix: '', re: null };
function patternFor(prefix) {
	if (cached.prefix !== prefix) cached = { prefix, re: keyPattern(prefix) };
	return cached.re;
}

// splitIssueKeys cuts plain text into text and key parts.
export function splitIssueKeys(text, prefix = '') {
	const s = String(text ?? '');
	const p = usablePrefix(prefix);
	if (!p || !s) return s ? [{ kind: 'text', text: s }] : [];
	const out = [];
	let last = 0;
	let keyEnd = -1; // where the last key ended
	for (const m of s.matchAll(patternFor(p))) {
		if (m[1] !== undefined) continue; // a URL: stays in the text around it
		// After a slash only when a key ends at it (DW-1/DW-2), not in a path.
		if (s[m.index - 1] === '/' && keyEnd !== m.index - 1) continue;
		if (m.index > last) out.push({ kind: 'text', text: s.slice(last, m.index) });
		out.push({ kind: 'key', text: m[0] });
		last = keyEnd = m.index + m[0].length;
	}
	if (last < s.length) out.push({ kind: 'text', text: s.slice(last) });
	return out;
}
