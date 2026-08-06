import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');

const checks = [
  ['React framework has a stable vendor chunk', viteConfig.includes("return 'vendor-react'")],
  ['icon library has a stable vendor chunk', viteConfig.includes("return 'vendor-icons'")],
  ['visual effects have a stable vendor chunk', viteConfig.includes("return 'vendor-effects'")],
  ['other dependencies are isolated from the app entry', viteConfig.includes("return 'vendor-misc'")],
  ['CSS splitting remains enabled', viteConfig.includes('cssCodeSplit: true')],
  ['production source maps remain disabled', viteConfig.includes('sourcemap: false')],
  ['chunks use cache-stable hashed paths', viteConfig.includes("chunkFileNames: 'assets/chunks/[name]-[hash].js'")],
  ['entry bundle uses a hashed path', viteConfig.includes("entryFileNames: 'assets/entry/[name]-[hash].js'")],
  ['images and styles are grouped separately', viteConfig.includes("return 'assets/images/[name]-[hash][extname]'") && viteConfig.includes("return 'assets/styles/[name]-[hash][extname]'" )],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? '✓' : '✗'} ${label}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`Build performance audit failed: ${failures} check(s) did not pass.`);
  process.exit(1);
}

console.log('Build performance audit passed.');
