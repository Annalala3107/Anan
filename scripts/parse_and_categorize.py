# -*- coding: utf-8 -*-
import re
import json
import os

os.makedirs('public/data', exist_ok=True)

# -------------------------------------------------------------
# 1. PARSE CEA201 (Computer Architecture & Systems)
# -------------------------------------------------------------
def parse_cea():
    with open('scripts/cea201_all.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by "Câu <digits>."
    raw_blocks = re.split(r'\n(?=Câu\s+\d+\.)', content)
    questions = []

    for block in raw_blocks:
        block = block.strip()
        if not block:
            continue

        m_num = re.match(r'Câu\s+(\d+)\.\s*(.*)', block, re.DOTALL)
        if not m_num:
            continue

        q_num = m_num.group(1)
        rest = m_num.group(2).strip()

        # Find answer at the end: Đáp án: <A/B/C/D> (explanation)
        m_ans = re.search(r'Đáp án(?:\s+đúng)?:\s*([A-Za-z0-9\s,hoặc]+)(?:\s*\((.*?)\))?$', rest, re.DOTALL | re.IGNORECASE)
        answer_key = 'A'
        explanation = ''
        if m_ans:
            answer_key = m_ans.group(1).strip()
            if m_ans.group(2):
                explanation = m_ans.group(2).strip()
            rest = rest[:m_ans.start()].strip()

        # Find options: A. ... B. ... C. ... D. ...
        opt_pattern = r'([A-E])\.\s*(.*?)(?=(?:[A-E]\.|$))'
        opt_matches = list(re.finditer(opt_pattern, rest, re.DOTALL))

        options = []
        question_text = rest
        if opt_matches:
            question_text = rest[:opt_matches[0].start()].strip()
            for om in opt_matches:
                opt_letter = om.group(1)
                opt_content = om.group(2).strip()
                options.append(f"{opt_letter}. {opt_content}")

        # Determine correct word
        correct_word = ''
        # Normalize primary answer key
        first_key = 'A'
        if 'B' in answer_key: first_key = 'B'
        elif 'C' in answer_key: first_key = 'C'
        elif 'D' in answer_key: first_key = 'D'
        elif 'A' in answer_key: first_key = 'A'

        for opt in options:
            if opt.startswith(first_key + '.'):
                correct_word = opt
                break
        if not correct_word and options:
            correct_word = options[0]

        # Categorize into topics based on keywords
        q_lower = (question_text + ' ' + ' '.join(options)).lower()
        topic = 'Kiến Trúc Máy Tính Chung'
        if any(k in q_lower for k in ['binary', 'hexadecimal', 'octal', 'decimal', 'two’s complement', 'two\'s complement', 'excess-127', 'positional', 'floating-point', 'ascii', 'xor', 'and logic', 'shift', 'mask', 'bit rate', 'sampling']):
            topic = 'Hệ Thống Số & Biểu Diễn Dữ Liệu'
        elif any(k in q_lower for k in ['von neumann', 'turing', 'cpu', 'alu', 'control unit', 'register', 'cache', '80-20', 'hardware', 'transistor', 'subsystem', 'instruction']):
            topic = 'Kiến Trúc Phần Cứng & Vi Xử Lý'
        elif any(k in q_lower for k in ['operating system', 'paging', 'segmentation', 'virtual memory', 'process', 'job', 'multiprogramming', 'monoprogramming', 'rtos', 'unix', 'shell', 'kernel']):
            topic = 'Hệ Điều Hành & Quản Lý Bộ Nhớ'
        elif any(k in q_lower for k in ['ip address', 'tcp', 'udp', 'network', 'protocol', 'port', 'firewall', 'encryption', 'cipher', 'hacker', 'security', 'mac address', 'ethernet', 'osi']):
            topic = 'Mạng Máy Tính & An Toàn Thông Tin'
        elif any(k in q_lower for k in ['binary tree', 'bst', 'stack', 'queue', 'linked list', 'graph', 'bubble sort', 'selection sort', 'search', 'hashing', 'collision', 'traversal', 'lifo', 'fifo']):
            topic = 'Cấu Trúc Dữ Liệu & Giải Thuật'
        elif any(k in q_lower for k in ['database', 'relational', 'sql', 'erd', 'entity', 'acid', 'normal form', '1nf', '2nf', 'sdlc', 'waterfall', 'agile', 'testing', 'uml', 'modular']):
            topic = 'Cơ Sở Dữ Liệu & Kỹ Thuật Phần Mềm'

        questions.append({
            'id': f'cea_{q_num}',
            'word': f'Câu {q_num}: ' + question_text[:60] + ('...' if len(question_text) > 60 else ''),
            'question': question_text,
            'options': options,
            'answer': answer_key,
            'correctWord': correct_word,
            'explanation': (f"Đáp án: {answer_key}. " + explanation).strip(),
            'subject': 'Kiến Trúc Máy Tính (CEA201)',
            'topic': topic
        })

    return questions

# -------------------------------------------------------------
# 2. PARSE SSL101 (Soft Skills, Critical Thinking & AI Literacy)
# -------------------------------------------------------------
def parse_ssl():
    with open('scripts/ssl101_all.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    raw_blocks = re.split(r'\n(?=\d+\.\s+[A-Z])', content)
    questions = []

    for block in raw_blocks:
        block = block.strip()
        if not block:
            continue

        m_num = re.match(r'(\d+)\.\s*(.*)', block, re.DOTALL)
        if not m_num:
            continue

        q_num = m_num.group(1)
        rest = m_num.group(2).strip()

        # Find answer at the end
        m_ans = re.search(r'Đáp án(?:\s+đúng)?:\s*([A-Za-z0-9\s,hoặc]+)(?:\s*\((.*?)\))?$', rest, re.DOTALL | re.IGNORECASE)
        answer_key = 'A'
        explanation = ''
        if m_ans:
            answer_key = m_ans.group(1).strip()
            if m_ans.group(2):
                explanation = m_ans.group(2).strip()
            rest = rest[:m_ans.start()].strip()

        opt_pattern = r'([A-E])\.\s*(.*?)(?=(?:[A-E]\.|$))'
        opt_matches = list(re.finditer(opt_pattern, rest, re.DOTALL))

        options = []
        question_text = rest
        if opt_matches:
            question_text = rest[:opt_matches[0].start()].strip()
            for om in opt_matches:
                opt_letter = om.group(1)
                opt_content = om.group(2).strip()
                options.append(f"{opt_letter}. {opt_content}")

        correct_word = ''
        first_key = 'A'
        if 'B' in answer_key: first_key = 'B'
        elif 'C' in answer_key: first_key = 'C'
        elif 'D' in answer_key: first_key = 'D'
        elif 'A' in answer_key: first_key = 'A'

        for opt in options:
            if opt.startswith(first_key + '.'):
                correct_word = opt
                break
        if not correct_word and options:
            correct_word = options[0]

        q_lower = (question_text + ' ' + ' '.join(options)).lower()
        topic = 'Kỹ Năng Học Đại Học Chung'
        if any(k in q_lower for k in ['critical thinking', 'analytical', 'creative', 'bloom', 'problem-solving', 'bias', 'evaluate', 'reasoning', 'evidence']):
            topic = 'Tư Duy Phản Biện & Phân Tích'
        elif any(k in q_lower for k in ['metacognition', 'memory', 'retrieval', 'encoding', 'forgetting curve', 'learning', 'study', 'sq3r', 'note-taking', 'reading']):
            topic = 'Chiến Lược Học Tập & Trí Nhớ'
        elif any(k in q_lower for k in ['ai literacy', 'artificial intelligence', 'chatgpt', 'hallucination', 'academic integrity', 'plagiarism', 'turnitin', 'surveillance', 'deep fake']):
            topic = 'AI Literacy & Đạo Đức Học Thuật'
        elif any(k in q_lower for k in ['time management', 'procrastination', 'smart', 'goal', 'schedule', 'planner', 'prioritization', 'all-nighter', 'multitasking']):
            topic = 'Quản Lý Thời Gian & Mục Tiêu SMART'
        elif any(k in q_lower for k in ['communication', 'teamwork', 'tuckman', 'forming', 'storming', 'norming', 'performing', 'feedback', 'email', 'forum', 'rubric', 'community of inquiry']):
            topic = 'Làm Việc Nhóm & Giao Tiếp Hiệu Quả'
        elif any(k in q_lower for k in ['finance', 'net worth', 'assets', 'liabilities', 'tuition', 'debt', 'career', 'job', 'resume', 'interview']):
            topic = 'Tài Chính Cá Nhân & Định Hướng Nghề Nghiệp'

        questions.append({
            'id': f'ssl_{q_num}',
            'word': f'Câu {q_num}: ' + question_text[:60] + ('...' if len(question_text) > 60 else ''),
            'question': question_text,
            'options': options,
            'answer': answer_key,
            'correctWord': correct_word,
            'explanation': (f"Đáp án: {answer_key}. " + explanation).strip(),
            'subject': 'Kỹ Năng Học Đại Học & AI (SSL101)',
            'topic': topic
        })

    return questions

# -------------------------------------------------------------
# 3. PARSE PRF192 (C Programming Language)
# -------------------------------------------------------------
def parse_prf():
    with open('scripts/prf192_all.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    raw_blocks = re.split(r'\n(?=Câu\s+\d+:)', content)
    questions = []

    for block in raw_blocks:
        block = block.strip()
        if not block:
            continue

        m_num = re.match(r'Câu\s+(\d+):\s*(.*)', block, re.DOTALL)
        if not m_num:
            continue

        q_num = m_num.group(1)
        rest = m_num.group(2).strip()

        m_ans = re.search(r'Đáp án(?:\s+đúng)?:\s*([A-Za-z0-9\s,hoặc]+)(?:\s*\((.*?)\))?$', rest, re.DOTALL | re.IGNORECASE)
        answer_key = 'A'
        explanation = ''
        if m_ans:
            answer_key = m_ans.group(1).strip()
            if m_ans.group(2):
                explanation = m_ans.group(2).strip()
            rest = rest[:m_ans.start()].strip()

        opt_pattern = r'([A-E])\.\s*(.*?)(?=(?:[A-E]\.|$))'
        opt_matches = list(re.finditer(opt_pattern, rest, re.DOTALL))

        options = []
        question_text = rest
        if opt_matches:
            question_text = rest[:opt_matches[0].start()].strip()
            for om in opt_matches:
                opt_letter = om.group(1)
                opt_content = om.group(2).strip()
                options.append(f"{opt_letter}. {opt_content}")

        correct_word = ''
        first_key = 'A'
        if 'B' in answer_key: first_key = 'B'
        elif 'C' in answer_key: first_key = 'C'
        elif 'D' in answer_key: first_key = 'D'
        elif 'A' in answer_key: first_key = 'A'

        for opt in options:
            if opt.startswith(first_key + '.'):
                correct_word = opt
                break
        if not correct_word and options:
            correct_word = options[0]

        q_lower = (question_text + ' ' + ' '.join(options)).lower()
        topic = 'Lập Trình C Chung'
        if any(k in q_lower for k in ['pointer', '*p', '&', 'malloc', 'calloc', 'realloc', 'free', 'address', 'dynamic allocation']):
            topic = 'Con Trỏ & Quản Lý Bộ Nhớ'
        elif any(k in q_lower for k in ['array', 'matrix', 'arr[', 'two-dimensional', 'traversal', 'linear search', 'bubble sort', 'selection sort']):
            topic = 'Mảng & Giải Thuật Cơ Bản'
        elif any(k in q_lower for k in ['string', 'strcmp', 'strcpy', 'strcat', 'strlen', 'strstr', 'char', 'gets', 'puts', '\\0']):
            topic = 'Chuỗi Ký Tự (Strings)'
        elif any(k in q_lower for k in ['file', 'fopen', 'fclose', 'feof', 'fgetc', 'fputc', 'fprintf', 'fscanf', 'rewind', 'fwrite', 'wb', 'a+']):
            topic = 'Tệp Tin (File I/O)'
        elif any(k in q_lower for k in ['loop', 'for', 'while', 'do-while', 'switch', 'case', 'break', 'continue', 'if', 'else']):
            topic = 'Cấu Trúc Điều Khiển & Vòng Lặp'
        elif any(k in q_lower for k in ['function', 'prototype', 'scope', 'local variable', 'global', 'parameter', 'return', 'pass by value', 'pass by reference']):
            topic = 'Hàm & Phạm Vi Biến'
        elif any(k in q_lower for k in ['data type', 'int', 'float', 'double', 'sizeof', 'operator', '%', '++', '--', '&', '|', '^', '<<', '>>', '?:', 'printf', 'scanf', 'math.h']):
            topic = 'Cú Pháp, Kiểu Dữ Liệu & Toán Tử'

        questions.append({
            'id': f'prf_{q_num}',
            'word': f'Câu {q_num}: ' + question_text[:60] + ('...' if len(question_text) > 60 else ''),
            'question': question_text,
            'options': options,
            'answer': answer_key,
            'correctWord': correct_word,
            'explanation': (f"Đáp án: {answer_key}. " + explanation).strip(),
            'subject': 'Lập Trình C (PRF192)',
            'topic': topic
        })

    return questions

# -------------------------------------------------------------
# MAIN WRITER
# -------------------------------------------------------------
cea_questions = parse_cea()
ssl_questions = parse_ssl()
prf_questions = parse_prf()

print(f"Parsed {len(cea_questions)} CEA201 questions")
print(f"Parsed {len(ssl_questions)} SSL101 questions")
print(f"Parsed {len(prf_questions)} PRF192 questions")

# Save master full files
with open('public/data/cea201_all.json', 'w', encoding='utf-8') as f:
    json.dump(cea_questions, f, ensure_ascii=False, indent=2)

with open('public/data/ssl101_all.json', 'w', encoding='utf-8') as f:
    json.dump(ssl_questions, f, ensure_ascii=False, indent=2)

with open('public/data/prf192_all.json', 'w', encoding='utf-8') as f:
    json.dump(prf_questions, f, ensure_ascii=False, indent=2)

# Save categorized topic files
def save_by_topic(items, prefix):
    topics = {}
    for item in items:
        t = item['topic']
        if t not in topics:
            topics[t] = []
        topics[t].append(item)

    for topic_name, q_list in topics.items():
        slug = re.sub(r'[^a-zA-Z0-9]+', '_', topic_name).strip('_').lower()
        file_path = f'public/data/{prefix}_{slug}.json'
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(q_list, f, ensure_ascii=False, indent=2)
        print(f"  -> {file_path}: {len(q_list)} questions")

print("Saving CEA201 topics:")
save_by_topic(cea_questions, 'cea')

print("Saving SSL101 topics:")
save_by_topic(ssl_questions, 'ssl')

print("Saving PRF192 topics:")
save_by_topic(prf_questions, 'prf')

print("Done generating question banks!")
