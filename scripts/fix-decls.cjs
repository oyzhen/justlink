/**
 * Post-build script: rewrite `.ts` → `.js` in declaration files so that
 * consumers using `moduleResolution: "node16"` or `"nodenext"` can resolve
 * the types correctly.
 */
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const dist = join(__dirname, '..', 'dist');

for (const name of ['browser', 'node', 'memory', 'core']) {
    const file = join(dist, `${name}.d.ts`);
    if (!existsSync(file)) {continue;}
    let content = readFileSync(file, 'utf8');
    // Rewrite import("./core.ts") → import("./core.js") and from './core.ts' → from './core.js'
    content = content.replace(/\.ts'/g, ".js'").replace(/\.ts"/g, '.js"');
    writeFileSync(file, content);
}
