/**
 * Export translation gaps as a JSON array for LLM batch translation.
 * Usage: node scripts/export-gaps.js > gaps.json
 */
const api = require('../data/en/api.json');
const zh = require('../src/translate/zh-translations.json');

function stripTags(s) { return (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

const gaps = [];

api.entries.forEach(e => {
  const z = zh[e.id] || {};
  let needsTranslation = false;

  // Check longdesc
  if (e.longdesc && stripTags(e.longdesc).length > 80) {
    const zhText = stripTags(z._longdesc || '');
    if (!z._longdesc || zhText.length < stripTags(e.longdesc).length * 0.3) {
      needsTranslation = true;
    }
  }

  // Check desc
  if (e.desc && stripTags(e.desc).length > 30) {
    const zhText = stripTags(z.desc || '');
    if (!z.desc || zhText.length < stripTags(e.desc).length * 0.3) {
      needsTranslation = true;
    }
  }

  if (needsTranslation) {
    gaps.push({
      id: e.id,
      title: e.title,
      type: e.type,
      desc_en: e.desc || '',
      desc_zh: z.desc || '',
      longdesc_en: e.longdesc || '',
      longdesc_zh: z._longdesc || ''
    });
  }
});

console.log(JSON.stringify(gaps));
