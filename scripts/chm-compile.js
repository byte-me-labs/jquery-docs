/**
 * CHM Project Generator + Compiler
 * Usage: node scripts/chm-compile.js [--lang=en|zh|both]
 */
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

async function buildCHM(lang) {
  const suffix = lang === 'zh' ? '-zh' : '-en';
  const chmName = 'jquery-api-reference' + suffix + '.chm';
  const htmlDir = path.resolve(__dirname, '..', 'dist', 'html');
  const dataDir = path.resolve(__dirname, '..', 'data', 'en');

  console.log('Generating ' + lang.toUpperCase() + ' CHM project files...');

  const api = await fs.readJson(path.join(dataDir, 'api.json'));
  let { entries, categories, categoryEntries } = api;


  // Collect files: only include target language + shared assets
  const allFiles = [];
  const walkDir = async (dir) => {
    const fullDir = path.join(htmlDir, dir);
    if (!await fs.pathExists(fullDir)) return;
    const items = await fs.readdir(fullDir);
    for (const item of items) {
      if (/\.(chm|chw)$/i.test(item)) continue;
      if (/\.(gitignore|xml|iml|md|txt)$/i.test(item)) continue;
      if (item.startsWith('index-test') || item.startsWith('test-')) continue;
      // Skip the other language directory
      if ((lang === 'en' && item === 'zh') || (lang === 'zh' && item === 'en')) continue;
      const relPath = dir ? dir + '/' + item : item;
      const stat = await fs.stat(path.join(fullDir, item));
      if (stat.isDirectory() && item !== '.git') {
        await walkDir(relPath);
      } else if (!stat.isDirectory()) {
        allFiles.push(relPath);
      }
    }
  };
  await walkDir('');

  console.log('  ' + allFiles.length + ' files to include');

  // 1. HHP
  console.log('  - Generating project.hhp...');
  let hhp = '[OPTIONS]\n';
  hhp += 'Compatibility=1.1 or later\n';
  hhp += 'Compiled file=' + chmName + '\n';
  hhp += 'Contents file=index.hhc\n';
  hhp += 'Index file=index.hhk\n';
  hhp += 'Default Window=main\n';
  hhp += 'Default topic=' + lang + '\\cheatsheet.html\n';
  hhp += 'Display compile progress=No\n';
  hhp += 'Language=0x409 English (United States)\n';
  hhp += 'Title=jQuery API Reference\n\n';
  hhp += '[WINDOWS]\n';
  hhp += 'main="jQuery API Reference","index.hhc","index.hhk","' + lang + '\\cheatsheet.html","' + lang + '\\cheatsheet.html",,,,,0x2520,,0x387e,,,,,,,,0\n\n';
  hhp += '[FILES]\n';
  for (const f of allFiles) {
    hhp += f.replace(/\//g, '\\') + '\n';
  }
  await fs.writeFile(path.join(htmlDir, 'project.hhp'), hhp, 'utf-8');

  // 2. HHC (Table of Contents)
  console.log('  - Generating index.hhc...');

  const entryMap = {};
  for (const e of entries) entryMap[e.id] = e;

  function generateTOC(cat, depth) {
    let html = '';
    const indent = '  '.repeat(depth + 1);
    const catEnts = (categoryEntries[cat.slug] || [])
      .filter(id => entryMap[id])
      .filter((id, i, arr) => arr.indexOf(id) === i);

    if (!catEnts.length && !(cat.children && cat.children.length)) return '';

    html += indent + '<LI><OBJECT type="text/sitemap">\n';
    html += indent + '  <param name="Name" value="' + esc(cat.name) + '">\n';
    html += indent + '  <param name="Local" value="' + (catEnts.length === 1 ? lang + '/api/' + catEnts[0] + '.html' : '') + '">\n';
    html += indent + '</OBJECT>\n';

    if (catEnts.length || (cat.children && cat.children.length)) {
      html += indent + '<UL>\n';
      for (const eid of catEnts) {
        const e = entryMap[eid];
        if (!e || !e.title) continue;
        html += indent + '  <LI><OBJECT type="text/sitemap">\n';
        html += indent + '    <param name="Name" value="' + esc(e.title) + '">\n';
        html += indent + '    <param name="Local" value="' + lang + '/api/' + eid + '.html">\n';
        html += indent + '  </OBJECT></LI>\n';
      }
      if (cat.children) {
        for (const child of cat.children) {
          html += generateTOC(child, depth + 2);
        }
      }
      html += indent + '</UL>\n';
    }
    return html;
  }

  const navCats = categories.children
    ? categories.children.filter(c =>
        c.slug !== 'version' && c.slug !== 'deprecated' && c.slug !== 'removed' && c.slug !== 'uncategorized')
    : [];

  let hhc = '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">\n';
  hhc += '<HTML>\n<HEAD>\n</HEAD>\n<BODY>\n';
  hhc += '<OBJECT type="text/site properties">\n';
  hhc += '  <param name="Window Styles" value="0x800025">\n';
  hhc += '</OBJECT>\n';
  hhc += '<UL>\n';
  hhc += '  <LI><OBJECT type="text/sitemap">\n';
  hhc += '    <param name="Name" value="jQuery API Reference">\n';
  hhc += '    <param name="Local" value="' + lang + '\\cheatsheet.html">\n';
  hhc += '  </OBJECT>\n';
  hhc += '  <UL>\n';

  for (const cat of navCats) {
    const tocSection = generateTOC(cat, 2);
    if (tocSection) hhc += tocSection;
  }

  hhc += '  </UL>\n</UL>\n';
  hhc += '</BODY>\n</HTML>\n';
  await fs.writeFile(path.join(htmlDir, 'index.hhc'), hhc, 'utf-8');

  // 3. HHK (Index)
  console.log('  - Generating index.hhk...');
  let hhk = '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">\n';
  hhk += '<HTML>\n<HEAD>\n</HEAD>\n<BODY>\n<UL>\n';

  const sorted = entries.filter(e => e.title).sort((a, b) => {
    const ta = (a.title || '').toLowerCase().replace(/^[.:]/, '');
    const tb = (b.title || '').toLowerCase().replace(/^[.:]/, '');
    return ta.localeCompare(tb);
  });

  const seen = new Set();
  for (const e of sorted) {
    if (seen.has(e.title)) continue;
    seen.add(e.title);
    hhk += '  <LI><OBJECT type="text/sitemap">\n';
    hhk += '    <param name="Name" value="' + esc(e.title) + '">\n';
    hhk += '    <param name="Local" value="' + lang + '/api/' + e.id + '.html">\n';
    hhk += '  </OBJECT></LI>\n';
  }

  hhk += '</UL>\n</BODY>\n</HTML>\n';
  await fs.writeFile(path.join(htmlDir, 'index.hhk'), hhk, 'utf-8');

  // 4. Compile
  console.log('  - Compiling CHM...');
  let hhcExe = null;
  try {
    const out = execSync('where hhc', { stdio: 'pipe', encoding: 'utf-8' });
    hhcExe = out.trim().split('\n')[0].trim();
    console.log('  Found hhc.exe:', hhcExe);
  } catch (e) { /* not in PATH */ }

  if (!hhcExe) {
    const known = [
      'C:\\Program Files (x86)\\HTML Help Workshop\\hhc.exe',
      'C:\\Program Files\\HTML Help Workshop\\hhc.exe',
      'C:\\ProgramData\\chocolatey\\bin\\hhc.exe',
    ];
    for (const p of known) {
      if (fs.existsSync(p)) { hhcExe = p; console.log('  Found hhc.exe:', p); break; }
    }
  }

  if (!hhcExe) {
    console.warn('Warning: hhc.exe not found. Skipping CHM compilation.');
    return;
  }

  try {
    execSync('"' + hhcExe + '" project.hhp', { cwd: htmlDir, stdio: 'inherit', timeout: 120000 });
  } catch (e) { /* hhc.exe returns non-zero even on success */ }

  const chmOutput = path.join(htmlDir, chmName);
  if (await fs.pathExists(chmOutput)) {
    console.log('  CHM compiled successfully: ' + chmOutput);
    console.log('  Size: ' + (fs.statSync(chmOutput).size / 1024 / 1024).toFixed(2) + ' MB');
  } else {
    console.warn('Warning: CHM file not generated.');
  }
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '');
}

async function main() {
  const args = process.argv.slice(2);
  let lang = 'en';
  for (const a of args) {
    if (a === '--lang=zh') lang = 'zh';
    else if (a === '--lang=en') lang = 'en';
    else if (a === '--lang=both') { await buildCHM('en'); await buildCHM('zh'); return; }
  }
  await buildCHM(lang);
}

main().catch(err => {
  console.error('CHM generation failed:', err);
  process.exit(1);
});
