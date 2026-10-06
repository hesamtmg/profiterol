/**
 * Checks the business types owners can pick (packages/blocks/src/business.ts) against the latest schema.org
 * vocabulary. Fails when a type was removed, replaced or moved in or out of LocalBusiness, and lists business types
 * schema.org has that the list does not offer yet, so they can be added to a category.
 *
 *   npm run build -w @profiterol/blocks && npm run check:business-types
 *
 * SCHEMA_VOCAB may point to a downloaded copy of the vocabulary instead.
 */
import { readFile } from 'node:fs/promises';
import { businessCategories, nonLocalBusinessTypes } from '../packages/blocks/dist/esm/index.js';

const VOCAB = process.env.SCHEMA_VOCAB ?? 'https://schema.org/version/latest/schemaorg-current-https.jsonld';

const raw = /^https?:/.test(VOCAB) ? await (await fetch(VOCAB)).text() : await readFile(VOCAB, 'utf8');
const graph = JSON.parse(raw)['@graph'];
const name = (id) => id.replace(/^schema:/, '');
const list = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Every class: its parents, and whether schema.org replaced it or still has it as a proposal. */
const classes = new Map();
for (const node of graph) {
  if (!list(node['@type']).includes('rdfs:Class')) continue;
  classes.set(name(node['@id']), {
    parents: list(node['rdfs:subClassOf']).map((p) => name(p['@id'])),
    supersededBy: list(node['schema:supersededBy']).map((p) => name(p['@id'])),
    pending: JSON.stringify(node['schema:isPartOf'] ?? '').includes('pending'),
  });
}

function isA(type, ancestor) {
  const seen = new Set();
  const walk = (t) => t === ancestor || (!seen.has(t) && (seen.add(t), (classes.get(t)?.parents ?? []).some(walk)));
  return walk(type);
}

const offered = businessCategories.flatMap((c) => c.types.map((t) => t.type));
const problems = [];

for (const type of offered) {
  const c = classes.get(type);
  if (!c) problems.push(`${type}: no longer in schema.org`);
  else if (c.supersededBy.length) problems.push(`${type}: replaced by ${c.supersededBy.join(', ')}`);
  else if (c.pending) problems.push(`${type}: only a proposal ("pending") in schema.org`);
  else if (isA(type, 'LocalBusiness') === nonLocalBusinessTypes.includes(type)) {
    problems.push(`${type}: ${isA(type, 'LocalBusiness') ? 'is' : 'is not'} a LocalBusiness; update nonLocalBusinessTypes`);
  }
}
for (const type of new Set(offered).size === offered.length ? [] : offered) {
  if (offered.indexOf(type) !== offered.lastIndexOf(type)) problems.push(`${type}: offered twice`);
}

const missing = [...classes.entries()]
  .filter(([type, c]) => !offered.includes(type) && !c.supersededBy.length && !c.pending)
  .filter(([type]) => isA(type, 'LocalBusiness') || isA(type, 'Organization'))
  .map(([type]) => type)
  .sort();

console.log(`${offered.length} types in ${businessCategories.length} categories checked against ${VOCAB}`);
if (missing.length) console.log(`\nNot offered yet (${missing.length}); add any that owners would look for:\n  ${missing.join(', ')}`);
if (problems.length) {
  console.error(`\nFix these in packages/blocks/src/business.ts:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll offered types are current.');
