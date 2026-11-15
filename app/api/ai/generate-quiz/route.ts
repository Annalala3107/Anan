import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MAX_PROMPT_LENGTH = 6000;

function sanitizeErrorMessage(msg: string, apiKey: string): string {
  if (!msg) return 'Không thể xử lý phản hồi từ Gemini API.';
  return apiKey ? msg.split(apiKey).join('[REDACTED]') : msg;
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      prompt?: unknown;
      subject?: unknown;
      count?: unknown;
      difficulty?: unknown;
      userApiKey?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Dữ liệu yêu cầu không đúng định dạng JSON.' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-goog-api-key')?.trim() || '';
    const bodyKey = typeof body.userApiKey === 'string' ? body.userApiKey.trim() : '';
    const envKey = process.env.GEMINI_API_KEY?.trim() || '';
    const apiKey = headerKey || bodyKey || envKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Bạn có thể thêm biến GEMINI_API_KEY trên Vercel hoặc nhập khóa tạm thời trong phần Cài đặt Key.',
        },
        { status: 400 }
      );
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp chủ đề hoặc nội dung cần tạo câu hỏi.' },
        { status: 400 }
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Nội dung yêu cầu vượt quá giới hạn ${MAX_PROMPT_LENGTH} ký tự.` },
        { status: 400 }
      );
    }

    const subject =
      typeof body.subject === 'string' && body.subject.trim()
        ? body.subject.trim().slice(0, 80)
        : 'PRF192';
    const difficulty =
      typeof body.difficulty === 'string' && ALLOWED_DIFFICULTIES.has(body.difficulty)
        ? body.difficulty
        : 'medium';
    const questionCount = Math.min(Math.max(Number(body.count) || 10, 3), 30);

    const systemInstruction = `Bạn là chuyên gia khảo thí và giảng viên đại học chuyên ra đề thi trắc nghiệm.
Nhiệm vụ của bạn là tạo chính xác ${questionCount} câu hỏi trắc nghiệm khách quan cho môn học "${subject}", chủ đề "${prompt}", độ khó "${difficulty}".

QUY TẮC BẮT BUỘC:
1. Mỗi câu hỏi PHẢI có đúng 4 phương án lựa chọn: "A. ...", "B. ...", "C. ...", "D. ...".
2. BẮT BUỘC chỉ định đúng chữ cái đáp án ("A", "B", "C" hoặc "D") trong trường "answer".
3. Trường "correctWord" phải chứa toàn bộ nội dung của đáp án đúng (ví dụ: "A. Kích thước 8 bytes").
4. Trường "explanation" ngắn gọn, chỉ rõ tại sao đáp án đó đúng và tại sao các đáp án khác sai.
5. Nếu câu hỏi về lập trình, hãy định dạng khối code sạch sẽ.
6. Kết quả trả về BẮT BUỘC là một JSON Array hợp lệ, KHÔNG thêm bất kỳ lời dẫn hay ký tự thừa nào ngoài khối JSON.

ĐỊNH DẠNG JSON MẪU:
[
  {
    "question": "Trong ngôn ngữ C, toán tử nào dùng để lấy địa chỉ của một biến?",
    "options": [
      "A. *",
      "B. &",
      "C. ->",
      "D. %"
    ],
    "answer": "B",
    "correctWord": "B. &",
    "explanation": "Toán tử & (address-of operator) dùng để lấy địa chỉ ô nhớ của một biến trong C.",
    "subject": "${subject}",
    "topic": "${prompt}"
  }
]`;

    // Official production Google Gemini models with priority fallbacks
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError = '';
    let textResponse = '';

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            signal: AbortSignal.timeout(35_000),
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemInstruction}\n\nHãy tạo ${questionCount} câu trắc nghiệm cho chủ đề: ${prompt}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.4,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        const rawResponseText = await response.text();
        let data: {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          error?: { message?: string };
        } | null = null;

        try {
          data = rawResponseText ? JSON.parse(rawResponseText) : null;
        } catch {
          data = null;
        }

        if (!response.ok) {
          lastError = sanitizeErrorMessage(
            data?.error?.message ||
              `Google Gemini API trả về mã lỗi HTTP ${response.status}.`,
            apiKey
          );
          continue;
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          textResponse = candidateText;
          break;
        }

        lastError = sanitizeErrorMessage(
          data?.error?.message || 'Gemini API không trả về nội dung câu hỏi hợp lệ.',
          apiKey
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối tới Gemini API.';
        lastError = sanitizeErrorMessage(msg, apiKey);
      }
    }

    if (!textResponse) {
      return NextResponse.json(
        {
          error:
            lastError ||
            'Không thể tạo câu hỏi từ Gemini API. Vui lòng kiểm tra lại API Key hoặc thử lại sau.',
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Strip optional markdown JSON fence
    let cleanedText = textResponse.trim();
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json/, '');
    if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```/, '');
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.replace(/```$/, '');
    cleanedText = cleanedText.trim();

    let parsedQuestions: unknown;
    try {
      parsedQuestions = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        { error: 'Dữ liệu AI trả về không đúng chuẩn JSON. Vui lòng thử lại.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'AI không tạo được danh sách câu hỏi hợp lệ.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const baseTime = Date.now();
    const words = parsedQuestions.map((rawItem, idx) => {
      const item = (rawItem && typeof rawItem === 'object' ? rawItem : {}) as {
        question?: unknown;
        options?: unknown;
        answer?: unknown;
        correctWord?: unknown;
        explanation?: unknown;
        subject?: unknown;
        topic?: unknown;
      };
      const questionStr = typeof item.question === 'string' ? item.question : '';
      const optionsArr = Array.isArray(item.options)
        ? item.options.filter((o): o is string => typeof o === 'string')
        : [];
      const answerStr =
        typeof item.answer === 'string' && item.answer.trim()
          ? item.answer.trim().toUpperCase()
          : 'A';
      const correctWordStr =
        typeof item.correctWord === 'string' && item.correctWord.trim()
          ? item.correctWord
          : optionsArr[0] || '';

      return {
        id: `ai_q_${baseTime}_${idx + 1}`,
        word: `Câu ${idx + 1}: ${questionStr}`,
        question: questionStr,
        options: optionsArr,
        answer: answerStr,
        correctWord: correctWordStr,
        explanation: typeof item.explanation === 'string' ? item.explanation : '',
        subject: typeof item.subject === 'string' && item.subject.trim() ? item.subject : subject,
        topic: typeof item.topic === 'string' && item.topic.trim() ? item.topic : prompt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        title: `${subject} — ${prompt} (${words.length} câu AI)`,
        subject,
        topic: prompt,
        words,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xử lý yêu cầu tạo đề.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
