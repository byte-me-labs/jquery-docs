/**
 * Generate HTML from JSON data + EJS templates.
 * Usage: node scripts/generate.js
 */
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const he = require('he');
const { buildChineseData } = require('../src/translate/zh');

async function buildLang(lang, api, templateDir, outputBase) {
  const outputDir = path.join(outputBase, lang);
  await fs.ensureDir(path.join(outputDir, 'api'));

  const { entries, categories, displayCategories, categoryEntries, notes, ui } = api;
  console.log(`  [${lang}] ${entries.length} entries`);

  const layoutTemplate = await fs.readFile(path.join(templateDir, '_layout.ejs'), 'utf-8');
  const sidebarTemplate = await fs.readFile(path.join(templateDir, '_sidebar.ejs'), 'utf-8');
  const apiTemplate = await fs.readFile(path.join(templateDir, 'api.ejs'), 'utf-8');
  const cheatsheetTemplate = await fs.readFile(path.join(templateDir, 'cheatsheet.ejs'), 'utf-8');
  const indexPageTemplate = await fs.readFile(path.join(templateDir, 'index.ejs'), 'utf-8');

  const buildTag = process.env.UPSTREAM_TAG || '';
  const buildDate = new Date().toISOString().split('T')[0];
  const commonData = { entries, categories, displayCategories, categoryEntries, notes, he, ui: ui || {}, buildTag, buildDate };

  // Rewrite image paths in longdesc: /resources/xxx → ../../assets/images/xxx
  for (const entry of entries) {
    if (entry.longdesc) {
      entry.longdesc = entry.longdesc.replace(/\/resources\//g, '../../assets/images/');
    }
  }

  // Merge duplicate IDs (getter/setter variants)
  const mergedEntries = {};
  for (const entry of entries) {
    if (!mergedEntries[entry.id]) {
      mergedEntries[entry.id] = { ...entry };
    } else {
      const m = mergedEntries[entry.id];
      m.signatures = (m.signatures || []).concat(entry.signatures || []);
      if (entry.longdesc && entry.longdesc.length > (m.longdesc || '').length) m.longdesc = entry.longdesc;
      if (entry.desc && entry.desc.length > (m.desc || '').length) m.desc = entry.desc;
      if ((!m.examples || m.examples.length === 0) && entry.examples && entry.examples.length > 0) m.examples = entry.examples;
      if (!m.title && entry.title) m.title = entry.title;
    }
  }

  // Generate sidebar-data.js per language (shared, loaded via <script src>)
  // This works with file://, http://, and mk:// protocols unlike AJAX
  const sidebarHtml = ejs.render(sidebarTemplate, { ...commonData, currentId: null, linkPrefix: '' });
  const sidebarJs = 'window.SIDEBAR_HTML=' + JSON.stringify(sidebarHtml) + ';';
  await fs.writeFile(path.join(outputDir, 'sidebar-data.js'), sidebarJs, 'utf-8');

  // Generate API pages
  let apiCount = 0;
  for (const id of Object.keys(mergedEntries)) {
    const entry = mergedEntries[id];
    const apiContent = ejs.render(apiTemplate, { ...commonData, entry });
    const fullPage = ejs.render(layoutTemplate, {
      title: entry.title, content: apiContent, cssPath: '../../assets/', lang, ui: ui || {},
      sidebarJs: '../sidebar-data.js', appJs: '../../assets/js/app.js', pageId: id, pagePrefix: '../'
    });
    await fs.writeFile(path.join(outputDir, 'api', `${id}.html`), fullPage, 'utf-8');
    apiCount++;
  }
  console.log(`    ${apiCount} API pages`);

  // Cheatsheet
  const csContent = ejs.render(cheatsheetTemplate, commonData);
  const csFull = ejs.render(layoutTemplate, {
    title: ((ui||{})['jQuery API Cheatsheet'] || 'jQuery API Cheatsheet'), content: csContent, cssPath: '../assets/', bodyClass: 'page-cheatsheet', lang, ui: ui || {},
    sidebarJs: 'sidebar-data.js', appJs: '../assets/js/app.js', pageId: 'cheatsheet'
  });
  await fs.writeFile(path.join(outputDir, 'cheatsheet.html'), csFull, 'utf-8');

  // Index
  const idxSidebar = ejs.render(sidebarTemplate, { ...commonData, currentId: null, linkPrefix: '' });
  const idxHtml = ejs.render(indexPageTemplate, { ...commonData, title: ((commonData.ui||{})['jQuery API Documentation'] || 'jQuery API Documentation'), sidebar: idxSidebar, content: '', lang, cssPath: '../assets/', sidebarJs: 'sidebar-data.js', appJs: '../assets/js/app.js' });
  await fs.writeFile(path.join(outputDir, 'index.html'), idxHtml, 'utf-8');

  // Copy shared assets to root level (done once, first language only)
  if (lang === 'en') {
    await fs.copy(path.join(templateDir, 'style.css'), path.join(outputBase, 'assets', 'style.css'));
    await fs.ensureDir(path.join(outputBase, 'assets', 'js'));
    await fs.copy(path.join(templateDir, 'jquery.min.js'), path.join(outputBase, 'assets', 'js', 'jquery.min.js'));
    await fs.copy(path.join(templateDir, 'app.js'), path.join(outputBase, 'assets', 'js', 'app.js'));
  }

  console.log(`  [${lang}] done → ${outputDir}`);
}

async function main() {
  const dataDir = path.resolve(__dirname, '..', 'data', 'en');
  const templateDir = path.resolve(__dirname, '..', 'src', 'template');
  const outputBase = path.resolve(__dirname, '..', 'dist', 'html');

  console.log('Loading data...');
  const apiEn = await fs.readJson(path.join(dataDir, 'api.json'));

  // English
  console.log('\nGenerating English...');
  await buildLang('en', apiEn, templateDir, outputBase);

  // Validate translations
  console.log('\nValidating translations...');
  require('./validate-translate');

  // Chinese
  console.log('\nGenerating Chinese...');
  const apiZh = buildChineseData(apiEn);
  await buildLang('zh', apiZh, templateDir, outputBase);

  // Root index.html with language detection
  const langIndex = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>jQuery API Docs</title><script>
var lang=(navigator.language||navigator.userLanguage||'').toLowerCase();
location.replace((lang.indexOf('zh')===0?'zh':'en')+'/index.html');
</script></head><body></body></html>`;
  await fs.writeFile(path.join(outputBase, 'index.html'), langIndex, 'utf-8');

  // Copy images to shared assets
  const resourcesDir = path.resolve(__dirname, '..', '..', 'api.jquery.com', 'resources');
  if (await fs.pathExists(resourcesDir)) {
    await fs.ensureDir(path.join(outputBase, 'assets', 'images'));
    const files = await fs.readdir(resourcesDir);
    for (const file of files) {
      if (/\.(png|jpg|jpeg|gif|svg)$/i.test(file)) {
        await fs.copy(path.join(resourcesDir, file), path.join(outputBase, 'assets', 'images', file));
      }
    }
    console.log(`  Copied ${files.filter(f => /\.(png|jpg|jpeg|gif|svg)$/i.test(f)).length} images`);
  }

  console.log('\nHTML generation complete!');
  console.log(`Output: ${outputBase}`);
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
