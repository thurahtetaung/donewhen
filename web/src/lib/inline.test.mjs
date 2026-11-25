import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInline } from './inline.js';

test('plain text stays one part', () => {
	assert.deepEqual(parseInline('hello'), [{ kind: 'text', text: 'hello' }]);
});

test('code and bold are split out', () => {
	assert.deepEqual(parseInline('has **Continue with GitHub** and `make test` ok'), [
		{ kind: 'text', text: 'has ' },
		{ kind: 'bold', text: 'Continue with GitHub' },
		{ kind: 'text', text: ' and ' },
		{ kind: 'code', text: 'make test' },
		{ kind: 'text', text: ' ok' }
	]);
});

test('bold marks inside code stay code', () => {
	assert.deepEqual(parseInline('`**x**`'), [{ kind: 'code', text: '**x**' }]);
});

test('an unmatched pair of stars stays plain', () => {
	assert.deepEqual(parseInline('a ** b'), [{ kind: 'text', text: 'a ** b' }]);
});

test('empty and missing input give no parts', () => {
	assert.deepEqual(parseInline(''), []);
	assert.deepEqual(parseInline(undefined), []);
});

const P = 'DW';

test('a key with the active workspace prefix becomes a key part', () => {
	assert.deepEqual(parseInline("Follow-up: DW-16", P), [
		{ kind: 'text', text: "Follow-up: " },
		{ kind: 'key', text: 'DW-16' }
	]);
});

test('a key keeps punctuation outside and works next to code and bold', () => {
	assert.deepEqual(parseInline('See DW-9, then `make` and **DW-3** (DW-12).', P), [
		{ kind: 'text', text: 'See ' },
		{ kind: 'key', text: 'DW-9' },
		{ kind: 'text', text: ', then ' },
		{ kind: 'code', text: 'make' },
		{ kind: 'text', text: ' and ' },
		{ kind: 'bold', text: 'DW-3' },
		{ kind: 'text', text: ' (' },
		{ kind: 'key', text: 'DW-12' },
		{ kind: 'text', text: ').' }
	]);
});

test('a backticked key stays code', () => {
	assert.deepEqual(parseInline('`DW-9`', P), [{ kind: 'code', text: 'DW-9' }]);
});

test('tokens that are not the workspace prefix stay plain', () => {
	assert.deepEqual(parseInline('UTF-8 and SHA-256', P), [{ kind: 'text', text: 'UTF-8 and SHA-256' }]);
});

test('a key glued to other characters stays plain', () => {
	for (const s of ['XDW-9', 'DW-9a', 'DW-9-2', 'a-DW-9', 'dw-9', 'DW-', 'DW-x']) {
		assert.deepEqual(parseInline(s, P), [{ kind: 'text', text: s }], s);
	}
});

test('no prefix means no key parts', () => {
	for (const prefix of [undefined, '', null, 'D.W']) {
		assert.deepEqual(parseInline('See DW-9', prefix), [{ kind: 'text', text: 'See DW-9' }], String(prefix));
	}
});

test('only the given prefix makes key parts', () => {
	assert.deepEqual(parseInline('DW-1 and SHA-2', P), [
		{ kind: 'key', text: 'DW-1' },
		{ kind: 'text', text: ' and SHA-2' }
	]);
	assert.deepEqual(parseInline('DW-1 and SHA-2', 'SHA'), [
		{ kind: 'text', text: 'DW-1 and ' },
		{ kind: 'key', text: 'SHA-2' }
	]);
});

test('keys in URLs and paths stay plain', () => {
	for (const s of [
		'https://jira.example.com/browse/DW-9',
		'See https://example.com/x?id=DW-9 now',
		'www.example.com/DW-9',
		'docs/DW-12.md',
		'docs\\DW-12',
		'DW-12.md'
	]) {
		assert.deepEqual(parseInline(s, P), [{ kind: 'text', text: s }], s);
	}
	assert.deepEqual(parseInline('https://example.com/DW-9 and DW-9.', P), [
		{ kind: 'text', text: 'https://example.com/DW-9 and ' },
		{ kind: 'key', text: 'DW-9' },
		{ kind: 'text', text: '.' }
	]);
});

test('a number with a leading zero is not a key', () => {
	for (const s of ['DW-01', 'DW-0']) assert.deepEqual(parseInline(s, P), [{ kind: 'text', text: s }], s);
});

test('long text is read once', () => {
	const start = performance.now();
	parseInline('a'.repeat(200000) + ' ' + '_'.repeat(10000) + ' ' + 'x'.repeat(30000) + '://' + ' DW-1', P);
	assert.ok(performance.now() - start < 50);
});
