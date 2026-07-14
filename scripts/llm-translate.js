/**
 * Batch translate gaps via GitHub Models (GPT-4o-mini, free).
 * Uses GitHub Models OpenAI-compatible endpoint.
 *
 * Usage: node scripts/llm-translate.js gaps.json translated.json
 */
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 5;

async function translateBatch(entries) {
  const systemPrompt = `You are a technical translator. Translate jQuery API documentation from English to Chinese.
Rules:
- Preserve all HTML tags, attributes, and structure EXACTLY
- Only translate human-readable text between tags
- Keep jQuery method names in English (e.g., .fadeIn(), .on())
- Keep code blocks unchanged
- Use accurate technical Chinese: "event"→"事件", "element"→"元素", "selector"→"选择器", "callback"→"回调", "handler"→"处理程序"
- For desc fields: translate the short description concisely
- For longdesc fields: translate the full HTML content completely
- Return ONLY valid JSON, no markdown, no explanation`;

  const entriesJson = entries.map(e => ({
    id: e.id,
    title: e.title,
    desc_en: e.desc_en,
    longdesc_en: e.longdesc_en
  }));

  const userPrompt = `Translate these jQuery API documentation entries to Chinese.

For each entry, provide:
- "desc_zh": Chinese translation of desc_en
- "longdesc_zh": Chinese translation of longdesc_en (if longdesc_en is not empty)

Entries to translate:
${JSON.stringify(entriesJson, null, 2)}

Return a JSON object with entry IDs as keys:
{
  "entryId": { "desc_zh": "...", "longdesc_zh": "..." }
}`;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 16000
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub Models API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from the response (strip any markdown code fencing)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in LLM response');
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile || !outputFile) {
    console.error('Usage: node scripts/llm-translate.js gaps.json translated.json');
    process.exit(1);
  }

  const gaps = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  console.log(`Translating ${gaps.length} entries in batches of ${BATCH_SIZE}...`);

  const results = {};
  let translated = 0;

  for (let i = 0; i < gaps.length; i += BATCH_SIZE) {
    const batch = gaps.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(gaps.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} entries)...`);

    try {
      const batchResult = await translateBatch(batch);
      Object.assign(results, batchResult);
      translated += Object.keys(batchResult).length;
    } catch (err) {
      console.error(`Batch ${batchNum} failed: ${err.message}`);
      // Continue with remaining batches
    }
  }

  // Convert to import format
  let importData = '';
  for (const [id, trans] of Object.entries(results)) {
    importData += `=== ${id} ===\n\n`;
    if (trans.longdesc_zh && trans.longdesc_zh.length > 10) {
      importData += trans.longdesc_zh.trim() + '\n';
    }
    importData += '\n';
  }

  fs.writeFileSync(outputFile, importData, 'utf-8');

  // Also save the desc translations for manual review
  const descResults = {};
  for (const [id, trans] of Object.entries(results)) {
    if (trans.desc_zh) descResults[id] = { desc: trans.desc_zh };
  }
  fs.writeFileSync(outputFile.replace('.json', '-descs.json'), JSON.stringify(descResults, null, 2), 'utf-8');

  console.log(`Translated ${translated}/${gaps.length} entries → ${outputFile}`);
  console.log('Desc translations saved to ' + outputFile.replace('.json', '-descs.json'));
}

main().catch(err => {
  console.error('LLM translation failed:', err);
  process.exit(1);
});
