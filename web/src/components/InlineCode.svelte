<script>
	// Renders `backticked` spans as code, **double-star** spans as bold and
	// ticket keys of the active workspace (DW-12) as links to their issue.
	// Plain text otherwise; no HTML is parsed.
	import { parseInline } from '$lib/inline.js';
	import { keyPrefix } from '$lib/store.js';
	let { text = '' } = $props();
	const parts = $derived(parseInline(text, $keyPrefix));
</script>

{#each parts as p, i (i)}{#if p.kind === 'code'}<code class="ic">{p.text}</code>{:else if p.kind === 'bold'}<strong class="ib">{p.text}</strong>{:else if p.kind === 'key'}<a class="issue-key" href={'/issue/' + encodeURIComponent(p.text)}>{p.text}</a>{:else}{p.text}{/if}{/each}

<style>
	.ic {
		font-family: var(--mono);
		font-size: 0.88em;
		background: var(--sunken);
		border: 1px solid var(--line);
		border-radius: var(--r-sm);
		padding: 0 4px;
		overflow-wrap: anywhere;
	}
	.ib {
		font-weight: 600;
	}
	/* Same look as a key in Markdown (Markdown.svelte). */
	.issue-key {
		color: var(--accent);
		white-space: nowrap;
	}
</style>
