#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function renderTable(lines) {
  if (lines.length < 2) return '';
  const rows = lines.map((line) => line.split('|').slice(1, -1).map((c) => inlineMarkdown(c.trim())));
  const head = rows[0];
  const body = rows.slice(2);
  return `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const toc = [];
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      if (level <= 3) toc.push({ level, id, text });
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const block = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        block.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(`<pre><code class="lang-${lang}">${esc(block.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('|---')) {
      const tableLines = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      html.push(`<figure><img src="${img[2]}" alt="${esc(img[1])}"><figcaption>${esc(img[1])}</figcaption></figure>`);
      i += 1;
      continue;
    }

    if (line.match(/^[-*]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      html.push(`<ul>${items.map((x) => `<li>${inlineMarkdown(x)}</li>`).join('')}</ul>`);
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      html.push(`<ol>${items.map((x) => `<li>${inlineMarkdown(x)}</li>`).join('')}</ol>`);
      continue;
    }

    const para = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,6})\s+/) && !lines[i].startsWith('```') && !lines[i].match(/^[-*]\s+/) && !lines[i].match(/^\d+\.\s+/)) {
      para.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inlineMarkdown(para.join(' '))}</p>`);
  }

  return { content: html.join('\n'), toc };
}

function renderPage({ title, subtitle, toc, content, sourceRel }) {
  const tocHtml = toc.map((item) => `<a class="toc-l${item.level}" href="#${item.id}">${esc(item.text)}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>
:root{--bg:#0a1120;--panel:#101c33;--line:#284b78;--text:#e6f2ff;--muted:#b7d0ea;--accent:#7ec7ff;--code:#0b1628}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#162846,var(--bg) 52%);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}
.shell{max-width:1320px;margin:0 auto;padding:20px;display:grid;grid-template-columns:290px 1fr;gap:14px}
@media(max-width:980px){.shell{grid-template-columns:1fr}.toc{position:static}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px}
.toc{padding:14px;position:sticky;top:14px;max-height:calc(100vh - 28px);overflow:auto}
.toc h3{margin:0 0 8px;font-size:14px;color:var(--accent)}
.toc a{display:block;color:var(--muted);text-decoration:none;padding:5px 6px;border-radius:6px;font-size:13px}
.toc a:hover{background:#173159;color:#ecf7ff}
.toc .toc-l1{font-weight:700;color:#eaf4ff;margin-top:6px}
.toc .toc-l2{padding-left:14px}
.toc .toc-l3{padding-left:28px;font-size:12px}
.main{padding:20px 24px}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.toolbar a{display:inline-block;background:#132542;border:1px solid #2a4f7f;color:#e8f4ff;text-decoration:none;border-radius:8px;padding:8px 12px;font-size:13px}
.header{margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.header h1{margin:0;font-size:30px}.header p{margin:6px 0 0;color:var(--muted)}
.header .meta{margin-top:10px;font-size:12px;color:var(--muted)}
h1,h2,h3,h4,h5,h6{color:#eaf4ff;scroll-margin-top:18px}
h2{border-bottom:1px solid #234265;padding-bottom:6px;margin-top:30px}
p,li{color:#d4e6f9;line-height:1.65}a{color:#9ed5ff}
code{background:#1a2f4d;color:#eaf4ff;padding:1px 5px;border-radius:5px;font-size:.92em}
pre{background:var(--code);border:1px solid #223e63;border-radius:10px;padding:12px;overflow:auto}
pre code{background:none;padding:0}
img{max-width:100%;height:auto;border-radius:10px;border:1px solid #2e5788;background:#132540}
figure{margin:16px 0}figcaption{font-size:12px;color:var(--muted);margin-top:6px}
table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #274870;padding:8px;text-align:left}th{background:#162b47}
</style>
</head>
<body>
<div class="shell">
<aside class="panel toc"><h3>Contents</h3>${tocHtml}</aside>
<main class="panel main">
<div class="toolbar">
  <a href="/">Back to Arcade</a>
  <a href="/1942/">Play 1942</a>
  <a href="#book">Open Book</a>
  <a href="#mechanics">Open Mechanics</a>
  <a href="./assets/highfi/art-manifest.json">Open Art Manifest</a>
</div>
<div class="header"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p><div class="meta">Source: <a href="${sourceRel}">${sourceRel}</a></div></div>
${content}
</main>
</div>
</body>
</html>`;
}

function buildUnifiedDoc() {
  const inputRel = '1942/design/1942-design.md';
  const outputRel = '1942/design/index.html';
  const title = '1942 Pixel Campaigns Unified Design Doc';
  const subtitle = 'Single-source markdown rendered to one HTML review surface for book + mechanics + production assets.';

  const inputAbs = resolve(ROOT, inputRel);
  const outputAbs = resolve(ROOT, outputRel);
  if (!existsSync(inputAbs)) {
    throw new Error(`Missing input: ${inputRel}`);
  }

  const md = readFileSync(inputAbs, 'utf8');
  const { toc, content } = markdownToHtml(md);
  const sourceRel = relative(dirname(outputAbs), inputAbs).replace(/\\/g, '/');
  const html = renderPage({ title, subtitle, toc, content, sourceRel });
  writeFileSync(outputAbs, html, 'utf8');
  console.log(`generated ${outputRel}`);
}

buildUnifiedDoc();
