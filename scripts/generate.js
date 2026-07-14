/**
 * Generate HTML from JSON data + EJS templates.
 * Usage: node scripts/generate.js
 */
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const he = require('he');

async function main() {
  const dataDir = path.resolve(__dirname, '..', 'data', 'en');
  const templateDir = path.resolve(__dirname, '..', 'src', 'template');
  const outputDir = path.resolve(__dirname, '..', 'dist', 'html');

  console.log('Loading data...');
  const api = await fs.readJson(path.join(dataDir, 'api.json'));
  const { entries, categories, displayCategories, categoryEntries, notes, metadata } = api;

  console.log(`Generating HTML for ${entries.length} entries...`);

  // Ensure output directories
  await fs.ensureDir(path.join(outputDir, 'api'));
  await fs.ensureDir(path.join(outputDir, 'assets'));

  // Read templates
  const layoutTemplate = await fs.readFile(path.join(templateDir, '_layout.ejs'), 'utf-8');
  const sidebarTemplate = await fs.readFile(path.join(templateDir, '_sidebar.ejs'), 'utf-8');
  const apiTemplate = await fs.readFile(path.join(templateDir, 'api.ejs'), 'utf-8');
  const cheatsheetTemplate = await fs.readFile(path.join(templateDir, 'cheatsheet.ejs'), 'utf-8');
  const indexTemplate = await fs.readFile(path.join(templateDir, 'index.ejs'), 'utf-8');

  // Common data for all templates
  const commonData = { entries, categories, displayCategories, categoryEntries, notes, he };

  // Build entry lookup
  const entryMap = {};
  for (const entry of entries) {
    entryMap[entry.id] = entry;
  }

  // Generate API detail pages — merge duplicate IDs (getter/setter pairs)
  console.log('  - Generating API pages...');
  const mergedEntries = {};
  for (const entry of entries) {
    if (!mergedEntries[entry.id]) {
      mergedEntries[entry.id] = { ...entry };
    } else {
      const m = mergedEntries[entry.id];
      // Merge signatures
      m.signatures = (m.signatures || []).concat(entry.signatures || []);
      // Keep the entry with content (examples, longdesc)
      if (!m.longdesc && entry.longdesc) m.longdesc = entry.longdesc;
      if (!m.desc && entry.desc) m.desc = entry.desc;
      if ((!m.examples || m.examples.length === 0) && entry.examples && entry.examples.length > 0) {
        m.examples = entry.examples;
      }
      if (!m.title && entry.title) m.title = entry.title;
      if (!m.return && entry.return) m.return = entry.return;
    }
  }

  let apiCount = 0;
  for (const id of Object.keys(mergedEntries)) {
    const entry = mergedEntries[id];
    // Render sidebar with current entry highlighted
    const sidebarData = { ...commonData, currentId: id, linkPrefix: '../' };
    const sidebar = ejs.render(sidebarTemplate, sidebarData);

    // Render API content
    const apiContent = ejs.render(apiTemplate, { ...commonData, entry });

    // Render full page
    const fullPage = ejs.render(layoutTemplate, {
      title: entry.title,
      sidebar: sidebar,
      content: apiContent,
      cssPath: '../assets/'
    });

    const outputPath = path.join(outputDir, 'api', `${id}.html`);
    await fs.writeFile(outputPath, fullPage, 'utf-8');
    apiCount++;
  }
  console.log(`    Generated ${apiCount} API pages (${Object.keys(mergedEntries).length} unique)`);

  // Generate cheatsheet (wrapped in layout with sidebar)
  console.log('  - Generating cheatsheet...');
  const csSidebar = ejs.render(sidebarTemplate, { ...commonData, currentId: 'cheatsheet', linkPrefix: '' });
  const csContent = ejs.render(cheatsheetTemplate, commonData);
  const csFullPage = ejs.render(layoutTemplate, {
    title: 'jQuery API Cheatsheet',
    sidebar: csSidebar,
    content: csContent,
    cssPath: 'assets/'
  });
  await fs.writeFile(path.join(outputDir, 'cheatsheet.html'), csFullPage, 'utf-8');

  // Generate index/home page
  console.log('  - Generating index page...');
  const sidebar = ejs.render(sidebarTemplate, { ...commonData, currentId: null, linkPrefix: '' });
  const indexContent = `<div class="home-placeholder"></div>`; // content handled inside index.ejs
  const indexHTML = ejs.render(indexTemplate, {
    ...commonData,
    title: 'jQuery API Documentation',
    sidebar: sidebar,
    content: ''
  });
  await fs.writeFile(path.join(outputDir, 'index.html'), indexHTML, 'utf-8');

  // Copy static assets
  console.log('  - Copying assets...');
  await fs.copy(
    path.join(templateDir, 'style.css'),
    path.join(outputDir, 'assets', 'style.css')
  );

  // Copy images from upstream resources
  const resourcesDir = path.resolve(__dirname, '..', '..', 'api.jquery.com', 'resources');
  if (await fs.pathExists(resourcesDir)) {
    await fs.ensureDir(path.join(outputDir, 'assets', 'images'));
    const files = await fs.readdir(resourcesDir);
    for (const file of files) {
      if (/\.(png|jpg|jpeg|gif|svg)$/i.test(file)) {
        await fs.copy(
          path.join(resourcesDir, file),
          path.join(outputDir, 'assets', 'images', file)
        );
      }
    }
    console.log(`    Copied ${files.filter(f => /\.(png|jpg|jpeg|gif|svg)$/i.test(f)).length} images`);
  }

  // Generate a version info file
  const buildMeta = {
    generatedAt: new Date().toISOString(),
    totalEntries: metadata.totalEntries,
    methods: metadata.methods,
    selectors: metadata.selectors,
    properties: metadata.properties,
    deprecated: metadata.deprecated,
    removed: metadata.removed
  };
  await fs.writeJson(path.join(outputDir, 'build-meta.json'), buildMeta, { spaces: 2 });

  console.log('HTML generation complete!');
  console.log(`Output: ${outputDir}`);
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
