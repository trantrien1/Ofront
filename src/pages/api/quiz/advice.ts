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
        temperature: 0.7,
        maxOutputTokens: 512,
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
    const { audience, items } = req.body || {};
    if (!Array.isArray(items) || !audience) return res.status(400).json({ error: 'Invalid payload' });

    const lines: string[] = [];
    lines.push(`Bạn là một chuyên gia hỗ trợ tâm lý, giảng viên kỹ năng sống. Đối tượng: ${audience}.`);
    lines.push("Đối tượng: người đang cảm thấy căng thẳng, áp lực, stress trong học tập, công việc hoặc cuộc sống.");
    lines.push('Dưới đây là câu hỏi và lựa chọn của người dùng. Hãy phân tích nhanh điểm mạnh/yếu và đưa ra 3-6 lời khuyên cụ thể, ngắn gọn, có thể hành động ngay.');
    lines.push(`Định dạng:
    - Mở đầu 1-2 câu đồng cảm, xác nhận cảm xúc của người dùng.
    - Danh sách 3-6 gợi ý cụ thể, dễ thực hiện ngay để giảm stress (ví dụ: thở sâu, vận động nhẹ, chia nhỏ công việc, tìm người trò chuyện).
    - (Tuỳ chọn) nguồn lực/kênh hỗ trợ uy tín (sách, website sức khỏe tinh thần, hotline hỗ trợ).`);
    lines.push('---');
    items.forEach((it: any, i: number) => {
      const q = String(it?.question || `Câu hỏi #${i + 1}`);
      const ans = Array.isArray(it?.answer) ? it.answer.join(', ') : String(it?.answer ?? '');
      lines.push(`Q${i + 1}: ${q}`);
      if (ans) lines.push(`→ Trả lời: ${ans}`);
    });
    const prompt = lines.join('\n');

    const advice = await callGemini(prompt);
    return res.status(200).json({ advice });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to generate advice' });
  }
}
