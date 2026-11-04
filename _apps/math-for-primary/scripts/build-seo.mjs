import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createServer } from 'vite';

// Read the actual lesson catalogue at build time. No duplicated lesson copy or browser-only crawl.
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
try {
  const { publicPages, homeDirectoryHtml, homeSchema } = await server.ssrLoadModule('/src/seo/pages.tsx');
  const { PUBLIC_BASE, SITE_URL } = await server.ssrLoadModule('/src/seo/paths.ts');
  const pages = publicPages();
  const styles = (await readdir(resolve(root, 'dist/assets'))).filter(name => name.endsWith('.css')).sort();
  const styleLinks = styles.map(name => `<link rel="stylesheet" href="${PUBLIC_BASE}assets/${name}">`).join('\n');
  const seen = new Set();
  for (const page of pages) {
    if (!page.path.startsWith(PUBLIC_BASE) || !page.path.endsWith('/') || seen.has(page.path)) throw new Error(`Invalid or duplicate public path: ${page.path}`);
    seen.add(page.path);
    const canonical = `https://soujanyaporia.github.io${page.path}`;
    const html = `<!doctype html>
<html lang="en-SG"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}">
<link rel="canonical" href="${canonical}"><meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="Singapore Primary Maths"><meta property="og:locale" content="en_SG">
<meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}">
<meta name="theme-color" content="#fff8ef"><link rel="icon" type="image/svg+xml" href="${PUBLIC_BASE}favicon.svg">
${styleLinks}<link rel="stylesheet" href="${PUBLIC_BASE}resources.css">
${page.schema.map(schema => `<script type="application/ld+json">${json(schema)}</script>`).join('\n')}
</head><body class="resource-body">${page.html}</body></html>\n`;
    const file = resolve(root, 'dist', page.path.slice(PUBLIC_BASE.length), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  }
  const indexPath = resolve(root, 'dist/index.html');
  let index = await readFile(indexPath, 'utf8');
  if (!index.includes('<!-- public-maths-directory -->')) throw new Error('Homepage directory placeholder is missing');
  index = index.replace('<!-- public-maths-directory -->', homeDirectoryHtml())
    .replace('</head>', `<script type="application/ld+json">${json(homeSchema)}</script>\n</head>`);
  await writeFile(indexPath, index);
  // No artificial lastmod dates: URLs enter the sitemap only when their real HTML is built.
  const urls = [SITE_URL, ...pages.map(page => `https://soujanyaporia.github.io${page.path}`)];
  await writeFile(resolve(root, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
  console.log(`SEO: built ${pages.length} readable public pages; sitemap contains ${urls.length} canonical URLs.`);
} finally {
  await server.close();
}
