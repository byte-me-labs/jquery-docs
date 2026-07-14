/**
 * Parse notes.xsl into a lookup table: noteId → rendered HTML.
 * Notes are advisory warnings injected into entry pages.
 */
const fs = require('fs-extra');

function parseNotes(notesXslPath) {
  const xsl = fs.readFileSync(notesXslPath, 'utf-8');
  const notes = {};

  // Extract each <xsl:when test="@id = '...'"> block
  // Pattern: <xsl:when test="@id = 'NOTE_ID'">CONTENT</xsl:when>
  const whenRegex = /<xsl:when\s+test="@id\s*=\s*'([^']+)'">([\s\S]*?)<\/xsl:when>/g;
  let match;

  while ((match = whenRegex.exec(xsl)) !== null) {
    const id = match[1];
    let content = match[2].trim();

    // Replace XSLT variables with placeholders that get filled at render time
    // <xsl:value-of select="@data-title"/> → {{data-title}}
    // <xsl:value-of select="@data-selector"/> → {{data-selector}}
    // <xsl:value-of select="@data-parameters"/> → {{data-parameters}}
    // <xsl:value-of select="@data-alt"/> → {{data-alt}}
    content = content.replace(
      /<xsl:value-of\s+select="@(data-\w+)"\s*\/>/g,
      '{{$1}}'
    );

    // Clean up any remaining XSLT artifacts
    content = content.replace(/<xsl:value-of[^>]*\/>/g, '');
    content = content.replace(/<code><xsl:value-of[^>]*\/><\/code>/g, '');

    notes[id] = content;
  }

  return notes;
}

module.exports = { parseNotes };
