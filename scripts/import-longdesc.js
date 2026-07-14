/**
 * Import LLM-translated longdesc back into zh-translations.json.
 * Expected input format: same as data/longdesc-en.txt but with Chinese text.
 * Lines starting with "=== " mark entry IDs, followed by translated HTML content.
 *
 * Usage: node scripts/import-longdesc.js < data/longdesc-zh.txt
 *    or: node scripts/import-longdesc.js data/longdesc-zh.txt
 */
const fs = require('fs');
const path = require('path');

const zhFile = path.resolve(__dirname, '..', 'src', 'translate', 'zh-translations.json');
const zh = require(zhFile);

// Read input
const inputFile = process.argv[2];
let content;
if (inputFile) {
  content = fs.readFileSync(inputFile, 'utf-8');
} else {
  // Read from stdin
  content = fs.readFileSync(0, 'utf-8');
}

// Parse: === entryId === followed by translated HTML
const blocks = content.split(/^=== /m).filter(Boolean);
let imported = 0;

blocks.forEach(block => {
  const lines = block.split('\n');
  const id = lines[0].replace(/={2,3}/g, '').trim();
  const html = lines.slice(1).join('\n').trim();
  if (html && html.length > 10) {
    if (!zh[id]) zh[id] = {};
    zh[id]._longdesc = html;
    imported++;
  }
});

fs.writeFileSync(zhFile, JSON.stringify(zh, null, 2), 'utf-8');
console.log(`Imported ${imported} longdesc translations`);
console.log(`Total translation entries: ${Object.keys(zh).length}`);
