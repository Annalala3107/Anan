import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      subject = 'PRF192',
      count = 10,
      difficulty = 'medium',
      userApiKey,
    } = body;

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm biến GEMINI_API_KEY trên Vercel hoặc nhập key trực tiếp trong bảng cài đặt.',
        },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp chủ đề hoặc nội dung cần tạo câu hỏi.' },
        { status: 400 }
      );
    }

    const questionCount = Math.min(Math.max(Number(count) || 10, 3), 30);

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
    let lastError = null;
    let textResponse = '';

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          textResponse = data.candidates[0].content.parts[0].text;
          break;
        } else {
          lastError = data.error?.message || `Lỗi từ Google Gemini API (${response.status})`;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!textResponse) {
      return NextResponse.json(
        { error: lastError || 'Không thể tạo câu hỏi từ Gemini API. Vui lòng kiểm tra lại API Key.' },
        { status: 502 }
      );
    }

    // Parse JSON
    let cleanedText = textResponse.trim();
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json/, '');
    if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```/, '');
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.replace(/```$/, '');
    cleanedText = cleanedText.trim();

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(cleanedText);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Dữ liệu AI trả về không đúng chuẩn JSON. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'AI không tạo được danh sách câu hỏi hợp lệ.' },
        { status: 500 }
      );
    }

    // Format into AnanQuiz Word objects
    const words = parsedQuestions.map((item, idx) => ({
      id: `ai_q_${Date.now()}_${idx + 1}`,
      word: `Câu ${idx + 1}: ${item.question || ''}`,
      question: item.question || '',
      options: Array.isArray(item.options) ? item.options : [],
      answer: item.answer ? String(item.answer).toUpperCase() : 'A',
      correctWord: item.correctWord || (item.options ? item.options[0] : ''),
      explanation: item.explanation || '',
      subject: item.subject || subject,
      topic: item.topic || prompt,
    }));

    return NextResponse.json({
      success: true,
      title: `${subject} — ${prompt} (${words.length} câu AI)`,
      subject,
      topic: prompt,
      words,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý yêu cầu tạo đề.' },
      { status: 500 }
    );
  }
}
