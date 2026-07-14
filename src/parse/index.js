/**
 * Main XML Entry Parser
 * Parse api.jquery.com XML entries into structured JSON.
 */
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const { parseCategories, buildCategoryLookup, getDisplayCategories } = require('./categories');
const { parseNotes } = require('./notes');

/**
 * Resolve xi:include references in XML content.
 * Replaces <xi:include href="../includes/foo.xml" xmlns:xi="..."/> with
 * the content of the included file.
 */
function resolveXInclude(xmlContent, includesDir) {
  const includeRegex = /<xi:include\s+href="\.\.\/includes\/([^"]+)"[^>]*\/>/g;

  return xmlContent.replace(includeRegex, (match, filename) => {
    const includePath = path.join(includesDir, filename);
    try {
      let included = fs.readFileSync(includePath, 'utf-8');
      // Strip the XML declaration if present
      included = included.replace(/<\?xml[^?]*\?>\s*/g, '');
      return included;
    } catch (e) {
      console.warn(`Warning: Could not resolve xi:include: ${filename}`);
      return '';
    }
  });
}

/**
 * Parse a single <entry> element into the JSON model.
 */
function parseEntry(entryNode, categories, fileSlug) {
  const type = entryNode.type || 'method';
  const rawName = entryNode.name || fileSlug;
  const rawTitle = extractText(entryNode.title) || '';
  // Fallback: derive display name from type + name when title is missing
  const displayName = rawTitle || formatAPIName(entryNode);

  // Use file slug as primary id (not entry name — event files have name="on"/"trigger")
  const entryId = fileSlug || rawName;

  const entry = {
    id: entryId,
    type: type,
    name: displayName,
    methodName: formatAPIName(entryNode), // API method name for signatures: .on(), .add(), etc.
    title: rawTitle || displayName,
    return: entryNode.return || undefined,
    deprecated: entryNode.deprecated || null,
    removed: entryNode.removed || null,
    desc: extractText(entryNode.desc) || '',
    longdesc: extractHTML(entryNode.longdesc) || '',
    signatures: [],
    examples: [],
    categories: [],
    notes: [],
    sample: extractText(entryNode.sample) || null, // selector syntax
    versions: {
      added: null,
      deprecated: entryNode.deprecated || null,
      removed: entryNode.removed || null
    }
  };

  // Parse signatures
  if (entryNode.signature) {
    const sigs = Array.isArray(entryNode.signature) ? entryNode.signature : [entryNode.signature];
    entry.signatures = sigs.map(sig => parseSignature(sig));
  }

  // Parse examples
  if (entryNode.example) {
    const exs = Array.isArray(entryNode.example) ? entryNode.example : [entryNode.example];
    entry.examples = exs.map(ex => ({
      desc: extractText(ex.desc) || '',
      code: extractCode(ex.code),
      html: extractCode(ex.html),
      css: extractCode(ex.css)
    }));
  }

  // Parse categories
  if (entryNode.category) {
    const cats = Array.isArray(entryNode.category) ? entryNode.category : [entryNode.category];
    entry.categories = cats
      .map(c => c.slug)
      .filter(Boolean);

    // Build version info from category slugs
    const versionSlugs = entry.categories.filter(c => c.startsWith('version/'));
    if (versionSlugs.length > 0) {
      entry.versions.added = versionSlugs[0].replace('version/', '');
    }
  }

  // Parse notes
  if (entryNode.note) {
    const notes = Array.isArray(entryNode.note) ? entryNode.note : [entryNode.note];
    entry.notes = notes.map(n => ({
      id: n.id || '',
      type: n.type || 'additional',
      dataTitle: n['data-title'] || '',
      dataSelector: n['data-selector'] || '',
      dataParameters: n['data-parameters'] || '',
      dataAlt: n['data-alt'] || ''
    }));
  }

  // Get version info: earliest added from all signatures
  if (!entry.versions.added && entry.signatures.length > 0) {
    const versions = entry.signatures.map(s => s.added).filter(Boolean).sort(compareVersions);
    if (versions.length > 0) {
      entry.versions.added = versions[0];
    }
  }

  return entry;
}

/**
 * Format the display name of an API entry
 */
function formatAPIName(entryNode) {
  const name = entryNode.name || '';
  const type = entryNode.type;

  if (type === 'selector') {
    return name; // e.g. "all", "class" — title has the full name
  }
  if (name.startsWith('jQuery') || name.startsWith('event') ||
      name.startsWith('deferred') || name.startsWith('callbacks')) {
    return name; // Already has prefix
  }
  return `.${name}()`;
}

/**
 * Parse a single <signature> block
 */
function parseSignature(sigNode) {
  const sig = {
    added: sigNode.added || null,
    removed: sigNode.removed || null,
    arguments: []
  };

  if (sigNode.argument) {
    const args = Array.isArray(sigNode.argument) ? sigNode.argument : [sigNode.argument];
    sig.arguments = args.map(arg => parseArgument(arg));
  }

  return sig;
}

/**
 * Parse a single <argument> element (recursive for callbacks)
 */
function parseArgument(argNode) {
  const arg = {
    name: argNode.name || '',
    type: argNode.type || (argNode.name ? 'Any' : ''),
    optional: argNode.optional === 'true' || argNode.optional === true,
    default: argNode.default || null,
    desc: extractHTML(argNode.desc) || '',
    return: argNode.return ? argNode.return.type || argNode.return : null
  };

  // Handle nested type elements (for union types like Number|String)
  if (argNode.type && Array.isArray(argNode.type)) {
    const types = argNode.type.map(t => (typeof t === 'object' ? t.name : t)).filter(Boolean);
    if (types.length > 0) {
      arg.type = types.join('|');
    }
  } else if (argNode.type && typeof argNode.type === 'object' && argNode.type.name) {
    arg.type = argNode.type.name;
  }

  // Handle nested arguments (callback parameters)
  if (argNode.argument) {
    const nestedArgs = Array.isArray(argNode.argument) ? argNode.argument : [argNode.argument];
    arg.arguments = nestedArgs.map(a => parseArgument(a));
  }

  return arg;
}

/**
 * Extract text content from a node (handles CDATA and plain text)
 */
function extractText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node.trim();
  if (node['#text']) return ('' + node['#text']).trim();
  // If it's an array of text nodes
  if (Array.isArray(node)) {
    return node.map(function(n) { return extractText(n); }).join(' ').trim();
  }
  return '';
}

/**
 * Extract HTML content from a node (preserve HTML structure).
 * fast-xml-parser may return mixed content as arrays of { '#text': '...' } objects
 * or parsed child elements.
 */
function extractHTML(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node['#text']) return node['#text'];
  // Handle arrays of mixed content (text nodes + elements)
  if (Array.isArray(node)) {
    return node.map(function(n) {
      if (typeof n === 'string') return n;
      if (n['#text']) return n['#text'];
      // For child elements, we'd need to reconstruct HTML — skip for Phase 1
      return '';
    }).join('');
  }
  return '';
}

/**
 * Extract code from CDATA-wrapped code blocks.
 * fast-xml-parser may return:
 *   1. Simple string
 *   2. { '#text': 'content' } — direct CDATA
 *   3. { '#text': [{ '#text': '...' }], 'location': 'head' } — CDATA with attributes
 *   4. [{ '#text': '...' }] — array of text nodes
 */
function extractCode(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;

  // Case 2: { '#text': 'content' }
  if (typeof node['#text'] === 'string') return node['#text'];

  // Case 3: { '#text': [array], ...attributes }
  if (Array.isArray(node['#text'])) {
    return node['#text'].map(function(n) {
      if (typeof n === 'string') return n;
      if (n['#text']) return n['#text'];
      return '';
    }).join('');
  }

  // Case 4: direct array
  if (Array.isArray(node)) {
    return node.map(function(n) {
      if (typeof n === 'string') return n;
      if (n['#text']) return n['#text'];
      return '';
    }).join('');
  }

  return '';
}

/**
 * Simple version comparator for sorting
 */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/**
 * Main parse function
 */
async function parse(options = {}) {
  const {
    entriesDir,
    includesDir,
    categoriesXml,
    notesXsl,
    outputDir,
    resourcesDir,
    pagesDir
  } = options;

  console.log('Parsing jQuery API XML entries...');

  // 1. Parse categories
  console.log('  - Parsing categories...');
  const categoryTree = parseCategories(categoriesXml);
  const categoryLookup = buildCategoryLookup(categoryTree);
  const displayCategories = getDisplayCategories(categoryTree);

  // 2. Parse notes
  console.log('  - Parsing notes...');
  const notes = parseNotes(notesXsl);

  // 3. Resolve notes templates for known note IDs
  //    This is done at render time — we just pass the raw notes data

  // 4. Parse all XML entries
  console.log('  - Parsing entries...');
  const xmlFiles = await glob('*.xml', { cwd: entriesDir });
  const entries = [];

  // Fast XML parser config
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    preserveOrder: false,
    cdataPropName: '#text',
    allowBooleanAttributes: true,
    parseAttributeValue: false,
    stopNodes: ['*.longdesc'] // keep longdesc as raw HTML
  });

  let count = 0;
  for (const xmlFile of xmlFiles) {
    const filePath = path.join(entriesDir, xmlFile);
    let xmlContent = fs.readFileSync(filePath, 'utf-8');

    // Resolve xi:include references
    xmlContent = resolveXInclude(xmlContent, includesDir);

    try {
      let parsed = xmlParser.parse(xmlContent);

      // Handle both <entries> wrapper and bare <entry>
      let entryNodes;
      if (parsed.entries && parsed.entries.entry) {
        entryNodes = Array.isArray(parsed.entries.entry)
          ? parsed.entries.entry
          : [parsed.entries.entry];
      } else if (parsed.entry) {
        entryNodes = Array.isArray(parsed.entry)
          ? parsed.entry
          : [parsed.entry];
      } else {
        console.warn(`Warning: No entry found in ${xmlFile}`);
        continue;
      }

      const fileSlug = path.basename(xmlFile, '.xml');

      for (const entryNode of entryNodes) {
        const entry = parseEntry(entryNode, categoryLookup, fileSlug);
        entries.push(entry);
        count++;
      }
    } catch (e) {
      console.error(`Error parsing ${xmlFile}: ${e.message}`);
    }
  }

  console.log(`  - Parsed ${count} entries from ${xmlFiles.length} files`);

  // 5. Build category-to-entry mapping for navigation
  const categoryEntries = {};
  for (const entry of entries) {
    for (const catSlug of entry.categories) {
      if (catSlug.startsWith('version/') || catSlug === 'removed' || catSlug.startsWith('deprecated/')) continue;
      if (!categoryEntries[catSlug]) categoryEntries[catSlug] = [];
      categoryEntries[catSlug].push(entry.id);
    }
  }

  // 6. Output
  await fs.ensureDir(outputDir);

  const apiJson = {
    entries,
    categories: categoryTree,
    displayCategories,
    categoryEntries,
    notes,
    metadata: {
      totalEntries: entries.length,
      methods: entries.filter(e => e.type === 'method').length,
      selectors: entries.filter(e => e.type === 'selector').length,
      properties: entries.filter(e => e.type === 'property').length,
      deprecated: entries.filter(e => e.deprecated).length,
      removed: entries.filter(e => e.removed).length
    }
  };

  await fs.writeJson(path.join(outputDir, 'api.json'), apiJson, { spaces: 2 });
  console.log(`  - Wrote ${path.join(outputDir, 'api.json')}`);
  console.log(`Parsing complete: ${count} API entries`);

  return apiJson;
}

module.exports = { parse, resolveXInclude, parseEntry };
