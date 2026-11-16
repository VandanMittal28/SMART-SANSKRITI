import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const collect = (dir) => readdirSync(join(root, dir), { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory()
    ? collect(`${dir}/${entry.name}`)
    : entry.name.endsWith('.md') ? [`${dir}/${entry.name}`] : []);
// Current entry points and maintained guides. Historical delivery records retain
// their original paths and claims; they are linked as dated source evidence.
const files = [
  'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'docs/README.md',
  'docs/architecture.md', 'docs/product/overview.md', 'docs/product/roadmap.md',
  'apps/operations/README.md', 'apps/visitor-web/README.md', 'apk/ui/README.md',
  ...collect('docs/engineering'),
];
const errors = [];
let links = 0;
for (const file of files) {
  const content = readFileSync(join(root, file), 'utf8');
  const targets = [
    ...content.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g),
    ...content.matchAll(/(?:src|href)="([^"]+)"/g),
  ];
  for (const [, raw] of targets) {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(raw)) continue;
    let target;
    try { target = decodeURIComponent(raw.split(/[?#]/)[0]); }
    catch { errors.push(`${file}: invalid encoded link ${raw}`); continue; }
    if (!target) continue;
    links++;
    if (!existsSync(resolve(root, dirname(file), target))) {
      errors.push(`${file}: missing local link ${raw}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} maintained Markdown files and ${links} local links.`);
}
