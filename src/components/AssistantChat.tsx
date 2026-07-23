import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Send, Sparkles, AlertTriangle, User, Bot, Loader2, Image as ImageIcon, X, Trash2, Maximize2 } from "lucide-react";
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
      content: `Xin chào! Tôi là **${assistantConfig.name}**, trợ lý ảo cá nhân được cấu hình riêng cho bạn.\n\nTôi sẵn sàng hỗ trợ kiểm tra công việc, theo dõi máy chủ và giải đáp mọi thắc mắc. Bạn có thể gửi câu hỏi hoặc **đính kèm hình ảnh** để tôi phân tích nhé!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, selectedImage]);

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
    "Phân tích hệ thống & hình ảnh",
  ];

  // Image Selection Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setApiError("Vui lòng chỉ chọn tập tin hình ảnh (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setApiError("Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setApiError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputValue;
    if (!text.trim() && !selectedImage) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: selectedImage || undefined,
    };

    const imageForApi = selectedImage;
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSelectedImage(null);
    setIsTyping(true);
    setApiError(null);

    // Prepare custom system instruction injected with current system stats
    const richSystemInstruction = `
${assistantConfig.prompt}
Bạn tên là ${assistantConfig.name}.
Hiện tại bạn biết chính xác các thông tin thực tế sau về hệ thống của chủ nhân:

1. DANH SÁCH TASKS CỦA CHỦ NHÂN:
${JSON.stringify(tasks.map(t => ({ title: t.title, priority: t.priority, completed: t.completed, deadline: t.deadline })), null, 2)}

2. TRẠNG THÁI SERVER UPTIME CHỦ NHÂN:
${JSON.stringify(servers.map(s => ({ name: s.name, status: s.status, uptime: s.uptime, latency: s.latency })), null, 2)}

HƯỚNG DẪN TRẢ LỜI & TRÌNH BÀY MARKDOWN:
- Xưng hô thân thiện, chuyên nghiệp, gọi chủ nhân là "chủ nhân", "bạn" hoặc "anh/chị", xưng là "${assistantConfig.name}" hoặc "em".
- Nếu chủ nhân gửi hình ảnh, hãy phân tích kỹ các chi tiết trong ảnh và đưa ra nhận xét chuyên sâu.
- Nếu chủ nhân hỏi cần minh họa ảnh/sơ đồ hệ thống, bạn hãy đính kèm ảnh bằng cú pháp Markdown chuẩn: ![Mô tả ảnh](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800) hoặc ảnh công nghệ phù hợp từ Unsplash.
- Trả lời rõ ràng, sinh động, trình bày chuẩn Markdown (sử dụng tiêu đề ##, danh sách -, in đậm **text**, code block nếu cần). KHÔNG để lại các ký tự thô như *** trùng lặp không có ý nghĩa.
- Trả lời bằng TIẾNG VIỆT hoàn toàn.
`;

    try {
      const chatHistoryForGemini = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        image: m.image,
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
      
      const fallbackMsg: Message = {
        role: "model",
        content: `Tôi đã nhận được yêu cầu "${text}".\n\n* **Tiến độ:** Bạn có ${tasks.filter(t => !t.completed).length} công việc chưa hoàn thành.\n* **Server:** Ghi nhận ${servers.filter(s => s.status === 'up').length}/${servers.length} máy chủ đang hoạt động.\n\n*Lưu ý: Để bật AI hoàn chỉnh kèm phân tích hình ảnh, hãy kiểm tra kết nối server backend và GEMINI_API_KEY.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Advanced, Clean Markdown & Image Parser
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    // Clean up standalone raw *** lines or converts them into clean dividers
    const cleanContent = content.replace(/^\s*\*\*\*\s*$/gm, "---");

    const lines = cleanContent.split("\n");
    return lines.map((line, i) => {
      // Horizontal Rule
      if (line.trim() === "---" || line.trim() === "___") {
        return <hr key={i} className="border-white/10 my-2.5" />;
      }

      // Markdown Image format: ![alt](url)
      const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        const altText = imageMatch[1] || "Hình ảnh đính kèm";
        const imageUrl = imageMatch[2];
        return (
          <div key={i} className="my-2 rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
            <img 
              src={imageUrl} 
              alt={altText} 
              className="w-full max-h-72 object-cover rounded-xl transition hover:scale-[1.01]"
              loading="lazy"
              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
            />
            {altText && <p className="text-[10px] text-slate-400 p-1.5 text-center font-mono italic">{altText}</p>}
          </div>
        );
      }

      // Headers
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-xs font-bold text-cyan-300 mt-3 mb-1 font-display tracking-wide">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-sm font-bold text-white mt-3.5 mb-1.5 font-display tracking-wide border-b border-white/10 pb-1">
            {line.replace("## ", "")}
          </h2>
        );
      }

      // Format inline elements (bold **, inline code `, italic *)
      const parseInline = (text: string) => {
        // Split by bold ** or ***
        const parts = text.split(/(\*\*\*[\s\S]*?\*\*\*|\*\*[\s\S]*?\*\*|`[\s\S]*?`)/g);
        return parts.map((part, idx) => {
          if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
            return <strong key={idx} className={`${theme.textMuted} font-bold italic`}>{part.slice(3, -3)}</strong>;
          }
          if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return <strong key={idx} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
            return <code key={idx} className="px-1.5 py-0.5 bg-black/50 border border-white/15 rounded text-[10.5px] font-mono text-cyan-300">{part.slice(1, -1)}</code>;
          }
          return part;
        });
      };

      // Bullet Lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const cleanListText = line.replace(/^[\*\-]\s+/, "");
        return (
          <li key={i} className="ml-3 list-disc text-xs text-slate-200 leading-relaxed my-0.5">
            {parseInline(cleanListText)}
          </li>
        );
      }

      // Empty line spacing
      if (!line.trim()) {
        return <div key={i} className="h-1.5" />;
      }

      // Regular Paragraph
      return (
        <p key={i} className="text-xs text-slate-200 leading-relaxed my-1 break-words">
          {parseInline(line)}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 pb-1 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${theme.border} shadow-lg`}>
              <img 
                src={assistantConfig.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"} 
                alt="Assistant Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-display tracking-wide">{assistantConfig.name}</h2>
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${theme.bgMuted} ${theme.text} font-mono border ${theme.borderMuted}`}>
                Gemini 3.5 Multimodal
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles size={10} className={`${theme.text} animate-pulse`} /> 
              Trợ lý trí tuệ nhân tạo • Phân tích văn bản & hình ảnh
            </p>
          </div>
        </div>

        {/* Clear Chat Button */}
        {messages.length > 1 && (
          <button
            onClick={() => setMessages(messages.slice(0, 1))}
            className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition text-xs flex items-center gap-1 border border-transparent hover:border-rose-500/20 cursor-pointer"
            title="Xóa cuộc trò chuyện"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3.5 pr-1">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div 
              key={index} 
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs flex-shrink-0 shadow-md ${
                isUser 
                  ? `${theme.bgMuted} ${theme.borderMuted} ${theme.text}` 
                  : "bg-slate-900 border-white/15 text-slate-300 overflow-hidden"
              }`}>
                {isUser ? (
                  <User size={14} />
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
              <div className={`max-w-[85%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
                <div 
                  className={`p-3.5 rounded-2xl border shadow-xl ${
                    isUser 
                      ? `${theme.bgMuted} ${theme.borderMuted} text-white rounded-tr-xs` 
                      : "bg-slate-900/80 border-white/10 text-slate-100 rounded-tl-xs backdrop-blur-md"
                  }`}
                >
                  {/* User attached image rendering */}
                  {msg.image && (
                    <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 shadow-md max-w-sm">
                      <img 
                        src={msg.image} 
                        alt="User Upload" 
                        className="w-full max-h-60 object-cover rounded-xl"
                      />
                    </div>
                  )}

                  {/* Formatted Content */}
                  {renderFormattedContent(msg.content)}
                </div>
                
                <p className={`text-[9px] text-slate-500 px-1 font-mono ${isUser ? "text-right" : "text-left"}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-white/15 text-slate-400 flex-shrink-0 shadow-md">
              <Loader2 size={14} className="animate-spin text-cyan-400" />
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl rounded-tl-xs backdrop-blur-md max-w-[85%]">
              <div className="flex gap-1.5 items-center justify-center h-4 px-2">
                <span className={`w-2 h-2 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "0ms" }}></span>
                <span className={`w-2 h-2 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "150ms" }}></span>
                <span className={`w-2 h-2 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestion Pills */}
      {messages.length < 5 && !isTyping && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-shrink-0">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap transition cursor-pointer shrink-0"
            >
              ✨ {s}
            </button>
          ))}
        </div>
      )}

      {/* Image Preview Thumbnail prior to sending */}
      {selectedImage && (
        <div className="mb-2 p-2 bg-slate-900/90 rounded-xl border border-white/15 flex items-center justify-between gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-white/20" />
            <div>
              <p className="text-xs font-bold text-white">Ảnh đã đính kèm</p>
              <p className="text-[9px] text-slate-400">Sẵn sàng gửi cho trợ lý AI phân tích</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageSelect} 
        className="hidden" 
      />

      {/* Input area */}
      <div className="pt-2 border-t border-white/10 flex-shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-white/10 flex items-center justify-center ${selectedImage ? "text-cyan-400 border-cyan-500/50 bg-cyan-500/10" : ""}`}
          title="Đính kèm hình ảnh"
        >
          <ImageIcon size={16} />
        </button>

        <input
          type="text"
          placeholder={selectedImage ? "Nhập câu hỏi về hình ảnh này..." : "Hỏi trợ lý ảo hoặc yêu cầu phân tích..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 px-3.5 py-2.5 text-xs glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none"
          id="chat-input-text"
        />
        
        <button
          onClick={() => handleSendMessage()}
          disabled={(!inputValue.trim() && !selectedImage) || isTyping}
          className={`p-2.5 ${theme.bg} disabled:opacity-40 text-slate-950 rounded-xl transition cursor-pointer flex items-center justify-center shadow-lg hover:brightness-110`}
          id="send-chat-btn"
        >
          <Send size={15} />
        </button>
      </div>

      {apiError && (
        <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 self-start font-medium">
          <AlertTriangle size={11} /> {apiError}
        </p>
      )}
    </div>
  );
}
