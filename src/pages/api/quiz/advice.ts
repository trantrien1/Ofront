import type { NextApiRequest, NextApiResponse } from 'next';

// Minimal REST call to Gemini 1.5 Flash without extra deps
async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY (or GOOGLE_GEMINI_API_KEY)');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1500,
        stopSequences: ["\n---END---\n"],
      },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Gemini HTTP ${r.status}: ${t}`);
  }
  const data = await r.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join('') || '';
  return text.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
  const { audience, items, dass, partialDass, totalQuestions, answeredCount } = req.body || {};
  if (!Array.isArray(items) || !audience) return res.status(400).json({ error: 'Invalid payload' });

    const lines: string[] = [];
    lines.push(`Bạn là một chuyên gia hỗ trợ tâm lý, giảng viên kỹ năng sống. Đối tượng: ${audience}.`);
    lines.push("Đối tượng: người đang cảm thấy căng thẳng, áp lực, stress trong học tập, công việc hoặc cuộc sống.");
    if (dass && dass.depression && dass.anxiety && dass.stress) {
      lines.push("Kết quả đánh giá DASS-21 của người dùng (điểm đã nhân đôi theo chuẩn DASS-42):");
      lines.push(`- Trầm cảm: ${dass.depression.score} — mức độ ${dass.depression.level}`);
      lines.push(`- Lo âu: ${dass.anxiety.score} — mức độ ${dass.anxiety.level}`);
      lines.push(`- Stress: ${dass.stress.score} — mức độ ${dass.stress.level}`);
      lines.push("Hãy điều chỉnh mức độ khẩn cấp và mức cụ thể của khuyến nghị tương ứng với mức độ trên. Nếu có mức 'Nặng' hoặc 'Rất nặng', ưu tiên khuyến nghị tìm hỗ trợ chuyên môn và nguồn lực chính thống.");
    }
    if (!dass && partialDass) {
      lines.push("Người dùng chưa trả lời đủ 21 câu. Đây là điểm tạm tính:");
      lines.push(`- Trầm cảm (tạm): ${partialDass.depression.scaled}, đã trả lời ${partialDass.depression.answered}/7`);
      lines.push(`- Lo âu (tạm): ${partialDass.anxiety.scaled}, đã trả lời ${partialDass.anxiety.answered}/7`);
      lines.push(`- Stress (tạm): ${partialDass.stress.scaled}, đã trả lời ${partialDass.stress.answered}/7`);
      lines.push("Chỉ đưa ra lời khuyên nhẹ nhàng/khái quát khi dữ liệu chưa đầy đủ; tránh kết luận nặng nề.");
    }
    lines.push(`Tổng số câu hỏi hiển thị: ${totalQuestions ?? '?'}; số câu đã trả lời: ${answeredCount ?? 0}.`);
  lines.push('Dưới đây là câu hỏi và lựa chọn của người dùng. Hãy phân tích nhanh điểm mạnh/yếu và đưa ra 3-6 lời khuyên cụ thể, ngắn gọn, có thể hành động ngay.');
  lines.push(`Định dạng và yêu cầu (bắt buộc):\n- Mở đầu 1-2 câu đồng cảm, xác nhận cảm xúc của người dùng.\n- Danh sách 3-6 gợi ý cụ thể, dễ thực hiện ngay để giảm stress.\n- (Tùy chọn) nguồn lực/kênh hỗ trợ uy tín.\nHãy trả về một chuỗi văn bản hoàn chỉnh; không cắt ngang câu. Nếu cần báo kết thúc, kết thúc bằng dòng chính xác: "---END---".`);
    lines.push('---');
    items.forEach((it: any, i: number) => {
      const qText = String(it?.questionText || it?.question || `Câu hỏi #${i + 1}`);
      const selectedLabel = String(it?.selectedLabel ?? it?.answerText ?? '').trim();
      const score = typeof it?.score === 'number' ? it.score : '';
      lines.push(`Q${i + 1}: ${qText}`);
      if (selectedLabel) {
        lines.push(`→ Trả lời được chọn (label): ${selectedLabel} (giá trị: ${String(it?.selectedValue ?? '')}, điểm: ${score})`);
        if (Array.isArray(it?.options) && it.options.length) {
          const opts = it.options.map((o: any) => String(o?.content ?? o?.label ?? o)).join(' | ');
          lines.push(`   Lựa chọn khả dĩ: ${opts}`);
        }
      } else {
        lines.push(`→ Chưa trả lời`);
      }
    });
    lines.push("Khi dữ liệu ít hoặc toàn điểm thấp (0), tránh gợi ý mức khẩn cấp quá cao. Hãy cân nhắc tính phù hợp.");
  let prompt = lines.join('\n');
  // append explicit end marker used in stopSequences so model knows to finish
  prompt += '\n---END---\n';

  const advice = await callGemini(prompt);
    return res.status(200).json({ advice });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to generate advice' });
  }
}
