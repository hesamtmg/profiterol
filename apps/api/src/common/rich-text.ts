import sanitizeHtml from 'sanitize-html';

/**
 * Keeps the formatting the rich-text editor can produce (headings, emphasis, lists, quotes, links)
 * and drops everything else: scripts, styles, event handlers, iframes and unsafe link schemes.
 */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['dir'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    transformTags: {
      // Links that open a new tab must not give the new page access to this one.
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
      }),
    },
  });
}
