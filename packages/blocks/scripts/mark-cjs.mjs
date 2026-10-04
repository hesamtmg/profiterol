// Mark dist/cjs as CommonJS and dist/esm as ESM so Node resolves each build correctly.
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
writeFileSync(new URL('../dist/esm/package.json', import.meta.url), '{"type":"module"}\n');
