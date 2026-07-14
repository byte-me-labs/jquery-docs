/**
 * Parse categories.xml into a hierarchical tree structure.
 */
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs-extra');
const path = require('path');

function parseCategories(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf-8');

  // The categories.xml uses CDATA sections heavily — pre-process
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    preserveOrder: false,
    cdataPropName: '#text',
    stopNodes: ['*.desc'] // keep desc raw
  });

  const result = parser.parse(xml);
  const root = result.categories;

  function buildTree(categoryNode, parentSlug) {
    // Handle single category vs array
    const children = categoryNode.category;
    const childList = children
      ? (Array.isArray(children) ? children : [children])
      : [];

    // Build full-path slug: parent/child → "ajax/helper-functions"
    const ownSlug = categoryNode.slug || '';
    const fullSlug = parentSlug ? (parentSlug + '/' + ownSlug) : ownSlug;

    return {
      name: categoryNode.name || '',
      slug: fullSlug,
      desc: extractDesc(categoryNode.desc),
      children: childList.map(function(child) { return buildTree(child, fullSlug); })
    };
  }

  return buildTree(root, '');
}

function extractDesc(descNode) {
  if (!descNode) return '';
  if (typeof descNode === 'string') return descNode;
  // desc might be { '#text': '...' } from CDATA
  if (descNode['#text']) return descNode['#text'];
  return '';
}

/**
 * Build a flat category lookup: slug → { name, parentSlug }
 */
function buildCategoryLookup(categoryTree) {
  const lookup = {};

  function walk(node, parentSlug) {
    lookup[node.slug] = {
      name: node.name,
      parentSlug: parentSlug
    };
    if (node.children) {
      node.children.forEach(child => walk(child, node.slug));
    }
  }

  walk(categoryTree, null);
  return lookup;
}

/**
 * Group categories into top-level display groups for the sidebar.
 * Some categories with very few entries should be merged.
 */
function getDisplayCategories(categoryTree) {
  // Return only the top-level children that have entries or sub-children
  // Skip "Version" and "Deprecated" and "Removed" as they're metadata
  const skipSlugs = ['version', 'deprecated', 'removed'];

  return categoryTree.children.filter(c => !skipSlugs.includes(c.slug));
}

module.exports = { parseCategories, buildCategoryLookup, getDisplayCategories };
