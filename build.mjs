// Builds the static pages at the project root from src/.
//   node build.mjs            build every page, then check local links
//   node build.mjs youth faq  build only those pages
//
// Each file in src/pages starts with a one-line JSON comment:
//   <!-- {"title": "...", "description": "...", "nav": "programs"} -->
// Optional keys: lang ("en"), cta (true), sticky (true: the phone trial bar),
// program ("dragons" | "beginners" | "adults"), bodyClass. Everything after that line is the page's <main> content.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

const ZEN = 'https://emeraldcitykarate.sites.zenplanner.com';
const TRIAL = {
  dragons: `${ZEN}/registration.cfm?payment=MEMBERSHIP&amp;MembershipTemplateId=EFB2BBB3-B70D-4E5A-BB3D-D2C3D8412E67`,
  beginners: `${ZEN}/registration.cfm?payment=MEMBERSHIP&amp;MembershipTemplateId=B2494C83-88AF-4D23-8691-B3865064F02E`,
  adults: `${ZEN}/registration.cfm?payment=MEMBERSHIP&amp;MembershipTemplateId=B2494C83-88AF-4D23-8691-B3865064F02E`,
};

const partial = {
  header: read('src/partials/header.html'),
  footer: read('src/partials/footer.html'),
  cta: read('src/partials/cta.html'),
  booking: read('src/partials/booking.html'),
  notes: read('src/partials/notes.html'),
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function parsePage(file) {
  const src = read(`src/pages/${file}`);
  const m = src.match(/^<!--\s*(\{.*\})\s*-->\r?\n/);
  if (!m) throw new Error(`${file}: first line must be a JSON comment with title and description`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${file}: front matter is not valid JSON (${e.message})`); }
  if (!meta.title || !meta.description) throw new Error(`${file}: title and description are required`);
  return { meta, content: src.slice(m[0].length) };
}

function header(slug, nav) {
  let h = partial.header;
  // the page's own link
  h = h.split(`href="${slug}.html"`).join(`href="${slug}.html" aria-current="page"`);
  // its section in the top navigation
  if (nav) h = h.split(`data-nav="${nav}"`).join(`data-nav="${nav}" data-current`);
  return h;
}

function render(slug, { meta, content }) {
  const lang = meta.lang || 'en';
  const program = TRIAL[meta.program] ? meta.program : null;
  const cta = meta.cta === false ? '' : partial.cta
    .replace('{{bookHref}}', program ? TRIAL[program] : `${ZEN}/sign-up-now.cfm`)
    .replace('{{bookProgram}}', program ? ` data-program="${program}"` : '');
  let footer = partial.footer.split(`href="${slug}.html"`).join(`href="${slug}.html" aria-current="page"`);
  if (meta.sticky === false) footer = footer.replace(/\n\s*<!-- Mobile: one action always in reach -->[\s\S]*$/, '\n');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}">
  <!-- Concept mockup: keep it out of search results -->
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#063A2D">
  <link rel="icon" href="assets/img/favicon.png">
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/pages.css">
</head>
<body class="page-${slug}${meta.bodyClass ? ' ' + meta.bodyClass : ''}">
${header(slug, meta.nav)}
  <main id="main">
${content.replace(/\s+$/, '')}
${cta}  </main>

${footer}
${partial.booking}
${partial.notes}
  <script src="js/data.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
`;
}

// One stylesheet for everything outside the home page and the sign-up dialog.
const cssFiles = readdirSync(join(root, 'src/css')).filter((f) => f.endsWith('.css')).sort();
writeFileSync(join(root, 'css/pages.css'),
  '/* Built from src/css by build.mjs. Edit the files there, not this one. */\n\n' +
  cssFiles.map((f) => `/* ===== ${f} ===== */\n${read(`src/css/${f}`).trim()}\n`).join('\n'));

const only = process.argv.slice(2);
const files = readdirSync(join(root, 'src/pages')).filter((f) => f.endsWith('.html')).sort();
const built = [];
for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  if (only.length && !only.includes(slug)) continue;
  writeFileSync(join(root, `${slug}.html`), render(slug, parsePage(file)));
  built.push(slug);
}
console.log(`built ${built.length} page(s): ${built.join(', ')}`);

// Check that local links and files exist (full builds only, so partial builds stay quiet).
if (!only.length) {
  const problems = [];
  for (const slug of built) {
    const html = read(`${slug}.html`);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|tel:|data:|sms:)/.test(url)) continue;
      const [path, hash] = url.split('#');
      if (path && !existsSync(join(root, decodeURI(path)))) problems.push(`${slug}.html -> missing ${path}`);
      if (!path && hash && !ids.has(hash)) problems.push(`${slug}.html -> no element with id "${hash}"`);
      if (path && hash && path.endsWith('.html') && existsSync(join(root, path))) {
        const other = read(path);
        if (!other.includes(`id="${hash}"`)) problems.push(`${slug}.html -> ${path} has no id "${hash}"`);
      }
    }
  }
  const unique = [...new Set(problems)];
  if (unique.length) { console.log(`\n${unique.length} broken local link(s):`); unique.forEach((p) => console.log('  ' + p)); }
  else console.log('all local links resolve');
}
