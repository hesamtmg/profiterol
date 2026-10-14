import { createHash } from 'node:crypto';
import { babelParse, compileScript, compileStyle, MagicString, parse, walk } from '@vue/compiler-sfc';

/**
 * Turns a custom block's Vue single-file component into a browser module, after checking it for things a page
 * block has no business doing (network requests, reading cookies, running strings as code, reaching the page
 * outside its own element…).
 *
 * The checks are a strong filter, not a sandbox: a determined author could still hide something from them. That is
 * why only the owner can approve a block for use, why drafts only ever run inside a sandboxed preview frame, and why
 * the site's Content-Security-Policy (no eval, requests to the site only) stays in force for approved blocks.
 */

export const MAX_SOURCE = 30_000;

/** The Vue functions a block may import. Others (h, createApp, getCurrentInstance, …) can escape the block. */
export const ALLOWED_VUE_IMPORTS = [
  'ref',
  'reactive',
  'computed',
  'watch',
  'watchEffect',
  'onMounted',
  'onBeforeUnmount',
  'onUnmounted',
  'onUpdated',
  'nextTick',
  'toRef',
  'toRefs',
  'shallowRef',
  'readonly',
  'unref',
  'useTemplateRef',
  'useId',
  'Transition',
  'TransitionGroup',
];

/** Globals that reach the network, storage, other windows or running strings as code. */
const BANNED_GLOBALS = new Set([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'Worker',
  'SharedWorker',
  'importScripts',
  'eval',
  'Function',
  'Reflect',
  'Proxy',
  'globalThis',
  'self',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'cookieStore',
  'opener',
  'parent',
  'top',
  'frames',
  'postMessage',
  'require',
  'process',
  'WebAssembly',
  'BroadcastChannel',
  'MessageChannel',
]);

/** What a block may use from `window` (sizes, scrolling, timers, observers). */
const WINDOW_ALLOWED = new Set([
  'addEventListener',
  'removeEventListener',
  'innerWidth',
  'innerHeight',
  'scrollX',
  'scrollY',
  'devicePixelRatio',
  'matchMedia',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'getComputedStyle',
  'IntersectionObserver',
  'ResizeObserver',
  'scrollTo',
]);

/** Properties that lead out of the block (to the document, the window, the instance) or write raw HTML. */
const BANNED_PROPS = new Set([
  'cookie',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'srcdoc',
  'createElement',
  'createElementNS',
  'setAttribute',
  'setAttributeNS',
  'write',
  'writeln',
  'execCommand',
  'opener',
  'defaultView',
  'ownerDocument',
  'parentNode',
  'getRootNode',
  'composedPath',
  'view',
  'contentWindow',
  'contentDocument',
  'sendBeacon',
  'postMessage',
  'constructor',
  'prototype',
  '__proto__',
  'appContext',
  '$el',
  '$root',
  '$parent',
  '$options',
  '$nuxt',
]);

/** Vue helpers the compiler uses for `<component :is>`, `v-bind="object"` and raw HTML: not for custom blocks. */
const BANNED_HELPERS = new Set(['resolveDynamicComponent', 'mergeProps', 'normalizeProps', 'guardReactiveProps']);

const BANNED_TAGS = new Set(['script', 'style', 'iframe', 'frame', 'object', 'embed', 'base', 'meta', 'link', 'component']);

const SUSPICIOUS_TEXT: [RegExp, string][] = [
  [/javascript:/i, '"javascript:" links are not allowed'],
  [/<\s*(script|iframe|object|embed|base|meta)\b/i, 'HTML with scripts or frames is not allowed'],
  [/\son[a-z]+\s*=/i, 'inline on…= event attributes are not allowed; use @click and similar'],
  [/srcdoc/i, '"srcdoc" is not allowed'],
];

export interface CompiledBlock {
  /** An ES module: `export default (Vue) => component` and `export const css`. */
  code: string;
  hash: string;
}

export class BlockCompileError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'));
  }
}

type Node = { type: string; start?: number | null; end?: number | null; loc?: { start: { line: number } } | null; [k: string]: unknown };

const line = (n: Node) => (n.loc ? ` (line ${n.loc.start.line})` : '');
const propName = (n: Node | undefined, computed: boolean): string | undefined => {
  if (!n) return undefined;
  if (!computed && n.type === 'Identifier') return n.name as string;
  if (n.type === 'StringLiteral') return n.value as string;
  return undefined;
};

/** Checks JavaScript (the block's script and the code compiled from its template). `where` names the part for messages. */
function checkCode(code: string, where: string, problems: string[]) {
  let ast;
  try {
    ast = babelParse(code, { sourceType: 'module', plugins: [] });
  } catch (err) {
    problems.push(`${where}: ${(err as Error).message}`);
    return;
  }
  const report = (n: Node, message: string) => problems.push(`${where}${line(n)}: ${message}`);

  walk(ast as never, {
    enter(raw: unknown, rawParent: unknown, key: unknown) {
      const node = raw as Node;
      const parent = rawParent as Node | null;
      switch (node.type) {
        case 'ImportExpression':
        case 'Import':
          report(node, 'dynamic import() is not allowed');
          break;
        case 'MetaProperty':
          report(node, 'import.meta is not allowed');
          break;
        case 'WithStatement':
          report(node, '"with" is not allowed');
          break;
        case 'Identifier': {
          const name = node.name as string;
          const isPropKey =
            parent &&
            ((['MemberExpression', 'OptionalMemberExpression'].includes(parent.type) && key === 'property' && !parent.computed) ||
              (['ObjectProperty', 'ObjectMethod', 'ClassMethod', 'ClassProperty'].includes(parent.type) &&
                key === 'key' &&
                !parent.computed));
          if (isPropKey) break;
          if (BANNED_GLOBALS.has(name)) report(node, `"${name}" is not allowed in a block`);
          if (name === 'window') {
            const member = parent && ['MemberExpression', 'OptionalMemberExpression'].includes(parent.type) && key === 'object';
            const prop = member ? propName(parent.property as Node, Boolean(parent.computed)) : undefined;
            if (!prop || !WINDOW_ALLOWED.has(prop)) {
              report(node, `window${prop ? `.${prop}` : ''} is not allowed; only ${[...WINDOW_ALLOWED].join(', ')}`);
            }
          }
          break;
        }
        case 'MemberExpression':
        case 'OptionalMemberExpression': {
          const prop = propName(node.property as Node, Boolean(node.computed));
          if (prop && (BANNED_PROPS.has(prop) || /^on[a-z]+$/.test(prop))) report(node, `".${prop}" is not allowed in a block`);
          const p = node.property as Node;
          if (node.computed && (p.type === 'TemplateLiteral' || (p.type === 'BinaryExpression' && p.operator === '+'))) {
            report(node, 'property names built from strings are not allowed');
          }
          break;
        }
        case 'ObjectProperty':
        case 'ObjectMethod': {
          const prop = propName(node.key as Node, Boolean(node.computed));
          if (prop && (['innerHTML', 'outerHTML', 'srcdoc'].includes(prop) || /^on[a-z]+$/.test(prop))) {
            report(node, `"${prop}" is not allowed (raw HTML or inline event attributes)`);
          }
          break;
        }
        case 'StringLiteral':
        case 'TemplateElement': {
          const text = node.type === 'StringLiteral' ? (node.value as string) : ((node.value as { raw: string }).raw ?? '');
          for (const [re, message] of SUSPICIOUS_TEXT) if (re.test(text)) report(node, message);
          break;
        }
        case 'CallExpression': {
          const callee = node.callee as Node;
          const name = callee.type === 'Identifier' ? callee.name : propName(callee.property as Node, Boolean(callee.computed));
          const first = (node.arguments as Node[])[0];
          if (
            (name === 'setTimeout' || name === 'setInterval') &&
            first &&
            !['ArrowFunctionExpression', 'FunctionExpression', 'Identifier'].includes(first.type)
          ) {
            report(node, `${name} needs a function, not a string`);
          }
          break;
        }
      }
    },
  });
}

/** The block's own imports: only named imports of allowed functions from "vue". */
function checkImports(script: string, problems: string[]) {
  let ast;
  try {
    ast = babelParse(script, { sourceType: 'module' });
  } catch (err) {
    problems.push(`script: ${(err as Error).message}`);
    return;
  }
  for (const stmt of ast.program.body) {
    if (stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration' || stmt.type === 'ExportAllDeclaration') {
      problems.push('script: a <script setup> block has no exports');
    }
    if (stmt.type !== 'ImportDeclaration') continue;
    if (stmt.source.value !== 'vue') {
      problems.push(`script: only "vue" can be imported, not "${stmt.source.value}"`);
      continue;
    }
    for (const s of stmt.specifiers) {
      const name = s.type === 'ImportSpecifier' ? (s.imported.type === 'Identifier' ? s.imported.name : s.imported.value) : '*';
      if (!ALLOWED_VUE_IMPORTS.includes(name))
        problems.push(`script: "${name}" cannot be imported from vue; allowed: ${ALLOWED_VUE_IMPORTS.join(', ')}`);
    }
  }
}

function checkTemplateTags(nodes: { type: number; tag?: string; children?: unknown[]; props?: { name: string }[] }[], problems: string[]) {
  for (const n of nodes) {
    if (n.type !== 1) continue;
    const tag = (n.tag ?? '').toLowerCase();
    if (BANNED_TAGS.has(tag)) problems.push(`template: <${tag}> is not allowed in a block`);
    for (const p of n.props ?? []) {
      if (p.name === 'html')
        problems.push("template: v-html is not allowed; show formatted text with the block's rich text fields and {{ }}");
      if (p.name === 'is') problems.push('template: "is" is not allowed');
    }
    checkTemplateTags((n.children ?? []) as never, problems);
  }
}

function checkCss(css: string, problems: string[]) {
  if (/@import/i.test(css)) problems.push('style: @import is not allowed');
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    const url = m[2].trim();
    if (!url.startsWith('/uploads/') && !url.startsWith('data:image/') && !url.startsWith('#')) {
      problems.push(`style: url(${url}) is not allowed; use images from the media library (/uploads/…) or image fields`);
    }
  }
  if (/expression\s*\(|behavior\s*:|-moz-binding/i.test(css)) problems.push('style: script-like CSS is not allowed');
}

/** `import { a as b } from "vue"` → `const { a: b } = Vue;` so the module needs no import map. */
function rewriteVueImports(code: string, problems: string[]): string {
  const ast = babelParse(code, { sourceType: 'module' });
  const s = new MagicString(code);
  let hasDefault = false;
  for (const stmt of ast.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      if (stmt.source.value !== 'vue') {
        problems.push(`compiled: unexpected import "${stmt.source.value}"`);
        continue;
      }
      const parts = stmt.specifiers.map((sp) => {
        if (sp.type !== 'ImportSpecifier') throw new BlockCompileError(['script: only named imports from vue are allowed']);
        const imported = sp.imported.type === 'Identifier' ? sp.imported.name : sp.imported.value;
        if (BANNED_HELPERS.has(imported)) problems.push(`template: this feature (${imported}) is not allowed in a block`);
        return imported === sp.local.name ? imported : `${imported}: ${sp.local.name}`;
      });
      s.overwrite(stmt.start!, stmt.end!, `const { ${parts.join(', ')} } = Vue;`);
    } else if (stmt.type === 'ExportDefaultDeclaration') {
      s.overwrite(stmt.start!, stmt.declaration.start!, 'const __block = ');
      hasDefault = true;
    } else if (stmt.type.startsWith('Export')) {
      problems.push('compiled: unexpected export');
    }
  }
  if (!hasDefault) problems.push('compiled: the component has no default export');
  return s.toString();
}

/** Compiles and checks a block. Throws BlockCompileError listing every problem found, so the AI can fix them all at once. */
export function compileBlock(source: string, wrapped = false): CompiledBlock {
  const problems: string[] = [];
  if (source.length > MAX_SOURCE) throw new BlockCompileError([`The component is too long (over ${MAX_SOURCE} characters)`]);
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const id = `data-v-${hash.slice(0, 8)}`;

  const { descriptor, errors } = parse(source, { filename: 'Block.vue', sourceMap: false });
  if (errors.length) throw new BlockCompileError(errors.map((e) => `parse: ${e.message}`));
  const { template, script, scriptSetup, styles, customBlocks } = descriptor;
  if (!template) problems.push('A <template> is required');
  if (template && (template.src || (template.lang && template.lang !== 'html'))) problems.push('template: plain HTML templates only');
  if (script) problems.push('Use <script setup> only (no plain <script>)');
  if (scriptSetup && (scriptSetup.src || scriptSetup.lang)) problems.push('script: plain JavaScript only (no lang="ts", no src)');
  if (customBlocks.length) problems.push(`Unknown top-level tags: ${customBlocks.map((b) => `<${b.type}>`).join(', ')}`);
  for (const st of styles) {
    if (st.src || (st.lang && st.lang !== 'css') || st.module) problems.push('style: plain CSS only (no lang, src or module)');
  }
  if (problems.length) throw new BlockCompileError(problems);
  // A template-only block: add an empty <script setup> so the same path compiles it.
  if (!scriptSetup) {
    if (wrapped) throw new BlockCompileError(['A <script setup> could not be added']);
    return compileBlock(`<script setup>\nconst props = defineProps({ p: { type: Object, required: true } });\n</script>\n${source}`, true);
  }

  checkImports(scriptSetup.content, problems);
  checkTemplateTags((template?.ast?.children ?? []) as never, problems);

  // Every style is scoped to the block, so a block cannot restyle the rest of the page.
  for (const st of styles) st.scoped = true;
  let compiledScript: string;
  try {
    compiledScript = compileScript(descriptor, {
      id,
      inlineTemplate: true,
      templateOptions: { scoped: true, compilerOptions: { scopeId: id } },
    }).content;
  } catch (err) {
    throw new BlockCompileError([...problems, `compile: ${(err as Error).message}`]);
  }
  checkCode(compiledScript, 'component', problems);

  let css = '';
  for (const st of styles) {
    checkCss(st.content, problems);
    const out = compileStyle({ source: st.content, filename: 'Block.vue', id, scoped: true });
    if (out.errors.length) problems.push(...out.errors.map((e) => `style: ${e.message}`));
    css += out.code + '\n';
  }

  const body = rewriteVueImports(compiledScript, problems);
  if (problems.length) throw new BlockCompileError([...new Set(problems)].slice(0, 30));

  const code = [
    `export const css = ${JSON.stringify(css.trim())};`,
    'export default function (Vue) {',
    body,
    `__block.__scopeId = ${JSON.stringify(id)};`,
    'return __block;',
    '}',
    '',
  ].join('\n');
  return { code, hash };
}
