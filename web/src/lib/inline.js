// Splits a line into `code`, **bold**, ticket key and plain parts. No HTML is
// parsed: the caller renders each part as text. A backticked span wins, so
// `**x**` and `DW-1` stay code. Keys are found only in plain parts and only
// with the active workspace's prefix (see issuekeys.js).
import { splitIssueKeys } from './issuekeys.js';

const RE = /(`[^`]+`|\*\*[^*\n]+\*\*)/g;

export function parseInline(text, keyPrefix = '') {
	return String(text ?? '')
		.split(RE)
		.filter(Boolean)
		.flatMap((p) => {
			if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return [{ kind: 'code', text: p.slice(1, -1) }];
			if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return [{ kind: 'bold', text: p.slice(2, -2) }];
			return splitIssueKeys(p, keyPrefix);
		});
}
