import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

type Msg = {
  id: string;
  from: "user" | "bot";
  text: string;
  time: number;
  thinking?: boolean;
  attachment?: { dataUrl: string; mime: string } | null;
};

const ChatbotPage: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      from: "bot",
      text: "Chào bạn 👋\nTôi có thể giúp gì cho bạn?",
      time: Date.now(),
    },
  ]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ dataUrl: string; mime: string } | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const thinkingStartRef = useRef<Record<string, number>>({});
  const MIN_THINK_MS = 600; // minimum time to show thinking indicator

  // Auto scroll to bottom on new message
  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const historyForApi = useMemo(
    () =>
      messages.map((m) => ({ from: m.from === "bot" ? "bot" : "user", text: m.text })),
    [messages]
  );

  const processForMath = (s: string) => {
    // Replace $$...$$ blocks with div to help MathJax block rendering
    let html = s.replace(/\$\$([\s\S]+?)\$\$/g, (_match, p1) => `<div>$$${String(p1).trim()}$$</div>`);
    // Preserve newlines
    html = html.replace(/\n/g, "<br>");
    // Bold **text** to <b>
    html = html.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    return html;
  };

  const typesetMath = (container?: HTMLElement | null) => {
    try {
      const target = container || chatBodyRef.current || undefined;
      // @ts-ignore
      if (typeof window !== "undefined" && (window as any).MathJax && target) {
        // @ts-ignore
        (window as any).MathJax.typesetPromise([target]);
      }
    } catch {}
  };

  const sendToApi = useCallback(
    async (prompt: string, placeholderId: string) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, history: historyForApi }),
        });
        const data = await res.json();
        const reply: string = (data?.reply || "").toString();
        const started = thinkingStartRef.current[placeholderId] || Date.now();
        const elapsed = Date.now() - started;
        if (elapsed < MIN_THINK_MS) {
          await new Promise((r) => setTimeout(r, MIN_THINK_MS - elapsed));
        }

        setMessages((list) =>
          list.map((m) =>
            m.id === placeholderId
              ? { ...m, text: reply || "…", thinking: false }
              : m
          )
        );
        // Defer typeset to next paint
        setTimeout(() => typesetMath(), 0);
      } catch (e) {
        const started = thinkingStartRef.current[placeholderId] || Date.now();
        const elapsed = Date.now() - started;
        if (elapsed < MIN_THINK_MS) {
          await new Promise((r) => setTimeout(r, MIN_THINK_MS - elapsed));
        }
        setMessages((list) =>
          list.map((m) =>
            m.id === placeholderId
              ? { ...m, text: "Xin lỗi, có lỗi khi gọi chatbot.", thinking: false }
              : m
          )
        );
      }
    },
    [historyForApi]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent | React.KeyboardEvent) => {
      if (e) e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: Msg = {
        id: `u-${Date.now()}`,
        from: "user",
        text: trimmed,
        time: Date.now(),
        attachment: file,
      };
      setMessages((list) => [...list, userMsg]);
      setText("");
      setFile(null);

  const placeholderId = `b-${Date.now() + 1}`;
      const botThinking: Msg = {
        id: placeholderId,
        from: "bot",
        text: "",
        time: Date.now() + 1,
        thinking: true,
      };
      setMessages((list) => [...list, botThinking]);
  thinkingStartRef.current[placeholderId] = Date.now();
      // Call API
      sendToApi(trimmed, placeholderId);
    },
    [text, file, sendToApi]
  );

  const onFileChange = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setFile({ dataUrl, mime: f.type });
      // Clear the input
      ev.target.value = "";
    };
    reader.readAsDataURL(f);
  }, []);

  // After each render, typeset math for any new bot messages
  useEffect(() => {
    typesetMath();
  }, [messages]);

  return (
    <>
      <Head>
        <title>Chatbot</title>
        <meta charSet="UTF-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        {/* MathJax */}
        <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </Head>
      <div className="chatbot-page">
        <div className="chatbot-popup">
          <div className="chat-header">
            <div className="header-info">
              <span className="material-symbols-outlined icon">robot_2</span>
              <h2 className="logo-text">Chatbot</h2>
            </div>
            <button
              id="close-chatbot"
              className="material-symbols-outlined"
              onClick={() => history.back()}
              aria-label="Close"
            >
              expand_more
            </button>
          </div>

          <div className="chat-body" ref={chatBodyRef}>
            {messages.map((m) => (
              <div key={m.id} className={`message ${m.from === "bot" ? "bot-message" : "user-message"} ${m.thinking ? "thinking" : ""}`}>
                {m.from === "bot" && (
                  <span id="bot-avatar" className="material-symbols-outlined icon">robot_2</span>
                )}
                <div className="message-text" dangerouslySetInnerHTML={{ __html: m.thinking ? thinkingDotsHtml : processForMath(m.text) }} />
                {m.from === "user" && m.attachment?.dataUrl && (
                  <img src={m.attachment.dataUrl} alt="file" className="attachment" />
                )}
              </div>
            ))}
          </div>

          <div className="chat-footer">
            <form className="chat-form" onSubmit={handleSubmit}>
              <textarea
                className="message-input"
                placeholder="Message..."
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="chat-controls">
                <button type="button" className="material-symbols-outlined" title="Emoji">mood</button>
                <div className={`file-upload-wrapper ${file ? "file-uploaded" : ""}`}>
                  <input type="file" accept="image/*" id="file-input" onChange={onFileChange} hidden />
                  <img src={file?.dataUrl || "#"} style={{ display: file ? "block" : "none" }} />
                  <button type="button" id="file-upload" className="material-symbols-outlined" onClick={() => document.getElementById("file-input")?.click?.()}>attach_file</button>
                  <button type="button" id="file-cancel" className="material-symbols-outlined" onClick={() => setFile(null)}>close</button>
                </div>
                <button type="submit" id="send-message" className="material-symbols-outlined" disabled={!text.trim()}>
                  arrow_upward
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .chatbot-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(#00c6ff, #1f416b);
          padding: 20px;
        }

        .chatbot-popup{
          position: relative;
          width: 700px;
          max-width: 100%;
          background-color: #ebf0f1;
          overflow: hidden;
          border-radius:15px;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.1), 0 32px 64px -48px rgba(0, 0, 0, 0.5);
          font-family: "Inter", sans-serif;
        }

        .chat-header{
          display: flex;
          align-items: center;
          background: #0072ff;
          padding: 15px 22px;
          justify-content: space-between;
        }
        .chat-header .header-info{
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-info .logo-text{
          color:white;
          font-size: 1.31rem;
          font-weight: 600;
        }
        .chat-header #close-chatbot{
          border: none;
          color:white;
          height: 40px;
          width: 40px;
          font-size: 1.9rem;
          margin-top:2px;
          padding-top:2px;
          cursor: pointer;
          border-radius: 50%;
          background: none;
          transition: 0.2s ease;
        }
        .chat-header #close-chatbot:hover{ background: rgba(255, 255, 255, 0.2); }

        .chat-body{
          padding:25px 22px;
          display: flex;
          gap: 20px;
          height: 500px;
          margin-bottom: 82px;
          overflow-y: auto;
          flex-direction: column ;
        }
        .chat-body .message{ display: flex; gap: 11px; align-items: center; }
        .chat-body .bot-message #bot-avatar{
          height: 35px; width: 35px; padding: 6px; fill:#fff; flex-shrink: 0; background: #5350C4; border-radius: 50%;
        }
        .chat-body .user-message{ flex-direction: column; align-items: flex-end; }

        .chat-body .message .message-text{
          padding: 12px 16px; max-width: 100%; font-size: 0.95rem; overflow-x: auto; white-space: pre-line;
          background: #F2F2FF; border-radius: 13px 13px 13px 3px;
        }
        .chat-body .user-message .message-text{ background: #0072ff; color: white; border-radius: 13px 13px 3px 13px; }
        .chat-body .user-message .attachment{ width: 50%; margin-top: -7px; border-radius: 13px 13px 3px 13px; }

  .chat-body .bot-message.thinking .message-text{ padding: 6px 16px; background: #EEF2FF; display: inline-flex; align-items: center; }
  .chat-body .bot-message .thinking-indicator{ display: flex; align-items: center; gap:6px; padding-block:10px; min-height: 22px; }
  .chat-body .bot-message .thinking-indicator .dot{ height: 10px; width: 10px; border-radius: 50%; background: #4F46E5; animation: typingDots 1s infinite ease-in-out; }
  .chat-body .bot-message .thinking-indicator .dot:nth-child(1){ animation-delay: 0s; }
  .chat-body .bot-message .thinking-indicator .dot:nth-child(2){ animation-delay: 0.15s; }
  .chat-body .bot-message .thinking-indicator .dot:nth-child(3){ animation-delay: 0.3s; }
  @keyframes typingDots{ 0%, 80%, 100%{ transform: scale(0.8); opacity: .4; } 40%{ transform: scale(1.2); opacity: 1; } }

        .chat-footer{ position: absolute; bottom: 0; width: 100%; background: #fff; padding: 15px 22px 20px; }
        .chat-footer .chat-form{ display: flex; align-items: center; background: #fff; border-radius: 32px; outline: 1px solid #e0e0e0; }
        .chat-footer .chat-form:focus-within{ outline: 2px solid #4410bd; }
        .chat-form .message-input{ border: none; outline: none; height: 47px; width: 100%; resize: none; font-size: 0.95rem; padding: 14px 0 13px 18px; border-radius: inherit; }
        .chat-form .chat-controls{ display:flex; gap: 3px; height: 47px; align-items: center; align-self: flex-end; padding-right:6px; }
        .chat-form .chat-controls button{ height: 35px; width:35px; border: none; background: #fff; cursor: pointer; font-size: 1.15rem; color: #0072ff; transition:0.2s ease; border-radius: 50%; }
        .chat-form .chat-controls #send-message{ display: inline-flex; align-items: center; justify-content: center; background: #0072ff; color: white; }
        .chat-form .chat-controls #send-message[disabled]{ opacity: 0.5; cursor: not-allowed; }
        .chat-form .chat-controls #send-message:hover{ background: #00458a; }
        .chat-form .chat-controls button:hover{ background: #e0e0e0; }

        .chat-form .file-upload-wrapper{ position:relative; height:35px; width:35px; }
        .chat-form .file-upload-wrapper img{ position: absolute; display: none; width:100%; height:100%; object-fit: cover; border-radius: 50%; }
        .chat-form .file-upload-wrapper #file-cancel{ color:#ff0000; background: #fff; display: none; }
        .chat-form .file-upload-wrapper.file-uploaded #file-upload{ display: none; }
        .chat-form .file-upload-wrapper.file-uploaded img{ display:block; }
        .chat-form .file-upload-wrapper.file-uploaded:hover #file-cancel{ display:block; }

        /* MathJax styles */
        .message-text .mjx-block { overflow-x: auto !important; display: block !important; text-align: left !important; margin: 12px 0 !important; background: #f8f8ff; border-radius: 8px; padding: 8px 12px; }
        .message-text .mjx-inline { white-space: nowrap !important; }
        .message-text { overflow-x: auto; word-break: break-word; }
      `}</style>
    </>
  );
};

const thinkingDotsHtml = `
  <div class="thinking-indicator">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
`;

export default ChatbotPage;
