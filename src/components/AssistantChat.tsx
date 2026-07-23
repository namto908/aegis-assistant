import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Sparkles, AlertTriangle, User, Bot, Loader2, 
  Image as ImageIcon, X, Trash2, Brain, Cpu, Plus, Check, RefreshCw, FileCode, Paperclip, MessageSquarePlus, ChevronDown, ChevronUp
} from "lucide-react";
import { Message, AssistantConfig, Task, ServerStatus, GoogleUser } from "../types";
import { getThemeClasses } from "../lib/theme";

interface AssistantChatProps {
  assistantConfig: AssistantConfig;
  tasks: Task[];
  servers: ServerStatus[];
  addNotification: (title: string, description: string, category: "task" | "server" | "system") => void;
  prefillMessage?: string | null;
  clearPrefillMessage?: () => void;
  user: GoogleUser | null;
}

interface UserMemory {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  updated_at: string;
}

export default function AssistantChat({ 
  assistantConfig, 
  tasks, 
  servers, 
  addNotification,
  prefillMessage,
  clearPrefillMessage,
  user
}: AssistantChatProps) {
  const theme = getThemeClasses(assistantConfig.themeColor || "slate");
  const defaultWelcomeMsg: Message = {
    role: "model",
    content: `Xin chào! Tôi là **${assistantConfig.name}**, trợ lý ảo cá nhân được cấu hình riêng cho bạn.\n\nTôi được tích hợp bộ nhớ học hỏi theo thời gian (**Hermes Memory Engine**). Tôi sẽ tự động ghi nhớ sở thích, môi trường công nghệ và các nguyên tắc của bạn qua từng cuộc đối thoại!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<Message[]>([defaultWelcomeMsg]);
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Custom File attachments states
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Hermes Memory Store Modal state
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [newMemKey, setNewMemKey] = useState("");
  const [newMemVal, setNewMemVal] = useState("");

  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const [activeThinkingStep, setActiveThinkingStep] = useState(0);
  const thinkingSteps = [
    "Đang phân tích tin nhắn và các tệp đính kèm...",
    "Đang nạp đặc điểm và phong cách từ USER.md...",
    "Đang đọc quy tắc và tech stack từ MEMORY.md...",
    "Đang tổng hợp trạng thái các Servers & Taskboard...",
    "Đang gửi ngữ cảnh tới Gemini để lập luận phản hồi..."
  ];

  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycling active thinking indicator during generation
  useEffect(() => {
    let interval: any;
    if (isTyping) {
      setActiveThinkingStep(0);
      interval = setInterval(() => {
        setActiveThinkingStep((prev) => (prev + 1) % thinkingSteps.length);
      }, 1600);
    } else {
      setActiveThinkingStep(0);
    }
    return () => clearInterval(interval);
  }, [isTyping]);

  const apiBase = (assistantConfig.apiBaseUrl && assistantConfig.apiBaseUrl.trim() !== "") ? assistantConfig.apiBaseUrl.replace(/\/$/, "") : "http://192.168.2.200:25530";

  // Load chat history from DB on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user) {
          headers["Authorization"] = `Bearer ${user.idToken}`;
        }
        const res = await fetch(`${apiBase}/api/gemini/history`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data.map((m: any) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              image: m.image,
              file: m.file,
              fileName: m.fileName,
              thinking: m.thinking
            })));
          }
        }
      } catch (err) {
        console.log("Could not load backend chat history", err);
      }
    };
    fetchHistory();
  }, [apiBase, user]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, selectedImage, selectedFile]);

  // Handle message prefilling from other tabs
  useEffect(() => {
    if (prefillMessage) {
      handleSendMessage(prefillMessage);
      if (clearPrefillMessage) {
        clearPrefillMessage();
      }
    }
  }, [prefillMessage]);

  // Fetch Hermes memories from backend
  const fetchMemories = async () => {
    setLoadingMemories(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers["Authorization"] = `Bearer ${user.idToken}`;
      }
      const res = await fetch(`${apiBase}/api/gemini/memories`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (e) {
      console.error("Failed to load memories", e);
    } finally {
      setLoadingMemories(false);
    }
  };

  const handleOpenMemoryModal = () => {
    setShowMemoryModal(true);
    fetchMemories();
  };

  const handleAddMemory = async () => {
    if (!newMemKey.trim() || !newMemVal.trim()) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        headers["Authorization"] = `Bearer ${user.idToken}`;
      }
      const res = await fetch(`${apiBase}/api/gemini/memories`, {
        method: "POST",
        headers,
        body: JSON.stringify({ key: newMemKey.trim(), value: newMemVal.trim(), category: "preference" })
      });
      if (res.ok) {
        setNewMemKey("");
        setNewMemVal("");
        fetchMemories();
      }
    } catch (e) {
      console.error("Failed to add memory", e);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers["Authorization"] = `Bearer ${user.idToken}`;
      }
      const res = await fetch(`${apiBase}/api/gemini/memories/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete memory", e);
    }
  };

  const handleClearHistory = async () => {
    setMessages([defaultWelcomeMsg]);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers["Authorization"] = `Bearer ${user.idToken}`;
      }
      await fetch(`${apiBase}/api/gemini/history`, { method: "DELETE", headers });
    } catch (e) {
      console.error("Failed to clear history on backend", e);
    }
  };

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

  // File Upload Selection Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setApiError("Dung lượng tập tin vượt quá 8MB. Vui lòng chọn tập tin nhỏ hơn.");
      return;
    }

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile(reader.result as string);
      setApiError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputValue;
    if (!text.trim() && !selectedImage && !selectedFile) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: selectedImage || undefined,
      file: selectedFile || undefined,
      fileName: selectedFileName || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSelectedImage(null);
    setSelectedFile(null);
    setSelectedFileName(null);
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
- Nếu chủ nhân gửi hình ảnh hoặc tập tin (văn bản/code/log), hãy phân tích kỹ các chi tiết nội dung được cung cấp và đưa ra nhận xét chuyên sâu phù hợp.
- TUYỆT ĐỐI KHÔNG tự tiện chèn ảnh Unsplash vào các câu trả lời thông thường. Chỉ chèn ảnh minh họa bằng cú pháp Markdown chuẩn: ![Mô tả ảnh](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800) khi chủ nhân yêu cầu rõ ràng hoặc khi nội dung thực sự cần một hình ảnh kỹ thuật để giải thích trực quan.
- Trả lời rõ ràng, sinh động, trình bày chuẩn Markdown (sử dụng tiêu đề ##, danh sách -, in đậm **text**, code block nếu cần). KHÔNG để lại các ký tự thô như *** trùng lặp không có ý nghĩa.
- Trả lời bằng TIẾNG VIỆT hoàn toàn.
`;

    try {
      const chatHistoryForGemini = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        image: m.image,
        file: m.file,
        fileName: m.fileName,
      }));

      const controller = new AbortController();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        headers["Authorization"] = `Bearer ${user.idToken}`;
      }
      const response = await fetch(`${apiBase}/api/gemini/chat`, {
        method: "POST",
        headers,
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
        thinking: data.thinking || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn:", error);
      setApiError("Trợ lý gặp sự cố kết nối với mô hình AI.");
      
      const fallbackMsg: Message = {
        role: "model",
        content: `Tôi đã nhận được yêu cầu "${text}".\n\n* **Tiến độ:** Bạn có ${tasks.filter(t => !t.completed).length} công việc chưa hoàn thành.\n* **Server:** Ghi nhận ${servers.filter(s => s.status === 'up').length}/${servers.length} máy chủ đang hoạt động.\n\n*Lưu ý: Để bật AI hoàn chỉnh kèm bộ nhớ học hỏi Hermes Memory, hãy đảm bảo server backend đang khởi chạy.*`,
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

      // Format inline elements
      const parseInline = (text: string) => {
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
                Hermes Memory Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles size={10} className={`${theme.text} animate-pulse`} /> 
              Trợ lý trí tuệ • Tự động học hỏi sở thích theo thời gian
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenMemoryModal}
            className={`p-1.5 ${theme.bgMuted} hover:bg-white/10 ${theme.text} hover:text-white rounded-lg transition text-xs flex items-center gap-1 border ${theme.borderMuted} cursor-pointer shadow`}
            title="Xem trí nhớ về chủ nhân (Hermes Memory)"
          >
            <Brain size={14} />
            <span className="hidden sm:inline text-[10px] font-bold">Trí nhớ</span>
          </button>

          <button
            onClick={handleClearHistory}
            className={`p-1.5 ${theme.bgMuted} hover:bg-rose-500/20 hover:text-rose-200 text-slate-300 rounded-lg transition text-xs flex items-center gap-1 border border-white/10 cursor-pointer shadow`}
            title="Khởi tạo phiên trò chuyện mới"
          >
            <MessageSquarePlus size={14} />
            <span className="hidden sm:inline text-[10px] font-bold">Phiên mới</span>
          </button>
        </div>
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

                  {/* User attached file rendering */}
                  {msg.file && (
                    <div className="mb-2.5 p-2 rounded-xl border border-white/10 bg-slate-950/80 flex items-center gap-2 max-w-sm">
                      <FileCode size={18} className="text-cyan-400 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-bold text-white truncate">{msg.fileName || "Tập tin đính kèm"}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-mono">
                          {msg.file.split(";")[0]?.replace("data:", "") || "Document"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Thinking Log */}
                  {msg.thinking && (
                    <div className="mb-2.5 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      <button 
                        onClick={() => setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }))}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <Cpu size={12} className="text-cyan-400 animate-pulse animate-duration-1000" />
                          <span>Đã xem xét ngữ cảnh hệ thống</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                          <span>{expandedThinking[index] ? "Thu gọn" : "Chi tiết"}</span>
                          {expandedThinking[index] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </div>
                      </button>
                      {expandedThinking[index] && (
                        <div className="px-3 pb-2.5 pt-1 text-[9.5px] text-slate-400 border-t border-white/5 font-mono whitespace-pre-wrap leading-relaxed">
                          {msg.thinking}
                        </div>
                      )}
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-white/15 text-slate-300 flex-shrink-0 shadow-md">
              <img 
                src={assistantConfig.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"} 
                alt="Assistant" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl rounded-tl-xs backdrop-blur-md max-w-[85%] space-y-2 shadow-2xl">
              <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-medium">
                <Cpu size={12} className="animate-spin text-cyan-400 shrink-0" />
                <span className="animate-pulse">{thinkingSteps[activeThinkingStep]}</span>
              </div>
              <div className="flex gap-1 items-center h-2 px-1">
                <span className={`w-1.5 h-1.5 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "0ms" }}></span>
                <span className={`w-1.5 h-1.5 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "150ms" }}></span>
                <span className={`w-1.5 h-1.5 ${theme.bg} rounded-full animate-bounce`} style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

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

      {/* File Preview Thumbnail prior to sending */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-slate-900/90 rounded-xl border border-white/15 flex items-center justify-between gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <FileCode size={20} className="text-cyan-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{selectedFileName}</p>
              <p className="text-[9px] text-slate-400">Tập tin sẵn sàng đính kèm</p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedFile(null); setSelectedFileName(null); }}
            className="p-1 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        ref={imageInputRef} 
        onChange={handleImageSelect} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept=".txt,.md,.json,.js,.ts,.tsx,.py,.html,.css,.log" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />

      {/* Input area */}
      <div className="pt-2 border-t border-white/10 flex-shrink-0 flex items-center gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={`p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-white/10 flex items-center justify-center ${selectedImage ? "text-cyan-400 border-cyan-500/50 bg-cyan-500/10" : ""}`}
            title="Đính kèm hình ảnh"
          >
            <ImageIcon size={15} />
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-white/10 flex items-center justify-center ${selectedFile ? "text-cyan-400 border-cyan-500/50 bg-cyan-500/10" : ""}`}
            title="Đính kèm file (.txt, .json, .py, .log...)"
          >
            <Paperclip size={15} />
          </button>
        </div>

        <input
          type="text"
          placeholder={selectedImage || selectedFile ? "Nhập tin nhắn..." : "Hỏi trợ lý ảo hoặc chia sẻ sở thích cá nhân..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 px-3.5 py-2.5 text-xs glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none"
          id="chat-input-text"
        />
        
        <button
          onClick={() => handleSendMessage()}
          disabled={(!inputValue.trim() && !selectedImage && !selectedFile) || isTyping}
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

      {/* Hermes Memory Inspector Modal */}
      <AnimatePresence>
        {showMemoryModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 ${theme.bgMuted} ${theme.text} rounded-lg border ${theme.borderMuted}`}>
                    <Brain size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">Bộ nhớ Tri thức Cá nhân (Hermes Memory)</h3>
                    <p className="text-[10px] text-slate-400">Các đặc điểm & thông tin Aegis tự động học được từ bạn</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMemoryModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Memory Form / Manual Add */}
              <div className="p-3 bg-slate-950/30 border-b border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thêm ghi nhớ thủ công:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Tên ghi nhớ (VD: Môi trường OS)"
                    value={newMemKey}
                    onChange={(e) => setNewMemKey(e.target.value)}
                    className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Nội dung (VD: Ubuntu 24.04, Python 3.12)"
                    value={newMemVal}
                    onChange={(e) => setNewMemVal(e.target.value)}
                    className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleAddMemory}
                  disabled={!newMemKey.trim() || !newMemVal.trim()}
                  className={`w-full py-1.5 ${theme.bgMuted} hover:bg-white/10 ${theme.text} disabled:opacity-40 rounded-lg text-xs font-bold border ${theme.borderMuted} flex items-center justify-center gap-1 cursor-pointer transition`}
                >
                  <Plus size={13} /> Ghi nhớ thông tin này
                </button>
              </div>

              {/* Memory List */}
              <div className="p-4 flex-1 overflow-y-auto space-y-2.5 no-scrollbar">
                {loadingMemories ? (
                  <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <span>Đang nạp bộ nhớ tri thức...</span>
                  </div>
                ) : memories.length === 0 ? (
                  <div className="text-center py-8 space-y-1">
                    <Brain size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs text-slate-300 font-bold">Chưa có ký ức nào được ghi nhận</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      Hãy trò chuyện và chia sẻ với Aegis. Trợ lý sẽ tự động trích xuất sở thích và thông tin cá nhân của bạn vào đây!
                    </p>
                  </div>
                ) : (
                  memories.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-3 bg-slate-950/60 rounded-xl border border-white/10 flex items-start justify-between gap-3 hover:border-white/20 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20 uppercase font-bold">
                            {m.category}
                          </span>
                          <span className="text-xs font-bold text-white">{m.key}</span>
                        </div>
                        <p className="text-xs text-slate-300">{m.value}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0 cursor-pointer"
                        title="Xóa ghi nhớ"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Tổng số ghi nhớ: {memories.length}</span>
                <button
                  onClick={fetchMemories}
                  className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw size={11} /> Làm mới
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
