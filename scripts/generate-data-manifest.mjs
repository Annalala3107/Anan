import fs from 'node:fs';
import path from 'node:path';

/**
 * Deterministic 32-bit FNV-1a hash matching lib/utils.ts#hashString.
 */
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deterministic question key matching lib/utils.ts#getQuestionKey.
 */
function getQuestionKey(item) {
  if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
    return String(item.id).trim();
  }

  if (item.question && item.question.trim()) {
    const qText = item.question.trim();
    const optSignature = Array.isArray(item.options) ? item.options.join('|') : '';
    const answerSig = item.correctWord || item.answer || item.word || '';
    const composite = `${qText}::${optSignature}::${answerSig}`;

    const slugPrefix = qText
      .slice(0, 32)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `q_${slugPrefix || 'mcq'}_${hashString(composite)}`;
  }

  if (item.word && item.word.trim()) {
    return `w_${hashString(item.word.trim().toLowerCase())}`;
  }

  return `item_${hashString(JSON.stringify(item))}`;
}

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'public', 'data');
const outPath = path.join(dataDir, 'index.json');

const jsonFiles = fs
  .readdirSync(dataDir)
  .filter((name) => name.endsWith('.json') && name !== 'index.json')
  .sort();

const files = {};
let totalEntries = 0;

for (const fileName of jsonFiles) {
  const fullPath = path.join(dataDir, fileName);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`Expected array in ${fileName}`);
  }

  const keys = raw.map((item) => getQuestionKey(item));
  const subjects = Array.from(
    new Set(raw.map((item) => item?.subject).filter((s) => typeof s === 'string' && s.trim()))
  );

  files[`/data/${fileName}`] = {
    count: raw.length,
    subject: subjects[0] || fileName.split('_')[0].toUpperCase(),
    keys,
  };
  totalEntries += raw.length;
}

const manifest = {
  version: 1,
  fileCount: Object.keys(files).length,
  totalQuestionEntries: totalEntries,
  files,
};

fs.writeFileSync(outPath, JSON.stringify(manifest), 'utf8');
const stat = fs.statSync(outPath);
console.log(
  `Generated ${outPath}: ${manifest.fileCount} files, ${manifest.totalQuestionEntries} question keys (${(
    stat.size / 1024
  ).toFixed(1)} KB)`
);
