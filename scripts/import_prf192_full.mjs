import fs from 'node:fs';
import path from 'node:path';

const xmlPath = 'C:/Users/Acer/.gemini/antigravity/brain/4de03246-856c-493f-87b5-9baab17d8071/scratch/docx_unpack/word/document.xml';
if (!fs.existsSync(xmlPath)) {
  console.error('document.xml not found at', xmlPath);
  process.exit(1);
}

const content = fs.readFileSync(xmlPath, 'utf8');

function decodeXml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const pRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g;
const paragraphs = [];
let match;
while ((match = pRegex.exec(content)) !== null) {
  const pContent = match[1];
  const tRegex = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
  let pText = '';
  let tMatch;
  while ((tMatch = tRegex.exec(pContent)) !== null) {
    pText += tMatch[1];
  }
  if (pText.trim()) {
    paragraphs.push(decodeXml(pText.trim()));
  }
}

console.log('Total extracted paragraphs:', paragraphs.length);

// Topic classifier function based on PRF192 syllabus
function classifyTopic(qText, codeText, optionsText, explanation) {
  const all = `${qText} ${codeText} ${optionsText} ${explanation}`.toLowerCase();

  // 1. File I/O
  if (
    /\b(fopen|fclose|fprintf|fscanf|fgetc|fputc|fgets|fputs|feof|fseek|rewind|ftell|file\s*\*|output\.txt|input\.txt|read a file|write to a file|file stream|file mode|end of file|end of a file)\b/i.test(all) ||
    /file\s+i\/o|tệp tin|tập tin/i.test(all)
  ) {
    return 'Tệp Tin (File I/O)';
  }

  // 2. Con Trỏ & Quản Lý Bộ Nhớ
  if (
    /\b(malloc|calloc|realloc|free\b|pointer|pointers|dynamic allocation|allocated memory|heap memory|dangling pointer|memory leak|deallocate|con trỏ)\b/i.test(all) ||
    /\bfloat\s*\*\s*[a-z0-9_]+/i.test(all) ||
    /\bint\s*\*\s*[a-z0-9_]+/i.test(all) ||
    /\bchar\s*\*\s*[a-z0-9_]+/i.test(all) ||
    /\*\s*[a-z0-9_]+\s*=\s*&/i.test(all) ||
    /address of variable|dereference/i.test(all)
  ) {
    if (
      /\b(strcmp|strcpy|strcat|strlen|strncpy|strncat|strncmp|strchr|strstr|sprintf|null-terminated|character array|string literal|string)\b/i.test(all) &&
      !/\b(malloc|calloc|realloc|free\b|pointer arithmetic)\b/i.test(all)
    ) {
      return 'Chuỗi Ký Tự (Strings)';
    }
    return 'Con Trỏ & Quản Lý Bộ Nhớ';
  }

  // 3. Chuỗi Ký Tự (Strings)
  if (
    /\b(string|strings|char\s*\[\]|strlen|strcpy|strcat|strcmp|strncpy|strncmp|strchr|strstr|gets|puts|sprintf|null character|\\0|chuỗi ký tự|mảng ký tự)\b/i.test(all)
  ) {
    return 'Chuỗi Ký Tự (Strings)';
  }

  // 4. Mảng & Giải Thuật Cơ Bản
  if (
    /\b(array|arrays|element of array|matrix|2d array|two-dimensional|subscript|linear search|binary search|bubble sort|selection sort|insertion sort|mảng|sắp xếp|tìm kiếm)\b/i.test(all) ||
    /\[\s*\d+\s*\]\[\s*\d+\s*\]/.test(all) ||
    /int\s+arr\[|int\s+a\[\d+\]|float\s+a\[\d+\]/.test(all)
  ) {
    return 'Mảng & Giải Thuật Cơ Bản';
  }

  // 5. Cấu Trúc Điều Khiển & Vòng Lặp
  if (
    /\b(for\s*\(|while\s*\(|do\s*\{|switch\s*\(|case\s+|if\s*\(|else|iteration construct|loop|infinite loop|continue|break\b|nested loop|vòng lặp|câu lệnh switch|rẽ nhánh)\b/i.test(all)
  ) {
    return 'Cấu Trúc Điều Khiển & Vòng Lặp';
  }

  // 6. Hàm & Phạm Vi Biến
  if (
    /\b(function|functions|return type|prototype|argument|arguments|parameter|parameters|recursion|recursive|local variable|global variable|static variable|extern variable|scope of variable|math\.h|fabs|abs|labs|sqrt|pow|ceil|floor|rand|hàm)\b/i.test(all)
  ) {
    return 'Hàm & Phạm Vi Biến';
  }

  return 'Cú Pháp, Kiểu Dữ Liệu & Toán Tử';
}

// Group into questions
const parsedQuestions = [];
let currentQ = null;

for (let i = 0; i < paragraphs.length; i++) {
  const text = paragraphs[i];
  const cauMatch = text.match(/^câu\s+(\d+)[:.]?\s*(.*)/i);
  if (cauMatch) {
    if (currentQ) parsedQuestions.push(currentQ);
    currentQ = {
      rawNum: parseInt(cauMatch[1], 10),
      questionLines: [cauMatch[2]],
      options: [],
      answerLetter: '',
      explanation: ''
    };
  } else if (currentQ) {
    const optMatch = text.match(/^([A-H])\.\s*(.*)/);
    const ansMatch = text.match(/^->\s*đáp án đúng[:.]?\s*([A-H](?:\s*,\s*[A-H])*)(?:\s*\((.*)\))?$/i);

    if (ansMatch) {
      currentQ.answerLetter = ansMatch[1]
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean)
        .join(', ');
      if (ansMatch[2]) {
        currentQ.explanation = ansMatch[2].trim();
      }
    } else if (optMatch) {
      currentQ.options.push(text);
    } else if (currentQ.options.length > 0 && !currentQ.answerLetter) {
      // Line continuation for option (like multi-line output in Q166, Q221)
      const lastIdx = currentQ.options.length - 1;
      currentQ.options[lastIdx] += ' \\ ' + text;
    } else if (currentQ.options.length === 0) {
      currentQ.questionLines.push(text);
    }
  }
}
if (currentQ) parsedQuestions.push(currentQ);

console.log('Parsed questions from docx:', parsedQuestions.length);

// Read existing prf192_all.json by normalized question text to preserve matching curated explanations
const normalizeStem = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const existingPath = path.join(process.cwd(), 'public', 'data', 'prf192_all.json');
let existingMapByText = new Map();
if (fs.existsSync(existingPath)) {
  const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
  existing.forEach(q => {
    const key = normalizeStem(q.question);
    if (key && !existingMapByText.has(key)) {
      existingMapByText.set(key, q);
    }
  });
}

const curatedMultiExplanations = {
  4: 'Đáp án: C, E. getc() đọc 1 ký tự từ luồng FILE* chứ không đọc chuỗi vào biến s; scanf(s) thiếu chuỗi định dạng "%s" nên sai khi nhập chuỗi.',
  39: 'Đáp án: B, C. Chế độ "a" và "a+" mở tệp để ghi nối dữ liệu vào cuối tệp; "w"/"w+" ghi đè từ đầu tệp còn fwrite() dùng để ghi dữ liệu vào luồng đã mở.',
  281: 'Đáp án: A, D. printf() (với "%s") và puts() dùng để xuất chuỗi ký tự; putc() xuất 1 ký tự, còn gets() và getc() dùng để nhập dữ liệu.',
  282: 'Đáp án: A, C. scanf() (với "%s" hoặc "%[^\\n]") và gets() dùng để nhập chuỗi; putc() và puts() dùng để xuất, còn getc() đọc 1 ký tự.',
  312: 'Đáp án: B, C. Cả "w+" (hoặc dạng text "wt+") và "a+" đều tạo tệp mới nếu chưa có và cho phép vừa đọc vừa ghi ("w+" ghi đè từ đầu, "a+" ghi nối vào cuối tệp).'
};

// Build standardized items
const allQuestions = [];
const missingOptions = [];

parsedQuestions.forEach(q => {
  const num = q.rawNum;
  const id = `prf_${num}`;
  const questionText = q.questionLines.join('\n').trim();
  const options = q.options;
  const answer = q.answerLetter;
  const answerKeys = answer
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  // find matching option(s)
  const matchingOpts = answerKeys
    .map(k => options.find(opt => opt.startsWith(`${k}.`) || opt.startsWith(`${k} `)))
    .filter(Boolean);
  const correctWord = matchingOpts.length > 0 ? matchingOpts.join(' | ') : (options[0] || '');

  if (answerKeys.length === 0 || matchingOpts.length !== answerKeys.length) {
    missingOptions.push({ num, answer, options });
  }

  // Explanation: prioritize docx explanation, then curated multi-select notes, else matching curated explanation whose leading "Đáp án:" aligns with answer
  const existQ = existingMapByText.get(normalizeStem(questionText));
  const existExp = existQ?.explanation?.trim() || '';
  const existExpAnsMatch = existExp.match(/^Đáp án:\s*([A-H](?:\s*,\s*[A-H])*)/i);
  const existExpAnsNorm = existExpAnsMatch
    ? existExpAnsMatch[1].split(',').map(s => s.trim().toUpperCase()).filter(Boolean).join(', ')
    : '';
  const isMatchingExistingExp =
    Boolean(existExp) &&
    existExpAnsNorm === answer &&
    existExp !== `Đáp án: ${answer}.`;

  let finalExplanation = '';
  if (q.explanation) {
    finalExplanation = `Đáp án: ${answer}. ${q.explanation}`;
  } else if (curatedMultiExplanations[num]) {
    finalExplanation = curatedMultiExplanations[num];
  } else if (isMatchingExistingExp) {
    finalExplanation = existExp;
  } else {
    finalExplanation = `Đáp án: ${answer}.`;
  }

  // Classify topic directly from question content
  const topic = classifyTopic(questionText, '', options.join('\n'), finalExplanation);

  // Word label
  const firstLine = q.questionLines[0].trim();
  const wordLabel = `Câu ${num}: ${firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine}`;

  allQuestions.push({
    id,
    word: wordLabel,
    question: questionText,
    options,
    answer,
    correctWord,
    explanation: finalExplanation,
    subject: 'Lập Trình C (PRF192)',
    topic
  });
});

console.log('Total standardized questions built:', allQuestions.length);
if (missingOptions.length > 0) {
  console.error('Questions with invalid options:', missingOptions);
  process.exit(1);
}

// Map topics to their JSON file names
const topicFiles = {
  'Cấu Trúc Điều Khiển & Vòng Lặp': 'prf_c_u_tr_c_i_u_khi_n_v_ng_l_p.json',
  'Con Trỏ & Quản Lý Bộ Nhớ': 'prf_con_tr_qu_n_l_b_nh.json',
  'Chuỗi Ký Tự (Strings)': 'prf_chu_i_k_t_strings.json',
  'Cú Pháp, Kiểu Dữ Liệu & Toán Tử': 'prf_c_ph_p_ki_u_d_li_u_to_n_t.json',
  'Hàm & Phạm Vi Biến': 'prf_h_m_ph_m_vi_bi_n.json',
  'Mảng & Giải Thuật Cơ Bản': 'prf_m_ng_gi_i_thu_t_c_b_n.json',
  'Tệp Tin (File I/O)': 'prf_t_p_tin_file_i_o.json'
};

const topicBuckets = {};
for (const topic of Object.keys(topicFiles)) {
  topicBuckets[topic] = [];
}

allQuestions.forEach(q => {
  if (!topicBuckets[q.topic]) {
    console.warn(`Unknown topic "${q.topic}" for question ${q.id}, routing to Cú Pháp, Kiểu Dữ Liệu & Toán Tử`);
    q.topic = 'Cú Pháp, Kiểu Dữ Liệu & Toán Tử';
  }
  topicBuckets[q.topic].push(q);
});

// Write prf192_all.json
const dataDir = path.join(process.cwd(), 'public', 'data');
fs.writeFileSync(path.join(dataDir, 'prf192_all.json'), JSON.stringify(allQuestions, null, 2), 'utf8');
console.log(`Saved prf192_all.json (${allQuestions.length} questions)`);

// Write each topic file
let totalTopicQuestions = 0;
for (const [topic, filename] of Object.entries(topicFiles)) {
  const items = topicBuckets[topic];
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(items, null, 2), 'utf8');
  console.log(`Saved ${filename}: ${items.length} questions (Topic: "${topic}")`);
  totalTopicQuestions += items.length;
}

console.log(`\nVerification: Sum of sub-topic questions = ${totalTopicQuestions} (must equal ${allQuestions.length})`);
if (totalTopicQuestions !== allQuestions.length) {
  console.error('MISMATCH between total questions and sum of topics!');
  process.exit(1);
}

console.log('\nPRF192 import script completed successfully!');
