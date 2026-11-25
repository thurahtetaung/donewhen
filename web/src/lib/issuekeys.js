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

// keyPattern matches either a URL (left as text) or a key. A key:
// - is not glued to letters, digits, hyphens or a path before it (XDW-12,
//   a-DW-12, docs/DW-12);
// - is not glued to letters, digits or hyphens after it, nor followed by a
//   file extension (DW-12a, DW-12-2, DW-12.md);
// - has no leading zero (DW-01), since no issue has that number.
// A URL starts only where a scheme or www. starts a word, so a long run of
// letters is read once.
function keyPattern(prefix) {
	return new RegExp(
		`((?<![\\w+.-])(?:[A-Za-z][\\w+.-]*:\\/\\/|www\\.)\\S*)` +
			`|(?<![\\w/\\\\-])${prefix}-[1-9]\\d*(?![\\w-]|\\.\\w)`,
		'g'
	);
}

// splitIssueKeys cuts plain text into text and key parts.
export function splitIssueKeys(text, prefix = '') {
	const s = String(text ?? '');
	const p = usablePrefix(prefix);
	if (!p || !s) return s ? [{ kind: 'text', text: s }] : [];
	const out = [];
	let last = 0;
	for (const m of s.matchAll(keyPattern(p))) {
		if (m[1] !== undefined) continue; // a URL: stays in the text around it
		if (m.index > last) out.push({ kind: 'text', text: s.slice(last, m.index) });
		out.push({ kind: 'key', text: m[0] });
		last = m.index + m[0].length;
	}
	if (last < s.length) out.push({ kind: 'text', text: s.slice(last) });
	return out;
}
