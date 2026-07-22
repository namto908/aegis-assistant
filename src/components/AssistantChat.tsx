import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Send, Sparkles, AlertTriangle, User, MessageSquare, Bot, HelpCircle, Loader2 } from "lucide-react";
import { Message, AssistantConfig, Task, ServerStatus } from "../types";
import { getThemeClasses } from "../lib/theme";

interface AssistantChatProps {
  assistantConfig: AssistantConfig;
  tasks: Task[];
  servers: ServerStatus[];
  addNotification: (title: string, description: string, category: "task" | "server" | "system") => void;
  prefillMessage?: string | null;
  clearPrefillMessage?: () => void;
}

export default function AssistantChat({ 
  assistantConfig, 
  tasks, 
  servers, 
  addNotification,
  prefillMessage,
  clearPrefillMessage
}: AssistantChatProps) {
  const theme = getThemeClasses(assistantConfig.themeColor || "slate");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: `Xin chào! Tôi là **${assistantConfig.name}**, trợ lý ảo cá nhân được cấu hình riêng cho bạn. Tôi có toàn quyền kiểm soát danh sách công việc và đang giám sát trạng thái uptime server.\n\nBạn cần tôi tóm tắt tình hình hay hỗ trợ xử lý công việc gì hôm nay không?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle message prefilling from other tabs
  useEffect(() => {
    if (prefillMessage) {
      handleSendMessage(prefillMessage);
      if (clearPrefillMessage) {
        clearPrefillMessage();
      }
    }
  }, [prefillMessage]);

  // Quick action suggestions
  const suggestions = [
    "Tóm tắt công việc của tôi",
    "Trạng thái Server thế nào?",
    "Hạn chót các Task sắp tới",
    "Lời khuyên hiệu suất hôm nay",
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);
    setApiError(null);

    // Prepare custom system instruction injected with current system stats so AI knows about tasks/servers in real-time!
    const richSystemInstruction = `
${assistantConfig.prompt}
Bạn tên là ${assistantConfig.name}.
Hiện tại bạn biết chính xác các thông tin thực tế sau về hệ thống của chủ nhân:

1. DANH SÁCH TASKS CỦA CHỦ NHÂN:
${JSON.stringify(tasks.map(t => ({ title: t.title, priority: t.priority, completed: t.completed, deadline: t.deadline })), null, 2)}

2. TRẠNG THÁI SERVER UPTIME CHỦ NHÂN:
${JSON.stringify(servers.map(s => ({ name: s.name, status: s.status, uptime: s.uptime, latency: s.latency })), null, 2)}

HƯỚNG DẪN TRẢ LỜI:
- Luôn xưng hô thân thiện, chuyên nghiệp, gọi chủ nhân là "chủ nhân", "bạn" hoặc "anh/chị", xưng là "${assistantConfig.name}" hoặc "em".
- Nếu chủ nhân hỏi về các task, hãy liệt kê chính xác các task chưa xong, hoặc tóm tắt số lượng.
- Nếu chủ nhân hỏi về server, hãy nêu chính xác các server có trạng thái UP/DOWN. Nếu có server nào bị DOWN (status: down), hãy bày tỏ sự lo lắng và nhắc nhở chủ nhân sửa lỗi.
- Đưa ra câu trả lời ngắn gọn, thiết thực, có cấu trúc rõ ràng sử dụng Markdown nhẹ. Trả lời bằng TIẾNG VIỆT hoàn toàn.
`;

    try {
      const chatHistoryForGemini = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const apiBase = (assistantConfig.apiBaseUrl && assistantConfig.apiBaseUrl.trim() !== "") ? assistantConfig.apiBaseUrl.replace(/\/$/, "") : "http://192.168.2.200:3000";
      
      const controller = new AbortController();
      const response = await fetch(`${apiBase}/api/gemini/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: chatHistoryForGemini,
          systemInstruction: richSystemInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối tới server trợ lý ảo.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMsg: Message = {
        role: "model",
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn:", error);
      setApiError("Trợ lý gặp sự cố kết nối với mô hình AI.");
      
      // Fallback response inside prototype
      const fallbackMsg: Message = {
        role: "model",
        content: `Tôi đã nhận được yêu cầu "${text}". Tuy nhiên, khóa API chưa được định cấu hình đầy đủ để tôi trả lời thông minh bằng AI. Dưới đây là phản hồi cục bộ:\n\n* **Tiến độ:** Bạn có ${tasks.filter(t => !t.completed).length} công việc chưa hoàn thành.\n* **Server:** Ghi nhận ${servers.filter(s => s.status === 'up').length}/${servers.length} máy chủ đang hoạt động.\n\n*Để kích hoạt AI hoàn chỉnh, hãy đảm bảo bạn đã cấu hình Secrets GEMINI_API_KEY ở góc ứng dụng.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderBubbleContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      // Bold rendering helper
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const renderedLine = parts.map((part, idx) =>
        idx % 2 === 1 ? <strong key={idx} className={`${theme.textMuted} font-semibold`}>{part}</strong> : part
      );

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="ml-3 list-disc text-xs leading-relaxed mb-1">
            {renderedLine}
          </li>
        );
      }
      return (
        <p key={i} className="text-xs leading-relaxed mb-1.5 break-words">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 pb-1">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-white/5 flex-shrink-0">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full overflow-hidden border ${theme.borderMuted}`}>
            <img 
              src={assistantConfig.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"} 
              alt="Assistant Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-slate-950 rounded-full"></span>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white font-display">{assistantConfig.name}</h2>
          <p className={`text-[10px] ${theme.text} font-medium flex items-center gap-1`}>
            <Sparkles size={10} className="animate-pulse" /> Trực tuyến • Sẵn sàng hỗ trợ
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3 pr-1">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div 
              key={index} 
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar Icon */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs flex-shrink-0 ${isUser ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text}` : "bg-white/5 border-white/10 text-slate-300 overflow-hidden"}`}>
                {isUser ? (
                  <User size={12} />
                ) : (
                  <img 
                    src={assistantConfig.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"} 
                    alt="Assistant" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Speech Bubble */}
              <div className={`max-w-[80%] space-y-1`}>
                <div 
                  className={`p-3 rounded-2xl border text-slate-200 ${isUser ? `${theme.bgMuted} ${theme.borderMuted} rounded-tr-sm` : "bg-white/5 border-white/10 rounded-tl-sm backdrop-blur-md"}`}
                >
                  {renderBubbleContent(msg.content)}
                </div>
                <p className={`text-[9px] text-slate-500 px-1 ${isUser ? "text-right" : "text-left"}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}

        {/* AI Typing Loader Indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 flex-shrink-0">
              <Loader2 size={12} className="animate-spin" />
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-sm backdrop-blur-md max-w-[80%]">
              <div className="flex gap-1.5 items-center justify-center h-4 px-2">
                <span className={`w-1.5 h-1.5 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "0ms" }}></span>
                <span className={`w-1.5 h-1.5 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "150ms" }}></span>
                <span className={`w-1.5 h-1.5 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="pt-2 border-t border-white/5 flex-shrink-0 flex items-center gap-2">
        <input
          type="text"
          placeholder="Hỏi trợ lý ảo..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
          className="flex-1 px-3.5 py-2.5 text-xs glass-input rounded-xl text-white"
          id="chat-input-text"
        />
        <button
          onClick={() => handleSendMessage(inputValue)}
          disabled={!inputValue.trim() || isTyping}
          className={`p-2.5 ${theme.bg} disabled:opacity-40 text-slate-950 rounded-xl transition cursor-pointer flex items-center justify-center shadow-lg`}
          id="send-chat-btn"
        >
          <Send size={14} />
        </button>
      </div>

      {apiError && (
        <p className="text-[9px] text-amber-300/80 mt-1 flex items-center gap-1 self-start">
          <AlertTriangle size={9} /> {apiError}
        </p>
      )}
    </div>
  );
}
