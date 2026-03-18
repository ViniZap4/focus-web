const UNSAFE_TAGS = new Set([
	'script',
	'style',
	'link',
	'meta',
	'iframe',
	'object',
	'embed',
	'form',
	'input',
	'button',
	'select',
	'textarea',
	'noscript',
	'applet'
]);

const UNSAFE_ATTRS = new Set([
	'onclick',
	'ondblclick',
	'onmousedown',
	'onmouseup',
	'onmouseover',
	'onmousemove',
	'onmouseout',
	'onkeypress',
	'onkeydown',
	'onkeyup',
	'onload',
	'onerror',
	'onsubmit',
	'onreset',
	'onfocus',
	'onblur',
	'onchange',
	'oninput',
	'onscroll',
	'onresize'
]);

/**
 * Sanitize a DOM tree from untrusted EPUB/HTML content.
 * Removes scripts, styles, event handlers, and dangerous elements.
 */
export function sanitizeNode(node: Node): void {
	const toRemove: Node[] = [];

	for (const child of node.childNodes) {
		if (child.nodeType === Node.ELEMENT_NODE) {
			const el = child as Element;
			const tag = el.tagName.toLowerCase();

			if (UNSAFE_TAGS.has(tag)) {
				toRemove.push(child);
				continue;
			}

			// Remove unsafe attributes
			for (const attr of Array.from(el.attributes)) {
				const name = attr.name.toLowerCase();
				if (UNSAFE_ATTRS.has(name) || name.startsWith('on')) {
					el.removeAttribute(attr.name);
				}
				// Block javascript: URLs
				if (['href', 'src', 'action'].includes(name)) {
					const val = attr.value.trim().toLowerCase();
					if (val.startsWith('javascript:') || val.startsWith('data:text/html')) {
						el.removeAttribute(attr.name);
					}
				}
			}

			sanitizeNode(child);
		}
	}

	for (const node of toRemove) {
		node.parentNode?.removeChild(node);
	}
}
