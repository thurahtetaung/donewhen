// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './markdown.js';

const P = 'DW';
const links = (html) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
const key = (k) => `<a class="issue-key" href="/issue/${k}">${k}</a>`;

test('a key with the active workspace prefix links to its issue', () => {
	const html = renderMarkdown('See DW-9 and DW-12 today', P);
	assert.deepEqual(links(html), ['/issue/DW-9', '/issue/DW-12']);
	assert.ok(html.includes(key('DW-9')), html);
});

test('a key at the end of a sentence keeps its punctuation outside the link', () => {
	for (const [src, after] of [
		['See DW-9.', '.'],
		['Done (DW-9)', ')'],
		['DW-9, DW-10', ','],
		['Is it DW-9?', '?']
	]) {
		const html = renderMarkdown(src, P);
		assert.ok(html.includes(key('DW-9') + after), src + ' → ' + html);
	}
});

test('tokens that are not the workspace prefix stay plain text', () => {
	const html = renderMarkdown('UTF-8, SHA-256 and ISO-8601', P);
	assert.deepEqual(links(html), []);
	assert.ok(html.includes('UTF-8, SHA-256 and ISO-8601'), html);
});

test('only the given prefix links', () => {
	// The caller passes the active workspace's prefix: the issue page opens a
	// key in the active workspace, so a key with any other prefix stays text.
	assert.deepEqual(links(renderMarkdown('DW-1 and SHA-2', P)), ['/issue/DW-1']);
	assert.deepEqual(links(renderMarkdown('DW-1 and SHA-2', 'SHA')), ['/issue/SHA-2']);
});

test('no prefix means no key links', () => {
	assert.deepEqual(links(renderMarkdown('See DW-9.')), []);
	assert.deepEqual(links(renderMarkdown('See DW-9.', '')), []);
	assert.deepEqual(links(renderMarkdown('See DW-9.', 'D.W')), []);
});

test('a key inside a longer word or number stays plain', () => {
	for (const src of ['XDW-9', 'DW-9a', 'DW-9-2', 'a-DW-9', 'some_var_DW-9', 'dw-9', 'DW-', 'DW-x']) {
		assert.deepEqual(links(renderMarkdown(src, P)), [], src);
	}
});

test('a number with a leading zero is not a key', () => {
	assert.deepEqual(links(renderMarkdown('DW-01 and DW-0', P)), []);
});

test('keys in inline code and code blocks stay plain', () => {
	const inline = renderMarkdown('Use `DW-9` here', P);
	assert.deepEqual(links(inline), []);
	assert.ok(inline.includes('<code>DW-9</code>'), inline);
	const block = renderMarkdown('```\nDW-9\n```', P);
	assert.deepEqual(links(block), []);
	const mermaid = renderMarkdown('```mermaid\ngraph TD; DW-9-->DW-1\n```', P);
	assert.deepEqual(links(mermaid), []);
	assert.ok(mermaid.includes('data-mermaid='), mermaid);
});

test('a key already inside a link stays one link', () => {
	const html = renderMarkdown('[DW-9](/issue/DW-9)', P);
	assert.deepEqual(links(html), ['/issue/DW-9']);
	const named = renderMarkdown('[fix for DW-9](https://example.com/pr/1)', P);
	assert.deepEqual(links(named), ['https://example.com/pr/1']);
	const nested = renderMarkdown('[see _DW-9_ there](https://example.com/pr/1)', P);
	assert.deepEqual(links(nested), ['https://example.com/pr/1']);
});

test('keys in URLs and paths stay plain', () => {
	assert.deepEqual(links(renderMarkdown('https://jira.example.com/browse/DW-9 here', P)), [
		'https://jira.example.com/browse/DW-9'
	]);
	assert.deepEqual(links(renderMarkdown('<https://example.com/DW-9>', P)), ['https://example.com/DW-9']);
	assert.deepEqual(links(renderMarkdown('www.example.com/DW-9', P)), ['http://www.example.com/DW-9']);
	assert.deepEqual(links(renderMarkdown('See docs/DW-12.md and DW-12.md', P)), []);
});

test('emphasis, strong and e-mail addresses render as before', () => {
	assert.equal(renderMarkdown('_DW-1 is blocked_', P).trim(), `<p><em>${key('DW-1')} is blocked</em></p>`);
	assert.equal(
		renderMarkdown('__DW-1 and DW-2__', P).trim(),
		`<p><strong>${key('DW-1')} and ${key('DW-2')}</strong></p>`
	);
	assert.equal(renderMarkdown('x _foo-DW-1 bar_ y', P).trim(), '<p>x <em>foo-DW-1 bar</em> y</p>');
	const mail = renderMarkdown('DW-9@example.com', P);
	assert.deepEqual(links(mail), ['mailto:DW-9@example.com'], mail);
});

test('keys link in lists, tables, headings and emphasis', () => {
	assert.deepEqual(links(renderMarkdown('- DW-1\n- **DW-2**', P)), ['/issue/DW-1', '/issue/DW-2']);
	assert.deepEqual(links(renderMarkdown('| a |\n|---|\n| DW-3 |', P)), ['/issue/DW-3']);
	assert.deepEqual(links(renderMarkdown('## DW-4 notes\n\n*DW-5*', P)), ['/issue/DW-4', '/issue/DW-5']);
});

test('the existing safety rules still hold', () => {
	const html = renderMarkdown('Text <b onclick="x()">bold</b> [a](javascript:alert(1)) DW-1 & "DW-2"', P);
	assert.ok(!html.includes('<b '), html);
	assert.deepEqual(links(html), ['#', '/issue/DW-1', '/issue/DW-2']);
	assert.ok(html.includes('&amp; &quot;' + key('DW-2') + '&quot;'), html);
});

// Key linking reads each piece of text once. These inputs once took seconds
// to minutes; marked's own parse is the baseline, and linking keys may add
// only a little on top of it.
test('long text without spaces renders fast', () => {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
	const token = Array.from({ length: 30000 }, (_, i) => chars[(i * 7919) % 64]).join('');
	const cases = [
		['underscores', 'Sign: ' + '_'.repeat(10000) + ' end'],
		['30k token', 'x ' + token],
		['27k snake_case line', Array.from({ length: 3000 }, () => 'some_var').join('_')],
		['30k letters before a key', 'a'.repeat(30000) + ' DW-1']
	];
	const time = (fn) => {
		const start = performance.now();
		fn();
		return performance.now() - start;
	};
	for (const [name, src] of cases) {
		renderMarkdown(src); // warm up
		const plain = time(() => renderMarkdown(src));
		const linked = time(() => renderMarkdown(src, P));
		assert.ok(linked - plain < 50, `${name}: ${linked.toFixed(1)} ms with keys, ${plain.toFixed(1)} ms without`);
	}
});
