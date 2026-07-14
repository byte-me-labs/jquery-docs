/**
 * Validate Chinese translation coverage.
 * Checks every translatable field and reports gaps.
 * Never fails — just outputs results.
 */
const api = require('../data/en/api.json');
const zh = require('../src/translate/zh-translations.json');
const rawTranslations = zh;
const { NOTE_ZH } = require('../src/translate/note-zh');

const issues = [];
let total = 0, covered = 0;

function gap(id, field, detail) {
  issues.push({ id, field, detail });
  total++;
}

function ok() { total++; covered++; }

// Check all entries including getter/setter duplicates
api.entries.forEach(e => {
  const z = zh[e.id] || {};

  // Title — only report for selectors and events (methods/properties stay English)
  if (e.type === 'selector') {
    total++;
    if (z.title && z.title !== e.title) covered++;
    else gap(e.id, 'title', `EN: ${e.title}`);
  }

  // Description
  total++;
  if (z.desc && z.desc !== e.desc && z.desc.length > 5) covered++;
  else gap(e.id, 'desc', `EN: ${(e.desc || '').substring(0, 60)}`);

  // Example descriptions
  if (e.examples) {
    e.examples.forEach((ex, i) => {
      if (!ex.desc || ex.desc.length < 5) return;
      total++;
      const descs = Array.isArray(z._exampleDescs) ? z._exampleDescs : [];
      if (descs[i] && descs[i] !== ex.desc && descs[i].length > 2) covered++;
      else gap(e.id, `example[${i}] desc`, ex.desc.substring(0, 60));
    });
  }

  // longdesc
  if (e.longdesc && e.longdesc.length > 10) {
    total++;
    if (z._longdesc && z._longdesc.length > 10) covered++;
    else gap(e.id, 'longdesc', 'missing ZH translation');
  }

  // Parameter descriptions — now validated with exact match
  if (e.signatures && rawTranslations._paramTrans) {
    e.signatures.forEach(sig => {
      if (!sig.arguments) return;
      sig.arguments.forEach(arg => {
        if (!arg.desc || arg.desc.length < 5) return;
        total++;
        if (rawTranslations._paramTrans[arg.desc]) covered++;
        else gap(e.id, `param ${arg.name}`, arg.desc.substring(0, 80));
      });
    });
  }
});

// Notes
const noteIds = Object.keys(api.notes || {});
noteIds.forEach(id => {
  total++;
  if (NOTE_ZH[id]) covered++;
  else gap('notes', id, 'note template missing ZH translation');
});

// ============================================
// Length ratio check — flag translations that are suspiciously short
// Chinese text is typically ~50-70% the character length of equivalent English.
// Below 30% almost certainly indicates incomplete or missing translation.
// ============================================
const MIN_RATIO = 0.3;       // ZH must be at least 30% of EN length
const MIN_EN_LEN = 100;      // only check if EN is reasonably long
const shortEntries = [];

function stripTags(s) { return (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

api.entries.forEach(e => {
  const z = zh[e.id] || {};
  const short = [];

  // Check longdesc
  if (e.longdesc && e.longdesc.length > MIN_EN_LEN) {
    const enText = stripTags(e.longdesc);
    const zhText = stripTags(z._longdesc || '');
    if (enText.length > 80) {
      const ratio = zhText.length / enText.length;
      if (!z._longdesc || z._longdesc.length < 10) {
        short.push(`longdesc MISSING (EN:${enText.length} chars)`);
      } else if (ratio < MIN_RATIO) {
        short.push(`longdesc ${zhText.length}/${enText.length} (${(ratio*100).toFixed(0)}%)`);
      }
    }
  }

  // Check desc
  if (e.desc && e.desc.length > 40) {
    const enDesc = stripTags(e.desc);
    const zhDesc = stripTags(z.desc || '');
    if (enDesc.length > 30 && zhDesc.length > 0) {
      const ratio = zhDesc.length / enDesc.length;
      if (ratio < MIN_RATIO) {
        short.push(`desc ${zhDesc.length}/${enDesc.length} (${(ratio*100).toFixed(0)}%)`);
      }
    }
  }

  if (short.length > 0) {
    shortEntries.push({ id: e.id, issues: short });
  }
});

// Report
console.log('\n' + '='.repeat(60));
console.log('Chinese Translation Validation');
console.log('='.repeat(60));
console.log(`Coverage: ${covered}/${total} (${(covered/total*100).toFixed(1)}%)`);
console.log(`Gaps: ${issues.length}`);
console.log(`Length issues (<${(MIN_RATIO*100).toFixed(0)}% ratio): ${shortEntries.length}`);

if (issues.length > 0) {
  console.log('\n--- Gaps ---');
  issues.forEach(i => console.log(`  ${i.id} | ${i.field} | ${i.detail}`));
}

if (shortEntries.length > 0) {
  console.log('\n--- Short Translations (ZH < ' + (MIN_RATIO*100).toFixed(0) + '% of EN) ---');
  // Sort by severity: worst ratios first
  shortEntries.sort((a, b) => {
    const aWorst = Math.min(...a.issues.map(i => {
      const m = i.match(/\((\d+)%\)/); return m ? parseInt(m[1]) : 0;
    }));
    const bWorst = Math.min(...b.issues.map(i => {
      const m = i.match(/\((\d+)%\)/); return m ? parseInt(m[1]) : 0;
    }));
    return aWorst - bWorst;
  });
  shortEntries.forEach(s => {
    console.log(`  ${s.id}`);
    s.issues.forEach(i => console.log(`    - ${i}`));
  });
}

console.log('='.repeat(60) + '\n');
