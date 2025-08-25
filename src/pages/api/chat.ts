import type { NextApiRequest, NextApiResponse } from "next";

type ChatBody = {
  prompt?: string;
  history?: Array<{ from: "user" | "bot"; text: string }>;
  model?: string; // allow override
  temperature?: number;
  maxOutputTokens?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
    }

    const body = (req.body || {}) as ChatBody;
    const prompt = (body.prompt || "").toString();
    const history = Array.isArray(body.history) ? body.history : [];
    const model = body.model || "gemini-1.5-flash";
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.6;
    const maxOutputTokens = typeof body.maxOutputTokens === 'number' ? body.maxOutputTokens : 512;

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Build contents with minimal history
    const contents: any[] = [];
    // Optional lightweight system style prefix
    const systemPrefix = "You are a concise, helpful assistant. Answer in Vietnamese when the user speaks Vietnamese.";
    contents.push({ role: "user", parts: [{ text: systemPrefix }] });
    // Fold history as alternating user/model turns
    history.forEach((h) => {
      contents.push({ role: h.from === "user" ? "user" : "model", parts: [{ text: h.text }] });
    });
    // Append current user prompt
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      try {
        const json = JSON.parse(text);
        return res.status(upstream.status).json({ error: json?.error || json, status: upstream.status });
      } catch {
        return res.status(upstream.status).json({ error: text || "upstream error", status: upstream.status });
      }
    }

    let reply = "";
    try {
      const json = JSON.parse(text);
      // Extract the first candidate text
      reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
      // fallback
      reply = text;
    }

    return res.status(200).json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "chat proxy error" });
  }
}
