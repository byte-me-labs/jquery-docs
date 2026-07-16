/**
 * Main build orchestration script
 * Usage: node scripts/build.js [--source=<path>] [--skip-chm]
 *
 * Phases:
 *   1. parse    — XML → JSON
 *   2. generate — JSON → HTML
 *   3. chm      — HTML → CHM (Windows only)
 */
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

async function build() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => a.startsWith('--source='));
  const skipChm = args.includes('--skip-chm');
  const sourceDir = sourceArg ? sourceArg.split('=')[1] : '../api.jquery.com';

  const scriptsDir = __dirname;
  const parseScript = path.join(scriptsDir, 'parse.js');
  const generateScript = path.join(scriptsDir, 'generate.js');
  const chmScript = path.join(scriptsDir, 'chm-compile.js');

  console.log('='.repeat(60));
  console.log('jQuery Docs — Build Pipeline');
  console.log('='.repeat(60));

  // Phase 1: Parse
  console.log('\n📦 Phase 1/3: Parsing XML entries...');
  execSync(`node "${parseScript}" --source="${sourceDir}" --output="data/en"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  // Verify parse output
  const apiJson = path.resolve(__dirname, '..', 'data', 'en', 'api.json');
  if (!fs.existsSync(apiJson)) {
    throw new Error('Parse failed: api.json not generated');
  }

  // Phase 2: Generate HTML
  console.log('\n📄 Phase 2/3: Generating HTML...');
  execSync(`node "${generateScript}"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  // Phase 3: CHM (Windows only or if not skipped)
  if (!skipChm) {
    console.log('\n📚 Phase 3/3: Compiling CHM...');
    try {
      execSync(`node "${chmScript}" --lang=both`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (e) {
      if (process.platform !== 'win32') {
        console.log('CHM compilation skipped (non-Windows platform).');
        console.log('Run on Windows to generate .chm file.');
      } else {
        throw e;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Build complete!');

  const htmlDir = path.resolve(__dirname, '..', 'dist', 'html');
  let apiCount = 0;
  for (const lang of ['en', 'zh']) {
    const apiDir = path.join(htmlDir, lang, 'api');
    if (fs.existsSync(apiDir)) apiCount += fs.readdirSync(apiDir).filter(f => f.endsWith('.html')).length;
  }
  console.log(`   ${apiCount} API pages generated (${apiCount/2} per language)`);
  console.log(`   Output: ${htmlDir}`);

  const tag = process.env.UPSTREAM_TAG || '';
  for (const lang of ['en', 'zh']) {
    const chmName = 'jquery-api-reference-' + lang + (tag ? '-' + tag : '') + '.chm';
    const chmPath = path.resolve(__dirname, '..', 'dist', 'html', chmName);
    if (fs.existsSync(chmPath)) {
      const stats = fs.statSync(chmPath);
      console.log('   CHM (' + lang + '): ' + chmPath + ' (' + (stats.size / 1024 / 1024).toFixed(2) + ' MB)');
    }
  }
  console.log('='.repeat(60));
}

build().catch(err => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
