import { cleanCustomHtml, customHtmlHasScript } from '@profiterol/blocks';

/**
 * Writes the owner's custom HTML tags (Site settings → Custom HTML tags, handed over by the public page) at the end
 * of <head> and of <body>, as they were written. Runs before security-headers.ts (plugins load in name order), so
 * their <script> tags get the response's nonce, and tells it when the page needs to load scripts from elsewhere.
 */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (html, { event }) => {
    const custom = event.context.customHtml as { head: string; body: string } | undefined;
    if (!custom) return;
    const head = cleanCustomHtml(custom.head);
    const body = cleanCustomHtml(custom.body);
    if (!head && !body) return;
    if (head) html.head.push(head);
    if (body) html.bodyAppend.push(body);
    event.context.customHtmlAdded = { scripts: customHtmlHasScript(head) || customHtmlHasScript(body) };
  });
});
