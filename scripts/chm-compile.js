/**
 * CHM Project Generator + Compiler
 * Generates HHP/HHC/HHK files and invokes hhc.exe
 *
 * Usage: node scripts/chm-compile.js
 */
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

async function main() {
  const tag = process.env.UPSTREAM_TAG || '';
  const chmName = tag ? 'jquery-api-reference-' + tag + '.chm' : 'jquery-api-reference.chm';
  const htmlDir = path.resolve(__dirname, '..', 'dist', 'html');
  const chmOutput = path.join(htmlDir, chmName);
  const dataDir = path.resolve(__dirname, '..', 'data', 'en');

  console.log('Generating CHM project files...');

  // Load data
  const api = await fs.readJson(path.join(dataDir, 'api.json'));
  const { entries, categories, categoryEntries } = api;

  // Collect all HTML files
  const apiDir = path.join(htmlDir, 'api');
  let apiFiles = [];
  if (await fs.pathExists(apiDir)) {
    apiFiles = await fs.readdir(apiDir);
    apiFiles = apiFiles.filter(f => f.endsWith('.html'));
  }

  // Collect all asset files
  const assetsDir = path.join(htmlDir, 'assets');
  const allFiles = [];

  // HTML files
  allFiles.push('index.html');
  allFiles.push('cheatsheet.html');
  for (const f of apiFiles) {
    allFiles.push('api/' + f);
  }

  // Asset files
  if (await fs.pathExists(assetsDir)) {
    const walkDir = async (dir, prefix) => {
      const items = await fs.readdir(path.join(htmlDir, dir));
      for (const item of items) {
        const fullPath = path.join(htmlDir, dir, item);
        const relPath = dir + '/' + item;
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await walkDir(relPath, prefix);
        } else {
          allFiles.push(relPath);
        }
      }
    };
    await walkDir('assets', 'assets');
  }

  console.log(`  ${allFiles.length} files to include`);

  // 1. Generate HHP file
  console.log('  - Generating project.hhp...');
  let hhp = '[OPTIONS]\n';
  hhp += 'Compatibility=1.1 or later\n';
  hhp += 'Compiled file=' + chmName + '\n';
  hhp += 'Contents file=index.hhc\n';
  hhp += 'Index file=index.hhk\n';
  hhp += 'Default Window=main\n';
  hhp += 'Default topic=index.html\n';
  hhp += 'Display compile progress=No\n';
  hhp += 'Language=0x409 English (United States)\n';
  hhp += 'Title=jQuery API Reference\n\n';
  hhp += '[WINDOWS]\n';
  hhp += 'main="jQuery API Reference","index.hhc","index.hhk","index.html","index.html",,,,,0x2520,,0x387e,,,,,,,,0\n\n';
  hhp += '[FILES]\n';
  for (const f of allFiles) {
    hhp += f.replace(/\//g, '\\') + '\n';
  }

  await fs.writeFile(path.join(htmlDir, 'project.hhp'), hhp, 'utf-8');

  // 2. Generate HHC (Table of Contents)
  console.log('  - Generating index.hhc...');

  // Build entry lookup
  const entryMap = {};
  for (const e of entries) {
    entryMap[e.id] = e;
  }

  function generateTOC(cat, depth) {
    let html = '';
    const indent = '  '.repeat(depth + 1);

    const catSlug = cat.slug;
    const catEnts = (categoryEntries[catSlug] || [])
      .filter(id => entryMap[id]) // filter out missing entries
      .filter((id, i, arr) => arr.indexOf(id) === i); // deduplicate

    const hasChildren = cat.children && cat.children.length > 0;
    const hasEntries = catEnts.length > 0;

    if (!hasChildren && !hasEntries) return '';

    html += indent + '<LI><OBJECT type="text/sitemap">\n';
    html += indent + '  <param name="Name" value="' + escapeHH(cat.name) + '">\n';
    html += indent + '  <param name="Local" value="' + (catEnts.length === 1 ? 'api/' + catEnts[0] + '.html' : '') + '">\n';
    html += indent + '</OBJECT>\n';

    if (hasEntries || hasChildren) {
      html += indent + '<UL>\n';
      // Render entries
      for (const eid of catEnts) {
        const e = entryMap[eid];
        if (!e || !e.title) continue;
        html += indent + '  <LI><OBJECT type="text/sitemap">\n';
        html += indent + '    <param name="Name" value="' + escapeHH(e.title) + '">\n';
        html += indent + '    <param name="Local" value="api/' + eid + '.html">\n';
        html += indent + '  </OBJECT></LI>\n';
      }
      // Render children
      if (cat.children) {
        for (const child of cat.children) {
          html += generateTOC(child, depth + 2);
        }
      }
      html += indent + '</UL>\n';
    }

    return html;
  }

  // Filter out metadata categories
  const navCats = categories.children
    ? categories.children.filter(c =>
        c.slug !== 'version' && c.slug !== 'deprecated' && c.slug !== 'removed' && c.slug !== 'uncategorized')
    : [];

  let hhc = '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">\n';
  hhc += '<HTML>\n<HEAD>\n';
  hhc += '<meta name="GENERATOR" content="jquery-docs build tool">\n';
  hhc += '</HEAD>\n<BODY>\n';
  hhc += '<OBJECT type="text/site properties">\n';
  hhc += '  <param name="Window Styles" value="0x800025">\n';
  hhc += '</OBJECT>\n';
  hhc += '<UL>\n';
  hhc += '  <LI><OBJECT type="text/sitemap">\n';
  hhc += '    <param name="Name" value="jQuery API Reference">\n';
  hhc += '    <param name="Local" value="index.html">\n';
  hhc += '  </OBJECT>\n';
  hhc += '  <UL>\n';
  hhc += '    <LI><OBJECT type="text/sitemap">\n';
  hhc += '      <param name="Name" value="Cheatsheet">\n';
  hhc += '      <param name="Local" value="cheatsheet.html">\n';
  hhc += '    </OBJECT></LI>\n';

  for (const cat of navCats) {
    const tocSection = generateTOC(cat, 2);
    if (tocSection) {
      hhc += tocSection;
    }
  }

  hhc += '  </UL>\n</UL>\n';
  hhc += '</BODY>\n</HTML>\n';

  await fs.writeFile(path.join(htmlDir, 'index.hhc'), hhc, 'utf-8');

  // 3. Generate HHK (Index)
  console.log('  - Generating index.hhk...');
  let hhk = '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">\n';
  hhk += '<HTML>\n<HEAD>\n';
  hhk += '<meta name="GENERATOR" content="jquery-docs build tool">\n';
  hhk += '</HEAD>\n<BODY>\n<UL>\n';

  // Sort entries alphabetically by title
  const sorted = entries.filter(e => e.title).sort((a, b) => {
    const ta = (a.title || '').toLowerCase().replace(/^[.:]/, '');
    const tb = (b.title || '').toLowerCase().replace(/^[.:]/, '');
    return ta.localeCompare(tb);
  });

  // Deduplicate by title
  const seen = new Set();
  for (const e of sorted) {
    const key = e.title;
    if (seen.has(key)) continue;
    seen.add(key);

    hhk += '  <LI><OBJECT type="text/sitemap">\n';
    hhk += '    <param name="Name" value="' + escapeHH(e.title) + '">\n';
    hhk += '    <param name="Local" value="api/' + e.id + '.html">\n';
    hhk += '  </OBJECT></LI>\n';
  }

  hhk += '</UL>\n</BODY>\n</HTML>\n';
  await fs.writeFile(path.join(htmlDir, 'index.hhk'), hhk, 'utf-8');

  // 4. Compile CHM
  console.log('  - Compiling CHM...');
  const hhpPath = path.join(htmlDir, 'project.hhp');

  // Find hhc.exe
  let hhcExe = null;
  // Try finding via PATH first (works with Chocolatey install)
  try {
    const where = process.platform === 'win32' ? 'where hhc' : 'which hhc';
    const out = execSync(where, { stdio: 'pipe', encoding: 'utf-8' });
    const found = out.trim().split('\n')[0].trim();
    if (found) {
      hhcExe = found;
      console.log('  Found hhc.exe:', hhcExe);
    }
  } catch (e) { /* not in PATH */ }

  // Fallback: check known install paths
  if (!hhcExe) {
    const knownPaths = [
      'C:\\Program Files (x86)\\HTML Help Workshop\\hhc.exe',
      'C:\\Program Files\\HTML Help Workshop\\hhc.exe',
      'C:\\ProgramData\\chocolatey\\bin\\hhc.exe',
      'C:\\ProgramData\\chocolatey\\lib\\html-help-workshop\\tools\\hhc.exe'
    ];
    for (const p of knownPaths) {
      if (fs.existsSync(p)) {
        hhcExe = p;
        console.log('  Found hhc.exe:', p);
        break;
      }
    }
  }

  if (!hhcExe) {
    console.warn('Warning: hhc.exe not found. Skipping CHM compilation.');
    console.warn('Install: choco install html-help-workshop -y');
    console.warn('HHP/HHC/HHK files generated in dist/html/ — compile manually.');
    return;
  }

  try {
    // hhc.exe requires running from the project directory
    const cmd = '"' + hhcExe + '" project.hhp';
    console.log('    Running: ' + cmd);
    execSync(cmd, {
      cwd: htmlDir,
      stdio: 'inherit',
      timeout: 120000
    });

    if (await fs.pathExists(chmOutput)) {
      console.log('  CHM compiled successfully: ' + chmOutput);
      const stats = await fs.stat(chmOutput);
      console.log('  Size: ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB');
    } else {
      console.warn('Warning: CHM file not generated. Check HTML Help Workshop output.');
    }
  } catch (e) {
    console.error('CHM compilation failed:', e.message);
    console.log('HHP/HHC/HHK files are still available in dist/html/');
  }
}

function escapeHH(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main().catch(err => {
  console.error('CHM generation failed:', err);
  process.exit(1);
});
