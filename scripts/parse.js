/**
 * CLI entry point: Parse XML entries → JSON data model
 * Usage: node scripts/parse.js --source=<path to api.jquery.com> --output=data/en
 */
const path = require('path');
const { parse } = require('../src/parse/index');

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => a.startsWith('--source='));
  const outputArg = args.find(a => a.startsWith('--output='));

  const sourceDir = sourceArg ? sourceArg.split('=')[1] : '../api.jquery.com';
  const outputDir = outputArg ? outputArg.split('=')[1] : 'data/en';

  const entriesDir = path.resolve(sourceDir, 'entries');
  const includesDir = path.resolve(sourceDir, 'includes');
  const categoriesXml = path.resolve(sourceDir, 'categories.xml');
  const notesXsl = path.resolve(sourceDir, 'notes.xsl');
  const resourcesDir = path.resolve(sourceDir, 'resources');
  const pagesDir = path.resolve(sourceDir, 'pages');

  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Entries: ${entriesDir}`);

  await parse({
    entriesDir,
    includesDir,
    categoriesXml,
    notesXsl,
    outputDir,
    resourcesDir,
    pagesDir
  });
}

main().catch(err => {
  console.error('Parse failed:', err);
  process.exit(1);
});
